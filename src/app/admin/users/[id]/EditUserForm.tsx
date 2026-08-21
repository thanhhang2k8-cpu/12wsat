"use client";

import { useActionState } from "react";
import { updateUserAction, type FormState } from "@/lib/actions/admin-users";

const initialState: FormState = {};

type Props = {
  userId: string;
  fullName: string;
  note: string | null;
  cohortId: string | null;
  maxDevices: number;
  expiresAt: string | null; // yyyy-mm-dd or null
  cohorts: { id: string; name: string }[];
};

export function EditUserForm({ userId, fullName, note, cohortId, maxDevices, expiresAt, cohorts }: Props) {
  const [state, formAction, pending] = useActionState(updateUserAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-8 gap-y-4">
      <input type="hidden" name="userId" value={userId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Họ tên</span>
        <input
          name="fullName"
          defaultValue={fullName}
          required
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Nhóm (cohort)</span>
        <select
          name="cohortId"
          defaultValue={cohortId ?? ""}
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        >
          <option value="">— Không chọn —</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Hoặc tạo nhóm mới</span>
        <input
          name="newCohortName"
          placeholder="VD: SAT — Lớp T8"
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Số thiết bị tối đa</span>
        <input
          type="number"
          name="maxDevices"
          defaultValue={maxDevices}
          min={1}
          max={10}
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Hết hạn truy cập</span>
        <input
          type="date"
          name="expiresAt"
          defaultValue={expiresAt ?? ""}
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Ghi chú</span>
        <input
          name="note"
          defaultValue={note ?? ""}
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      {state.error && <p className="col-span-2 text-[13px] text-red-ink">{state.error}</p>}
      {state.ok && <p className="col-span-2 text-[13px] text-chalk-green">{state.ok}</p>}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
