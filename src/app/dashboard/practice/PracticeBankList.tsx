"use client";

import { useState, useTransition } from "react";
import { startPracticeAction } from "@/lib/actions/practice";

type MatchedQuestion = {
  id: string;
  number: number;
  domain: string | null;
  skill: string | null;
  difficulty: string | null;
  module: { section: string };
};

const sectionLabel: Record<string, string> = { READING_WRITING: "R&W", MATH: "Math" };

export function PracticeBankList({ questions, total }: { questions: MatchedQuestion[]; total: number }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(questions.map((q) => q.id)));
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === questions.length ? new Set() : new Set(questions.map((q) => q.id))));
  }

  function start() {
    const ids = questions.filter((q) => selected.has(q.id)).map((q) => q.id);
    startTransition(() => {
      void startPracticeAction(ids);
    });
  }

  if (questions.length === 0) {
    return <p className="border border-rule px-4 py-8 text-center text-[13px] text-muted">Không có câu nào phù hợp với bộ lọc này.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={toggleAll} className="text-[12.5px] text-pen">
          {selected.size === questions.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
        </button>
        <span className="font-mono text-[12px] text-muted">
          {total > questions.length ? `Hiện ${questions.length}/${total} câu phù hợp` : `${total} câu phù hợp`}
        </span>
      </div>

      <div className="border-t border-rule">
        {questions.map((q) => (
          <label key={q.id} className="flex cursor-pointer items-center gap-4 border-b border-rule py-2.5 text-[13px]">
            <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} className="h-4 w-4 shrink-0" />
            <span className="w-10 shrink-0 font-mono text-muted">#{q.number}</span>
            <span className="w-14 shrink-0 text-muted">{sectionLabel[q.module.section] ?? q.module.section}</span>
            <span className="flex-1 truncate">{q.domain ?? "—"}</span>
            <span className="w-28 shrink-0 truncate text-muted">{q.skill ?? "—"}</span>
            <span className="w-16 shrink-0 font-mono text-[11px] text-muted">{q.difficulty ?? "—"}</span>
          </label>
        ))}
      </div>

      <div className="mt-5">
        <button
          type="button"
          disabled={selected.size === 0 || pending}
          onClick={start}
          className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-50"
        >
          {pending ? "Đang tạo…" : `Bắt đầu luyện tập (${selected.size} câu)`}
        </button>
      </div>
    </div>
  );
}
