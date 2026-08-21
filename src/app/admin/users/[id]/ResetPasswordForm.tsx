"use client";

import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "@/lib/actions/admin-users";

const initialState: FormState = {};

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="userId" value={userId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-muted">Mật khẩu mới</span>
        <input
          type="text"
          name="password"
          required
          minLength={8}
          className="border border-rule bg-paper px-3 py-2 font-mono text-[14px] outline-none focus:border-pen"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="border border-pen px-4 py-2 text-[13px] font-medium text-pen disabled:opacity-60"
      >
        {pending ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
      </button>
      {state.ok && <span className="text-[13px] text-chalk-green">{state.ok}</span>}
      {state.error && <span className="text-[13px] text-red-ink">{state.error}</span>}
    </form>
  );
}
