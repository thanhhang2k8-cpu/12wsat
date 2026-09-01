"use client";

import { useState, useTransition } from "react";
import { quickAddWordFromQuestionAction } from "@/lib/actions/vocab";

export function QuickAddVocab({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  if (saved) {
    return <p className="mt-4 text-[12.5px] text-chalk-green">Đã thêm vào Vocab Notebook.</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 text-[12.5px] text-pen">
        + Thêm một từ từ câu này vào Vocab
      </button>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 border border-rule p-3">
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Từ vựng"
        className="border border-rule bg-paper px-2.5 py-1.5 text-[13px] outline-none focus:border-pen"
      />
      <input
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Định nghĩa"
        className="border border-rule bg-paper px-2.5 py-1.5 text-[13px] outline-none focus:border-pen"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!term.trim() || !definition.trim() || pending}
          onClick={() =>
            startTransition(async () => {
              await quickAddWordFromQuestionAction({ term, definition, sourceQuestionId: questionId });
              setSaved(true);
            })
          }
          className="bg-pen px-4 py-1.5 text-[12.5px] font-semibold text-paper disabled:opacity-50"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[12.5px] text-muted">
          Huỷ
        </button>
      </div>
    </div>
  );
}
