"use client";

import { useTransition } from "react";
import {
  activateUserAction,
  deleteUserAction,
  suspendUserAction,
} from "@/lib/actions/admin-users";

export function DangerZone({ userId, status }: { userId: string; status: "ACTIVE" | "SUSPENDED" }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-4">
      {status === "ACTIVE" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Tạm khoá tài khoản này? Phiên đang mở sẽ bị đăng xuất trong ít giây.")) {
              startTransition(() => suspendUserAction(userId));
            }
          }}
          className="border border-red-ink px-4 py-2 text-[13px] text-red-ink disabled:opacity-60"
        >
          Tạm khoá tài khoản
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => activateUserAction(userId))}
          className="border border-chalk-green px-4 py-2 text-[13px] text-chalk-green disabled:opacity-60"
        >
          Mở khoá tài khoản
        </button>
      )}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            confirm(
              "Xoá vĩnh viễn tài khoản này? Toàn bộ thiết bị và phiên đăng nhập sẽ bị xoá theo. Không thể hoàn tác.",
            )
          ) {
            startTransition(() => deleteUserAction(userId));
          }
        }}
        className="text-[13px] text-red-ink underline decoration-red-ink/40 disabled:opacity-60"
      >
        Xoá vĩnh viễn
      </button>
    </div>
  );
}
