"use client";

import { useTransition } from "react";
import { revokeDeviceAction } from "@/lib/actions/admin-users";

export function RevokeDeviceButton({ deviceId }: { deviceId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Gỡ thiết bị này? Học viên sẽ cần đăng nhập lại và slot thiết bị được giải phóng.")) {
          startTransition(() => revokeDeviceAction(deviceId));
        }
      }}
      className="text-[12.5px] text-red-ink disabled:opacity-60"
    >
      Gỡ thiết bị
    </button>
  );
}
