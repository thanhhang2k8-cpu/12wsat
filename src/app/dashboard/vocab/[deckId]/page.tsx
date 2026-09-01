import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { DeleteWordButton } from "./DeleteWordButton";

export const dynamic = "force-dynamic";

export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const { user } = await requireUser();

  const deck = await prisma.vocabDeck.findUnique({
    where: { id: deckId },
    include: { words: { orderBy: { createdAt: "desc" }, include: { review: true } } },
  });
  if (!deck) notFound();
  if (deck.ownerUserId !== user.id) notFound();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <Link href="/dashboard/vocab" className="mb-1 block text-[12px] uppercase tracking-wide text-muted">
          ← Vocab Notebook
        </Link>
        <div className="font-display mb-8 text-[26px] font-medium">{deck.name}</div>

        {deck.words.length === 0 ? (
          <p className="border border-rule px-4 py-8 text-center text-[13px] text-muted">Bộ từ này chưa có từ nào.</p>
        ) : (
          <div className="border-t border-rule">
            {deck.words.map((w) => (
              <div key={w.id} className="border-b border-rule py-3.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[15px] font-semibold">{w.term}</span>
                    {w.partOfSpeech && <span className="font-mono text-[12px] text-muted">{w.partOfSpeech}</span>}
                    {w.ipa && <span className="font-mono text-[12px] text-muted">/{w.ipa}/</span>}
                  </div>
                  <DeleteWordButton wordId={w.id} />
                </div>
                <div className="mt-1 text-[13.5px]">{w.definition}</div>
                {w.synonyms.length > 0 && (
                  <div className="mt-1 text-[12.5px] text-muted">Đồng nghĩa: {w.synonyms.join(", ")}</div>
                )}
                {w.exampleSentence && <div className="mt-1 text-[13px] italic text-muted">“{w.exampleSentence}”</div>}
                {w.review && (
                  <div className="mt-1.5 font-mono text-[11px] text-muted">
                    Đến hạn ôn: {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(w.review.dueAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
