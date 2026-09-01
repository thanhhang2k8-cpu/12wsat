import { MathText } from "@/components/MathText";

type Choice = { label: string; text: string };
type Image = { id: string; note: string | null; url: string };

/**
 * Read-only rendering of a question exactly as it will appear to a student
 * in the real test player (two-column layout, KaTeX math) — lets an admin
 * sanity-check a question right after AI parsing, before publishing.
 */
export function QuestionPreview({
  passageMd,
  stemMd,
  type,
  choices,
  correctAnswer,
  images,
}: {
  passageMd: string;
  stemMd: string;
  type: "MCQ" | "GRID_IN";
  choices: Choice[];
  correctAnswer: string;
  images: Image[];
}) {
  return (
    <div className="border border-ink">
      <div className="border-b border-ink bg-tint px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
        Xem trước — đúng như học viên sẽ thấy
      </div>
      <div className="flex">
        <div className="w-1/2 border-r border-rule px-6 py-6">
          {passageMd ? (
            <MathText
              text={passageMd}
              className="text-[16px] leading-[1.7]"
              style={{ fontFamily: "var(--font-reading), Georgia, serif" }}
            />
          ) : (
            <span className="text-[13px] text-muted">Không có passage</span>
          )}
          {images.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.url} alt={img.note ?? ""} className="max-w-full border border-rule" />
              ))}
            </div>
          )}
        </div>

        <div className="flex w-1/2 flex-col px-6 py-6">
          <MathText text={stemMd || "—"} className="mb-4 text-[14.5px] leading-relaxed" />

          {type === "MCQ" ? (
            <div className="flex flex-col border-t border-rule">
              {choices.map((c, i) => {
                const isCorrect = c.label.trim().toUpperCase() === correctAnswer.trim().toUpperCase();
                return (
                  <div key={i} className="flex items-center gap-4 border-b border-rule py-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px]"
                      style={{
                        background: isCorrect ? "var(--color-chalk-green)" : "transparent",
                        color: isCorrect ? "var(--color-paper)" : "var(--color-ink)",
                        border: `1.5px solid ${isCorrect ? "var(--color-chalk-green)" : "var(--color-ink)"}`,
                      }}
                    >
                      {c.label}
                    </span>
                    <MathText text={c.text || "—"} className="flex-1 text-[14px]" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-muted">Ô nhập đáp án (grid-in)</span>
              <div className="w-40 border border-rule px-3 py-2 font-mono text-[14px] text-muted">
                đáp án đúng: {correctAnswer || "—"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
