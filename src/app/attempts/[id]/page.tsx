import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getObjectUrl } from "@/lib/storage";
import { submitModuleAction } from "@/lib/actions/attempt";
import { nowMs } from "@/lib/now";
import { TestPlayerClient } from "./TestPlayerClient";

export const dynamic = "force-dynamic";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  const now = nowMs();

  const attempt = await prisma.attempt.findUnique({ where: { id } });
  if (!attempt) notFound();
  if (attempt.userId !== user.id) notFound();
  if (attempt.status === "SUBMITTED") redirect(`/attempts/${id}/results`);
  if (attempt.status === "ABANDONED") redirect("/dashboard/real-test");

  const current = await prisma.attemptModule.findFirst({
    where: { attemptId: id, submittedAt: null },
    orderBy: { orderInAttempt: "desc" },
  });
  if (!current) redirect("/dashboard/real-test");

  if (current.deadline && current.deadline.getTime() <= now) {
    await submitModuleAction(current.id, { auto: true });
    redirect(`/attempts/${id}`);
  }

  const moduleWithQuestions = await prisma.module.findUniqueOrThrow({
    where: { id: current.moduleId },
    include: {
      test: true,
      questions: {
        orderBy: { orderIndex: "asc" },
        include: { choices: { orderBy: { orderIndex: "asc" } }, images: true },
      },
    },
  });

  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId: id, questionId: { in: moduleWithQuestions.questions.map((q) => q.id) } },
  });
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));

  const questions = await Promise.all(
    moduleWithQuestions.questions.map(async (q) => ({
      id: q.id,
      number: q.number,
      passageMd: q.passageMd,
      stemMd: q.stemMd,
      type: q.type,
      choices: q.choices.map((c) => ({ label: c.label, textMd: c.textMd })),
      images: await Promise.all(q.images.map(async (img) => ({ id: img.id, note: img.note, url: await getObjectUrl(img.storageKey) }))),
      answer: {
        selectedLabel: answerByQuestionId.get(q.id)?.selectedLabel ?? null,
        gridInValue: answerByQuestionId.get(q.id)?.gridInValue ?? null,
        flagged: answerByQuestionId.get(q.id)?.flagged ?? false,
        strikeouts: (answerByQuestionId.get(q.id)?.strikeouts as string[] | undefined) ?? [],
      },
    })),
  );

  const remainingSec = current.deadline ? Math.max(0, Math.ceil((current.deadline.getTime() - now) / 1000)) : null;

  return (
    <TestPlayerClient
      key={current.id}
      attemptId={id}
      attemptModuleId={current.id}
      section={moduleWithQuestions.section}
      moduleNumber={moduleWithQuestions.moduleNumber}
      untimed={moduleWithQuestions.test.timedMode === "UNTIMED"}
      initialRemainingSec={remainingSec}
      questions={questions}
    />
  );
}
