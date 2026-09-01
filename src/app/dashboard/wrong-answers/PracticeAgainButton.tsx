"use client";

import { useTransition } from "react";
import { startPracticeAction } from "@/lib/actions/practice";

export function PracticeAgainButton({ questionIds }: { questionIds: string[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void startPracticeAction(questionIds))}
      className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60"
    >
      {pending ? "Đang tạo…" : `Luyện lại ${questionIds.length} câu này`}
    </button>
  );
}
