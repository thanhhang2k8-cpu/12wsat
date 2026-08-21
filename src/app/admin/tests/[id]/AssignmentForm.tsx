"use client";

import { useActionState } from "react";
import { createAssignmentAction, deleteAssignmentAction, type FormState } from "@/lib/actions/admin-tests";

const initialState: FormState = {};

export function AssignmentForm({
  testId,
  cohorts,
  students,
}: {
  testId: string;
  cohorts: { id: string; name: string }[];
  students: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createAssignmentAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-6 gap-y-3">
      <input type="hidden" name="testId" value={testId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Giao cho nhóm</span>
        <select name="cohortId" defaultValue="" className="border border-rule bg-paper px-3 py-2 text-[13.5px]">
          <option value="">— Không chọn —</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Hoặc một học viên cụ thể</span>
        <select name="userId" defaultValue="" className="border border-rule bg-paper px-3 py-2 text-[13.5px]">
          <option value="">— Không chọn —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Mở lúc</span>
        <input type="datetime-local" name="openAt" className="border border-rule bg-paper px-3 py-2 text-[13.5px]" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Đóng lúc</span>
        <input type="datetime-local" name="closeAt" className="border border-rule bg-paper px-3 py-2 text-[13.5px]" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Số lần làm lại tối đa</span>
        <input type="number" name="maxAttempts" defaultValue={1} min={1} className="border border-rule bg-paper px-3 py-2 text-[13.5px]" />
      </label>

      {state.error && <p className="col-span-2 text-[13px] text-red-ink">{state.error}</p>}
      {state.ok && <p className="col-span-2 text-[13px] text-chalk-green">{state.ok}</p>}

      <div className="col-span-2">
        <button type="submit" disabled={pending} className="border border-pen px-4 py-2 text-[13px] text-pen disabled:opacity-60">
          {pending ? "Đang giao…" : "Giao đề"}
        </button>
      </div>
    </form>
  );
}

export function DeleteAssignmentButton({ id }: { id: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Gỡ lượt giao đề này?")) deleteAssignmentAction(id);
      }}
      className="text-[12px] text-red-ink"
    >
      Gỡ
    </button>
  );
}
