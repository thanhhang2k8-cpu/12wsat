"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { gradeWordAction } from "@/lib/actions/vocab";
import type { ReviewGrade } from "@/lib/vocab/srs";

type Word = {
  id: string;
  term: string;
  definition: string;
  partOfSpeech: string | null;
  ipa: string | null;
  synonyms: string[];
  exampleSentence: string | null;
};

const gradeButtons: { grade: ReviewGrade; label: string; color: string }[] = [
  { grade: "AGAIN", label: "Lại (chưa nhớ)", color: "var(--color-red-ink)" },
  { grade: "HARD", label: "Khó", color: "var(--color-amber)" },
  { grade: "GOOD", label: "Tốt", color: "var(--color-pen)" },
  { grade: "EASY", label: "Dễ", color: "var(--color-chalk-green)" },
];

export function VocabReviewClient({ words }: { words: Word[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
          <p className="mb-8 text-[15px]">Không có từ nào đến hạn ôn.</p>
          <Link href="/dashboard/vocab" className="border border-pen px-5 py-2.5 text-[13px] text-pen">
            Quay lại Vocab Notebook
          </Link>
        </div>
      </div>
    );
  }

  if (index >= words.length) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-[600px] px-6 py-16 text-center">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">Hoàn thành</div>
          <div className="font-display mb-10 text-[26px] font-medium">Đã ôn xong {words.length} từ hôm nay</div>
          <Link href="/dashboard/vocab" className="bg-pen px-5 py-2.5 text-[13px] font-semibold text-paper">
            Quay lại Vocab Notebook
          </Link>
        </div>
      </div>
    );
  }

  const w = words[index];

  function grade(g: ReviewGrade) {
    startTransition(async () => {
      await gradeWordAction(w.id, g);
      setRevealed(false);
      setIndex((i) => i + 1);
    });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex h-14 items-center justify-between border-b border-rule px-6">
        <span className="text-[13px] font-semibold">Ôn tập từ vựng</span>
        <span className="font-mono text-[12px] text-muted">
          {index + 1} / {words.length}
        </span>
      </div>

      <div className="mx-auto flex max-w-[600px] flex-col items-center px-6 py-20 text-center">
        <div className="mb-3 flex items-baseline justify-center gap-2.5">
          <span className="font-display text-[36px] font-medium">{w.term}</span>
          {w.partOfSpeech && <span className="font-mono text-[14px] text-muted">{w.partOfSpeech}</span>}
        </div>
        {w.ipa && <div className="mb-8 font-mono text-[14px] text-muted">/{w.ipa}/</div>}

        {!revealed ? (
          <button type="button" onClick={() => setRevealed(true)} className="border border-pen px-5 py-2.5 text-[13px] text-pen">
            Xem đáp án
          </button>
        ) : (
          <div className="w-full">
            <div className="mb-4 border-t border-rule pt-5 text-[16px]">{w.definition}</div>
            {w.synonyms.length > 0 && <div className="mb-2 text-[13px] text-muted">Đồng nghĩa: {w.synonyms.join(", ")}</div>}
            {w.exampleSentence && <div className="mb-8 text-[14px] italic text-muted">“{w.exampleSentence}”</div>}

            <div className="mb-2 text-[11px] uppercase tracking-wide text-muted">Bạn nhớ từ này tới mức nào?</div>
            <div className="grid grid-cols-4 gap-2.5">
              {gradeButtons.map((b) => (
                <button
                  key={b.grade}
                  type="button"
                  disabled={pending}
                  onClick={() => grade(b.grade)}
                  className="border py-2.5 text-[12.5px] font-medium disabled:opacity-50"
                  style={{ borderColor: b.color, color: b.color }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
