"use client";

import { useActionState } from "react";
import { addWordAction, type AddWordState } from "@/lib/actions/vocab";

const emptyState: AddWordState = {};

export function AddWordForm({ decks }: { decks: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(addWordAction, emptyState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-4 border border-rule p-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Từ vựng</span>
        <input name="term" required className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Định nghĩa</span>
        <input name="definition" required className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Từ loại</span>
        <input name="partOfSpeech" placeholder="n., v., adj. ..." className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Phiên âm (IPA)</span>
        <input name="ipa" className="border border-rule bg-paper px-3 py-2 font-mono text-[13px] outline-none focus:border-pen" />
      </label>
      <label className="col-span-2 flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Từ đồng nghĩa (cách nhau bởi dấu phẩy)</span>
        <input name="synonyms" className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen" />
      </label>
      <label className="col-span-2 flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Câu ví dụ</span>
        <textarea name="exampleSentence" rows={2} className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen" />
      </label>
      {decks.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Bộ từ</span>
          <select name="deckId" defaultValue={decks[0].id} className="border border-rule bg-paper px-2 py-2 text-[14px]">
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {state.error && <p className="col-span-2 text-[13px] text-red-ink">{state.error}</p>}
      {state.ok && <p className="col-span-2 text-[13px] text-chalk-green">{state.ok}</p>}

      <div className="col-span-2">
        <button type="submit" disabled={pending} className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60">
          {pending ? "Đang lưu…" : "Thêm từ"}
        </button>
      </div>
    </form>
  );
}
