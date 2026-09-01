"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTestTypeAction } from "@/lib/actions/admin-tests";

export function TestTypeSelector({ testId, type }: { testId: string; type: "FULL_TEST" | "PRACTICE_SET" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: "FULL_TEST" | "PRACTICE_SET") {
    startTransition(async () => {
      await setTestTypeAction(testId, next);
      router.refresh();
    });
  }

  return (
    <div className="border border-rule p-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Loại đề</div>
      <select
        value={type}
        disabled={pending}
        onChange={(e) => change(e.target.value as "FULL_TEST" | "PRACTICE_SET")}
        className="border border-rule bg-paper px-2 py-1.5 text-[13px]"
      >
        <option value="FULL_TEST">Đề đầy đủ (Real Test)</option>
        <option value="PRACTICE_SET">Bộ câu luyện tập (Question Bank)</option>
      </select>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        {type === "FULL_TEST"
          ? "Có thể \"Giao đề\" cho học viên vào mục Real Test (tính giờ, adaptive theo module)."
          : "Không xuất hiện ở mục Real Test — chỉ dùng làm nguồn câu hỏi."}{" "}
        Dù chọn loại nào, sau khi publish mọi câu hỏi đều tự động vào chung Question Bank / Luyện tập của học viên (lọc theo domain/skill, không theo từng đề riêng).
      </p>
    </div>
  );
}
