"use client";

import { useActionState } from "react";
import { saveScoreScalesAction, type FormState } from "@/lib/actions/admin-tests";

const initialState: FormState = {};

export function ScoreScaleForm({
  testId,
  section,
  label,
  initialRows,
}: {
  testId: string;
  section: "READING_WRITING" | "MATH";
  label: string;
  initialRows: { rawScore: number; scaledScore: number }[];
}) {
  const [state, formAction, pending] = useActionState(saveScoreScalesAction, initialState);
  const defaultText = initialRows.map((r) => `${r.rawScore},${r.scaledScore}`).join("\n");

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="testId" value={testId} />
      <input type="hidden" name="section" value={section} />
      <span className="text-[12px] font-medium text-muted">{label} — mỗi dòng &quot;điểm thô,điểm quy đổi&quot;</span>
      <textarea
        name="rows"
        defaultValue={defaultText}
        rows={6}
        placeholder={"54,800\n53,790\n..."}
        className="w-64 border border-rule bg-paper px-3 py-2 font-mono text-[12.5px] outline-none focus:border-pen"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="self-start border border-pen px-3 py-1.5 text-[12.5px] text-pen disabled:opacity-60">
          {pending ? "Đang lưu…" : "Lưu bảng quy đổi"}
        </button>
        {state.ok && <span className="text-[12px] text-chalk-green">{state.ok}</span>}
        {state.error && <span className="text-[12px] text-red-ink">{state.error}</span>}
      </div>
    </form>
  );
}
