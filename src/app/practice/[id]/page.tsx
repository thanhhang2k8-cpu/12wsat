import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getObjectUrl } from "@/lib/storage";
import { PracticeSessionClient } from "./PracticeSessionClient";

export const dynamic = "force-dynamic";

export default async function PracticeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();

  const set = await prisma.practiceSet.findUnique({ where: { id } });
  if (!set) notFound();
  if (set.userId !== user.id) notFound();

  const questionIds = set.questionIds as string[];

  if (set.currentIndex >= questionIds.length) {
    const attempts = await prisma.practiceAttempt.findMany({
      where: { userId: user.id, questionId: { in: questionIds } },
      orderBy: { answeredAt: "desc" },
    });
    const seen = new Set<string>();
    let correct = 0;
    for (const a of attempts) {
      if (seen.has(a.questionId)) continue;
      seen.add(a.questionId);
      if (a.isCorrect) correct += 1;
    }

    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">Hoàn thành</div>
          <div className="font-display mb-6 text-[26px] font-medium">Đã luyện xong {questionIds.length} câu</div>
          <div className="font-display mb-10 text-[56px] font-medium">
            {correct}/{questionIds.length}
          </div>
          <div className="flex justify-center gap-6">
            <Link href="/dashboard/practice" className="border border-pen px-5 py-2.5 text-[13px] text-pen">
              Luyện tập tiếp
            </Link>
            <Link href="/dashboard/wrong-answers" className="bg-pen px-5 py-2.5 text-[13px] font-semibold text-paper">
              Xem sổ lỗi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const questionId = questionIds[set.currentIndex];
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      choices: { orderBy: { orderIndex: "asc" } },
      images: true,
      module: { select: { section: true } },
    },
  });

  const bookmark = await prisma.bookmark.findUnique({
    where: { userId_questionId: { userId: user.id, questionId } },
  });

  return (
    <PracticeSessionClient
      key={question.id}
      practiceSetId={id}
      index={set.currentIndex}
      totalCount={questionIds.length}
      initiallyBookmarked={!!bookmark}
      question={{
        id: question.id,
        number: question.number,
        passageMd: question.passageMd,
        stemMd: question.stemMd,
        type: question.type,
        section: question.module.section,
        choices: question.choices.map((c) => ({ label: c.label, textMd: c.textMd })),
        images: await Promise.all(
          question.images.map(async (img) => ({ id: img.id, note: img.note, url: await getObjectUrl(img.storageKey) })),
        ),
      }}
    />
  );
}
