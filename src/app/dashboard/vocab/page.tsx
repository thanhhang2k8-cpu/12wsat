import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AddWordForm } from "./AddWordForm";
import { CreateDeckForm } from "./CreateDeckForm";

export const dynamic = "force-dynamic";

export default async function VocabPage() {
  const { user } = await requireUser();

  const [decks, dueCount] = await Promise.all([
    prisma.vocabDeck.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { words: true } } },
    }),
    prisma.vocabReview.count({ where: { word: { userId: user.id }, dueAt: { lte: new Date() } } }),
  ]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">Vocab Notebook</div>
        <div className="font-display mb-8 text-[26px] font-medium">Sổ từ vựng</div>

        <div className="mb-10 flex items-center justify-between border border-ink px-6 py-5">
          <div>
            <div className="font-display text-[22px] font-medium">{dueCount} từ đến hạn ôn hôm nay</div>
            <div className="text-[13px] text-muted">Lịch ôn theo SM-2 — càng nhớ chắc, càng lâu mới quay lại.</div>
          </div>
          {dueCount > 0 ? (
            <Link href="/dashboard/vocab/review" className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper">
              Bắt đầu ôn tập
            </Link>
          ) : (
            <span className="text-[13px] text-muted">Không có từ nào đến hạn</span>
          )}
        </div>

        <div className="mb-10">
          <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Bộ từ của bạn</div>
          <div className="flex flex-col gap-2">
            {decks.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/vocab/${d.id}`}
                className="flex items-center justify-between border-b border-rule py-2.5 text-[14px]"
              >
                <span>{d.name}</span>
                <span className="font-mono text-[12px] text-muted">{d._count.words} từ</span>
              </Link>
            ))}
            {decks.length === 0 && <p className="text-[13px] text-muted">Chưa có bộ từ nào — thêm từ đầu tiên bên dưới sẽ tự tạo.</p>}
          </div>
          <div className="mt-4">
            <CreateDeckForm />
          </div>
        </div>

        <div>
          <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide">+ Thêm từ mới</div>
          <AddWordForm decks={decks.map((d) => ({ id: d.id, name: d.name }))} />
        </div>
      </div>
    </div>
  );
}
