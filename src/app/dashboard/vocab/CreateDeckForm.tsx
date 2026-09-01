"use client";

import { useActionState } from "react";
import { createDeckAction, type AddWordState } from "@/lib/actions/vocab";

const emptyState: AddWordState = {};

export function CreateDeckForm() {
  const [state, formAction, pending] = useActionState(createDeckAction, emptyState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Tên bộ từ mới</span>
        <input name="name" required className="border border-rule bg-paper px-3 py-1.5 text-[13.5px] outline-none focus:border-pen" />
      </label>
      <button type="submit" disabled={pending} className="border border-pen px-4 py-1.5 text-[13px] text-pen disabled:opacity-60">
        {pending ? "Đang tạo…" : "+ Tạo bộ từ"}
      </button>
      {state.error && <span className="text-[12.5px] text-red-ink">{state.error}</span>}
    </form>
  );
}
