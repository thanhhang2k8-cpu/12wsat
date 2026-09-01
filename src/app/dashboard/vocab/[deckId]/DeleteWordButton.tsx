"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteWordAction } from "@/lib/actions/vocab";

export function DeleteWordButton({ wordId }: { wordId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Xoá từ này?")) return;
        startTransition(async () => {
          await deleteWordAction(wordId);
          router.refresh();
        });
      }}
      className="shrink-0 text-[12px] text-red-ink disabled:opacity-50"
    >
      Xoá
    </button>
  );
}
