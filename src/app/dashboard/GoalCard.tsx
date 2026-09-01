"use client";

import { useActionState, useState } from "react";
import { setGoalAction, type GoalState } from "@/lib/actions/goal";

const emptyState: GoalState = {};

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function GoalCard({ targetScore, targetExamDate }: { targetScore: number | null; targetExamDate: Date | null }) {
  const [state, formAction, pending] = useActionState(setGoalAction, emptyState);
  const [editing, setEditing] = useState(!targetScore && !targetExamDate);

  // Adjust `editing` in response to a state change during render (not an
  // effect) — the officially-recommended pattern for "reset state when an
  // input changes" (https://react.dev/learn/you-might-not-need-an-effect).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (!state.error && state !== emptyState) setEditing(false);
  }

  if (!editing) {
    const days = targetExamDate ? daysUntil(targetExamDate) : null;
    return (
      <div className="mb-10 flex items-center justify-between border border-ink px-6 py-5">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted">Mục tiêu</div>
          <div className="font-display mt-1 text-[22px] font-medium">
            {targetScore ? `${targetScore} điểm` : "Chưa đặt điểm mục tiêu"}
            {days !== null && (
              <span className="ml-3 font-mono text-[16px] text-pen">
                {days >= 0 ? `còn ${days} ngày` : `đã qua ${Math.abs(days)} ngày`}
              </span>
            )}
          </div>
          {targetExamDate && (
            <div className="mt-0.5 text-[12px] text-muted">
              Ngày thi: {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(targetExamDate)}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setEditing(true)} className="text-[13px] text-pen">
          Sửa mục tiêu
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mb-10 border border-ink px-6 py-5">
      <div className="mb-3 text-[11px] uppercase tracking-wide text-muted">Đặt mục tiêu</div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-muted">Điểm mục tiêu (400–1600)</span>
          <input
            type="number"
            name="targetScore"
            min={400}
            max={1600}
            step={10}
            defaultValue={targetScore ?? ""}
            className="w-32 border border-rule bg-paper px-3 py-1.5 font-mono text-[14px] outline-none focus:border-pen"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-muted">Ngày thi SAT chính thức</span>
          <input
            type="date"
            name="targetExamDate"
            defaultValue={targetExamDate ? targetExamDate.toISOString().slice(0, 10) : ""}
            className="border border-rule bg-paper px-3 py-1.5 text-[14px] outline-none focus:border-pen"
          />
        </label>
        <button type="submit" disabled={pending} className="bg-pen px-5 py-2 text-[13px] font-semibold text-paper disabled:opacity-60">
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        {(targetScore || targetExamDate) && (
          <button type="button" onClick={() => setEditing(false)} className="text-[13px] text-muted">
            Huỷ
          </button>
        )}
      </div>
      {state.error && <p className="mt-2 text-[13px] text-red-ink">{state.error}</p>}
    </form>
  );
}
