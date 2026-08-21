"use client";

import { useActionState, useRef } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const tzRef = useRef<HTMLInputElement>(null);
  const resRef = useRef<HTMLInputElement>(null);
  const platformRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      onSubmit={() => {
        if (tzRef.current) {
          tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
        }
        if (resRef.current && typeof screen !== "undefined") {
          resRef.current.value = `${screen.width}x${screen.height}`;
        }
        if (platformRef.current && typeof navigator !== "undefined") {
          platformRef.current.value = navigator.platform ?? "";
        }
      }}
    >
      <input ref={tzRef} type="hidden" name="timezone" />
      <input ref={resRef} type="hidden" name="screenRes" />
      <input ref={platformRef} type="hidden" name="platform" />

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          className="border border-rule bg-paper px-3 py-2.5 text-[15px] text-ink outline-none focus:border-pen focus:ring-1 focus:ring-pen"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Mật khẩu</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="border border-rule bg-paper px-3 py-2.5 text-[15px] text-ink outline-none focus:border-pen focus:ring-1 focus:ring-pen"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-[13px] text-red-ink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-pen px-4 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60"
      >
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
