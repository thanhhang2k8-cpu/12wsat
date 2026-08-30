"use client";

import { useState } from "react";

export function WrongAnswerRow({
  number,
  domain,
  section,
  explanationMd,
}: {
  number: number;
  domain: string;
  section: string;
  explanationMd: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-rule py-3">
      <div className="grid grid-cols-[56px_1fr_160px_100px] items-center text-[13px]">
        <div className="font-mono">{number}</div>
        <div>{domain}</div>
        <div className="text-muted">{section === "READING_WRITING" ? "Reading & Writing" : "Math"}</div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-right text-[12.5px] text-pen">
          {open ? "Ẩn" : "Xem lời giải"}
        </button>
      </div>
      {open && (
        <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
          {explanationMd ?? "Chưa có lời giải cho câu này."}
        </div>
      )}
    </div>
  );
}
