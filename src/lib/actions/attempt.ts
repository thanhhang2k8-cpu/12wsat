"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { pickNextModule } from "@/lib/testPlayer/adaptive";
import { isAnswerCorrect, scaleScore } from "@/lib/testPlayer/grading";

async function findEligibleAssignment(testId: string, userId: string, cohortId: string | null) {
  const now = new Date();
  const assignments = await prisma.assignment.findMany({
    where: {
      testId,
      OR: [{ userId }, ...(cohortId ? [{ cohortId }] : [])],
    },
  });

  return assignments.find((a) => {
    if (a.openAt && a.openAt > now) return false;
    if (a.closeAt && a.closeAt < now) return false;
    return true;
  });
}

export async function startAttemptAction(testId: string) {
  const { user } = await requireUser();

  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { modules: true },
  });
  if (!test || test.status !== "PUBLISHED") {
    throw new Error("Đề không tồn tại hoặc chưa được publish.");
  }

  const assignment = await findEligibleAssignment(testId, user.id, user.cohortId);
  if (!assignment) {
    throw new Error("Bạn chưa được giao đề này, hoặc đề đã đóng.");
  }

  const priorAttempts = await prisma.attempt.count({ where: { testId, userId: user.id } });
  if (priorAttempts >= assignment.maxAttempts) {
    throw new Error(`Bạn đã làm đề này ${priorAttempts} lần — đạt giới hạn ${assignment.maxAttempts} lượt.`);
  }

  const firstModule = pickNextModule(test.modules, [], test.adaptiveThresholdPct);
  if (!firstModule) {
    throw new Error("Đề chưa có module nào để làm.");
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      testId,
      currentModuleId: firstModule.id,
      modules: {
        create: {
          moduleId: firstModule.id,
          orderInAttempt: 0,
          deadline: test.timedMode === "TIMED" ? new Date(Date.now() + firstModule.timeLimitSec * 1000) : null,
        },
      },
    },
  });

  redirect(`/attempts/${attempt.id}`);
}

export async function resumeOrStartAttemptAction(testId: string) {
  const { user } = await requireUser();
  const inProgress = await prisma.attempt.findFirst({
    where: { testId, userId: user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (inProgress) {
    redirect(`/attempts/${inProgress.id}`);
  }
  await startAttemptAction(testId);
}

export type SaveAnswerInput = {
  attemptId: string;
  questionId: string;
  selectedLabel?: string | null;
  gridInValue?: string | null;
  flagged?: boolean;
  strikeouts?: string[];
};

export async function saveAnswerAction(input: SaveAnswerInput) {
  const { user } = await requireUser();
  const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: input.attemptId } });
  if (attempt.userId !== user.id) throw new Error("Không có quyền.");
  if (attempt.status !== "IN_PROGRESS") return;

  const data: Record<string, unknown> = { answeredAt: new Date() };
  if (input.selectedLabel !== undefined) data.selectedLabel = input.selectedLabel;
  if (input.gridInValue !== undefined) data.gridInValue = input.gridInValue;
  if (input.flagged !== undefined) data.flagged = input.flagged;
  if (input.strikeouts !== undefined) data.strikeouts = input.strikeouts;

  await prisma.attemptAnswer.upsert({
    where: { attemptId_questionId: { attemptId: input.attemptId, questionId: input.questionId } },
    update: data,
    create: {
      attemptId: input.attemptId,
      questionId: input.questionId,
      selectedLabel: input.selectedLabel ?? null,
      gridInValue: input.gridInValue ?? null,
      flagged: input.flagged ?? false,
      strikeouts: input.strikeouts ?? [],
      answeredAt: new Date(),
    },
  });

  await prisma.attemptModule.updateMany({
    where: { attemptId: input.attemptId, submittedAt: null },
    data: { lastAutosaveAt: new Date() },
  });
}

/** Called by the client's periodic heartbeat; also the server-side enforcement point for a timed-out module. */
export async function heartbeatAction(attemptId: string): Promise<{ remainingSec: number | null; autoSubmitted: boolean }> {
  const { user } = await requireUser();
  const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.userId !== user.id) throw new Error("Không có quyền.");
  if (attempt.status !== "IN_PROGRESS") return { remainingSec: 0, autoSubmitted: false };

  const current = await prisma.attemptModule.findFirst({
    where: { attemptId, submittedAt: null },
    orderBy: { orderInAttempt: "desc" },
  });
  if (!current) return { remainingSec: null, autoSubmitted: false };
  if (!current.deadline) return { remainingSec: null, autoSubmitted: false };

  const remainingMs = current.deadline.getTime() - Date.now();
  if (remainingMs <= 0) {
    await submitModuleAction(current.id, { auto: true });
    return { remainingSec: 0, autoSubmitted: true };
  }
  return { remainingSec: Math.ceil(remainingMs / 1000), autoSubmitted: false };
}

export async function submitModuleAction(attemptModuleId: string, opts: { auto?: boolean } = {}) {
  const { user } = await requireUser();

  const attemptModule = await prisma.attemptModule.findUniqueOrThrow({
    where: { id: attemptModuleId },
    include: {
      module: { include: { questions: true, test: { include: { modules: true } } } },
      attempt: true,
    },
  });
  if (attemptModule.attempt.userId !== user.id) throw new Error("Không có quyền.");
  if (attemptModule.submittedAt) {
    redirect(`/attempts/${attemptModule.attemptId}`);
  }
  if (attemptModule.attempt.status !== "IN_PROGRESS") {
    redirect(`/attempts/${attemptModule.attemptId}`);
  }

  const questions = attemptModule.module.questions;
  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId: attemptModule.attemptId, questionId: { in: questions.map((q) => q.id) } },
  });
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  for (const q of questions) {
    const existing = answerByQuestion.get(q.id);
    const correct = isAnswerCorrect(q.type, q.correctAnswer, existing?.selectedLabel ?? null, existing?.gridInValue ?? null);
    await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attemptModule.attemptId, questionId: q.id } },
      update: { isCorrect: correct },
      create: { attemptId: attemptModule.attemptId, questionId: q.id, isCorrect: correct },
    });
  }

  await prisma.attemptModule.update({
    where: { id: attemptModule.id },
    data: { submittedAt: new Date() },
  });

  // Build the "completed so far" picture for adaptive branching.
  const priorModules = await prisma.attemptModule.findMany({
    where: { attemptId: attemptModule.attemptId, submittedAt: { not: null } },
    include: { module: { include: { questions: true } } },
  });
  const allAnswers = await prisma.attemptAnswer.findMany({ where: { attemptId: attemptModule.attemptId } });
  const answersByQuestionId = new Map(allAnswers.map((a) => [a.questionId, a]));

  const completed = priorModules.map((am) => ({
    module: am.module,
    totalCount: am.module.questions.length,
    correctCount: am.module.questions.filter((q) => answersByQuestionId.get(q.id)?.isCorrect).length,
  }));

  const test = attemptModule.module.test;
  const next = pickNextModule(test.modules, completed, test.adaptiveThresholdPct);

  if (next) {
    await prisma.attemptModule.create({
      data: {
        attemptId: attemptModule.attemptId,
        moduleId: next.id,
        orderInAttempt: priorModules.length,
        deadline: test.timedMode === "TIMED" ? new Date(Date.now() + next.timeLimitSec * 1000) : null,
      },
    });
    await prisma.attempt.update({ where: { id: attemptModule.attemptId }, data: { currentModuleId: next.id } });
  } else {
    await finalizeAttempt(attemptModule.attemptId);
  }

  revalidatePath(`/attempts/${attemptModule.attemptId}`);
  if (!opts.auto) {
    redirect(`/attempts/${attemptModule.attemptId}`);
  }
}

async function finalizeAttempt(attemptId: string) {
  const attempt = await prisma.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      test: { include: { scoreScales: true } },
      modules: { include: { module: { include: { questions: true } } } },
    },
  });

  const answers = await prisma.attemptAnswer.findMany({ where: { attemptId } });
  const answersByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

  const rawBySection: Record<string, number> = {};
  for (const am of attempt.modules) {
    const section = am.module.section;
    const correct = am.module.questions.filter((q) => answersByQuestionId.get(q.id)?.isCorrect).length;
    rawBySection[section] = (rawBySection[section] ?? 0) + correct;
  }

  const scaledBySection: Record<string, number> = {};
  for (const [section, raw] of Object.entries(rawBySection)) {
    const scales = attempt.test.scoreScales.filter((s) => s.section === section);
    scaledBySection[section] = scaleScore(scales, raw);
  }

  const scaledTotal = Object.values(scaledBySection).reduce((sum, s) => sum + s, 0);

  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      rawScoreBySection: rawBySection,
      scaledScoreBySection: scaledBySection,
      scaledScoreTotal: scaledTotal,
    },
  });
}

export async function logTabSwitchAction(attemptId: string, durationSec: number | null) {
  const { user } = await requireUser();
  const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.userId !== user.id) return;
  await prisma.tabSwitchLog.create({ data: { attemptId, durationSec } });
}
