"use client";

import { useTransition } from "react";
import { archiveTestAction, deleteDraftTestAction, duplicateAsDraftAction } from "@/lib/actions/admin-tests";

export function TestLifecycleActions({ testId, status }: { testId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  if (status === "DRAFT") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Xoá đề nháp này? Không thể hoàn tác.")) startTransition(() => deleteDraftTestAction(testId));
        }}
        className="text-[13px] text-red-ink disabled:opacity-60"
      >
        Xoá đề nháp
      </button>
    );
  }

  if (status === "PUBLISHED") {
    return (
      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => duplicateAsDraftAction(testId))}
          className="border border-pen px-4 py-2 text-[13px] text-pen disabled:opacity-60"
        >
          {pending ? "Đang tạo bản nháp…" : "Sửa (tạo phiên bản mới)"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Lưu trữ đề này? Học viên sẽ không làm được đề nữa, nhưng kết quả cũ vẫn giữ nguyên.")) {
              startTransition(() => archiveTestAction(testId));
            }
          }}
          className="text-[13px] text-red-ink disabled:opacity-60"
        >
          Lưu trữ
        </button>
      </div>
    );
  }

  return null;
}
