"use client";

import { useActionState } from "react";
import { createUserAction, type FormState } from "@/lib/actions/admin-users";

const initialState: FormState = {};

export function CreateUserForm({ cohorts }: { cohorts: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-x-8 gap-y-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Họ tên</span>
        <input
          name="fullName"
          required
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Email đăng nhập</span>
        <input
          type="email"
          name="email"
          required
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Mật khẩu ban đầu</span>
        <input
          type="text"
          name="password"
          required
          minLength={8}
          className="border border-rule bg-paper px-3 py-2 font-mono text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Vai trò</span>
        <select
          name="role"
          defaultValue="STUDENT"
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        >
          <option value="STUDENT">Học viên</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Nhóm (cohort) có sẵn</span>
        <select
          name="cohortId"
          defaultValue=""
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
          defaultValue={2}
          min={1}
          max={10}
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Hết hạn truy cập (tuỳ chọn)</span>
        <input
          type="date"
          name="expiresAt"
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      <label className="col-span-2 flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Ghi chú</span>
        <input
          name="note"
          className="border border-rule bg-paper px-3 py-2 text-[14px] outline-none focus:border-pen"
        />
      </label>

      {state.error && (
        <p role="alert" className="col-span-2 text-[13px] text-red-ink">
          {state.error}
        </p>
      )}

      <div className="col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Đang tạo…" : "Tạo tài khoản"}
        </button>
      </div>
    </form>
  );
}
