"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { isAnswerCorrect } from "@/lib/testPlayer/grading";

export type PracticeFilters = {
  section?: "READING_WRITING" | "MATH";
  domain?: string;
  skill?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  onlyWrong?: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Question ids the user's most recent attempt (real test or practice) at each question was wrong. */
async function wrongQuestionIds(userId: string): Promise<Set<string>> {
  const [attemptAnswers, practiceAttempts] = await Promise.all([
    prisma.attemptAnswer.findMany({
      where: { attempt: { userId }, isCorrect: { not: null } },
      orderBy: { updatedAt: "asc" },
      select: { questionId: true, isCorrect: true },
    }),
    prisma.practiceAttempt.findMany({
      where: { userId },
      orderBy: { answeredAt: "asc" },
      select: { questionId: true, isCorrect: true },
    }),
  ]);

  const latest = new Map<string, boolean>();
  for (const a of attemptAnswers) latest.set(a.questionId, a.isCorrect!);
  for (const a of practiceAttempts) latest.set(a.questionId, a.isCorrect);

  const wrong = new Set<string>();
  for (const [questionId, correct] of latest) if (!correct) wrong.add(questionId);
  return wrong;
}

/** Matching published questions for the Question Bank / practice filter — capped for a reasonable page. */
export async function findMatchingQuestions(filters: PracticeFilters, limit = 60) {
  const { user } = await requireUser();

  let questions = await prisma.question.findMany({
    where: {
      module: {
        test: { status: "PUBLISHED" },
        ...(filters.section ? { section: filters.section } : {}),
      },
      ...(filters.domain ? { domain: filters.domain } : {}),
      ...(filters.skill ? { skill: filters.skill } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    },
    select: { id: true, number: true, domain: true, skill: true, difficulty: true, module: { select: { section: true } } },
    orderBy: { number: "asc" },
  });

  if (filters.onlyWrong) {
    const wrong = await wrongQuestionIds(user.id);
    questions = questions.filter((q) => wrong.has(q.id));
  }

  return { total: questions.length, questions: questions.slice(0, limit) };
}

export type WrongQuestion = {
  id: string;
  number: number;
  domain: string;
  section: string;
  explanationMd: string | null;
  lastWrongAt: Date;
};

/** Sổ lỗi: every question whose most recent attempt (real test or practice) by this user was wrong. */
export async function wrongQuestionsDetailed(): Promise<WrongQuestion[]> {
  const { user } = await requireUser();

  const [attemptAnswers, practiceAttempts] = await Promise.all([
    prisma.attemptAnswer.findMany({
      where: { attempt: { userId: user.id }, isCorrect: { not: null } },
      select: { questionId: true, isCorrect: true, updatedAt: true },
    }),
    prisma.practiceAttempt.findMany({
      where: { userId: user.id },
      select: { questionId: true, isCorrect: true, answeredAt: true },
    }),
  ]);

  const latest = new Map<string, { correct: boolean; at: Date }>();
  for (const a of attemptAnswers) {
    const prev = latest.get(a.questionId);
    if (!prev || a.updatedAt > prev.at) latest.set(a.questionId, { correct: a.isCorrect!, at: a.updatedAt });
  }
  for (const a of practiceAttempts) {
    const prev = latest.get(a.questionId);
    if (!prev || a.answeredAt > prev.at) latest.set(a.questionId, { correct: a.isCorrect, at: a.answeredAt });
  }

  const wrongIds = Array.from(latest.entries())
    .filter(([, v]) => !v.correct)
    .map(([id]) => id);
  if (wrongIds.length === 0) return [];

  const questions = await prisma.question.findMany({
    where: { id: { in: wrongIds } },
    select: { id: true, number: true, domain: true, explanationMd: true, module: { select: { section: true } } },
  });

  return questions
    .map((q) => ({
      id: q.id,
      number: q.number,
      domain: q.domain ?? "Chưa phân loại",
      section: q.module.section,
      explanationMd: q.explanationMd,
      lastWrongAt: latest.get(q.id)!.at,
    }))
    .sort((a, b) => b.lastWrongAt.getTime() - a.lastWrongAt.getTime());
}

export async function distinctDomainsAndSkills() {
  const rows = await prisma.question.findMany({
    where: { module: { test: { status: "PUBLISHED" } }, domain: { not: null } },
    select: { domain: true, skill: true },
    distinct: ["domain", "skill"],
  });
  const domains = Array.from(new Set(rows.map((r) => r.domain).filter((d): d is string => !!d))).sort();
  const skills = Array.from(new Set(rows.map((r) => r.skill).filter((s): s is string => !!s))).sort();
  return { domains, skills };
}

export async function startPracticeAction(questionIds: string[]) {
  const { user } = await requireUser();
  if (questionIds.length === 0) throw new Error("Không có câu nào phù hợp để luyện.");

  const set = await prisma.practiceSet.create({
    data: { userId: user.id, questionIds: shuffle(questionIds) },
  });
  redirect(`/practice/${set.id}`);
}

export async function submitPracticeAnswerAction(
  practiceSetId: string,
  questionId: string,
  input: { selectedLabel: string | null; gridInValue: string | null },
): Promise<{ isCorrect: boolean; explanationMd: string | null; correctAnswer: string | string[] }> {
  const { user } = await requireUser();
  const set = await prisma.practiceSet.findUniqueOrThrow({ where: { id: practiceSetId } });
  if (set.userId !== user.id) throw new Error("Không có quyền.");

  const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
  const correct = isAnswerCorrect(question.type, question.correctAnswer, input.selectedLabel, input.gridInValue);

  await prisma.practiceAttempt.create({
    data: {
      userId: user.id,
      questionId,
      selectedLabel: input.selectedLabel,
      gridInValue: input.gridInValue,
      isCorrect: correct,
    },
  });

  return { isCorrect: correct, explanationMd: question.explanationMd, correctAnswer: question.correctAnswer as string | string[] };
}

export async function advancePracticeAction(practiceSetId: string) {
  const { user } = await requireUser();
  const set = await prisma.practiceSet.findUniqueOrThrow({ where: { id: practiceSetId } });
  if (set.userId !== user.id) throw new Error("Không có quyền.");

  const ids = set.questionIds as string[];
  const nextIndex = set.currentIndex + 1;
  await prisma.practiceSet.update({
    where: { id: practiceSetId },
    data: {
      currentIndex: nextIndex,
      completedAt: nextIndex >= ids.length ? new Date() : null,
    },
  });
}

export async function toggleBookmarkAction(questionId: string): Promise<{ bookmarked: boolean }> {
  const { user } = await requireUser();
  const existing = await prisma.bookmark.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.bookmark.create({ data: { userId: user.id, questionId } });
  return { bookmarked: true };
}
