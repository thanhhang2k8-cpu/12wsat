"use client";

import type { ReviewModule } from "./types";

const sectionLabel: Record<ReviewModule["section"], string> = {
  READING_WRITING: "R&W",
  MATH: "Math",
};

export function QuestionQueue({
  modules,
  selectedId,
  onSelect,
}: {
  modules: ReviewModule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col overflow-y-auto border-b border-rule" style={{ maxHeight: "260px" }}>
      {modules.map((mod) => (
        <div key={mod.id}>
          <div className="sticky top-0 bg-paper px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {sectionLabel[mod.section]} — Module {mod.moduleNumber}
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-3">
            {mod.questions.map((q) => {
              const isSelected = q.id === selectedId;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelect(q.id)}
                  className="flex h-8 w-8 items-center justify-center font-mono text-[12px]"
                  style={{
                    background: isSelected ? "var(--color-pen)" : q.needsReview ? "color-mix(in srgb, var(--color-red-ink) 12%, var(--color-paper))" : "transparent",
                    color: isSelected ? "var(--color-paper)" : q.needsReview ? "var(--color-red-ink)" : "var(--color-ink)",
                    border: `1px solid ${isSelected ? "var(--color-pen)" : q.needsReview ? "var(--color-red-ink)" : "var(--color-rule)"}`,
                  }}
                  title={q.needsReview ? "Cần kiểm tra" : undefined}
                >
                  {q.number}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
