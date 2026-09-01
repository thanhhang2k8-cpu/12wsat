"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitPracticeAnswerAction, advancePracticeAction, toggleBookmarkAction } from "@/lib/actions/practice";
import { MathText } from "@/components/MathText";

type Choice = { label: string; textMd: string };
type QuestionImage = { id: string; note: string | null; url: string };
type Question = {
  id: string;
  number: number;
  passageMd: string | null;
  stemMd: string;
  type: "MCQ" | "GRID_IN";
  section: string;
  choices: Choice[];
  images: QuestionImage[];
};

const sectionLabel: Record<string, string> = { READING_WRITING: "Reading and Writing", MATH: "Math" };

export function PracticeSessionClient({
  practiceSetId,
  index,
  totalCount,
  question,
  initiallyBookmarked,
}: {
  practiceSetId: string;
  index: number;
  totalCount: number;
  question: Question;
  initiallyBookmarked: boolean;
}) {
  const router = useRouter();
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [gridInValue, setGridInValue] = useState("");
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanationMd: string | null; correctAnswer: string | string[] } | null>(
    null,
  );
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [pending, startTransition] = useTransition();

  function check() {
    startTransition(async () => {
      const result = await submitPracticeAnswerAction(practiceSetId, question.id, {
        selectedLabel,
        gridInValue: gridInValue.trim() || null,
      });
      setFeedback(result);
    });
  }

  function next() {
    startTransition(async () => {
      await advancePracticeAction(practiceSetId);
      router.refresh();
    });
  }

  function toggleBookmark() {
    startTransition(async () => {
      const { bookmarked: nowBookmarked } = await toggleBookmarkAction(question.id);
      setBookmarked(nowBookmarked);
    });
  }

  const canCheck = question.type === "MCQ" ? !!selectedLabel : gridInValue.trim().length > 0;
  const correctLabel = Array.isArray(feedback?.correctAnswer) ? feedback.correctAnswer[0] : feedback?.correctAnswer;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex h-14 items-center justify-between border-b border-rule px-6">
        <div className="flex items-center gap-3.5">
          <span className="text-[13px] font-semibold">{sectionLabel[question.section] ?? question.section}</span>
          <span className="font-mono text-[12px] text-muted">
            Câu {index + 1} / {totalCount}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleBookmark}
          className="text-[13px]"
          style={{ color: bookmarked ? "var(--color-amber)" : "var(--color-muted)" }}
        >
          {bookmarked ? "★ Đã đánh dấu" : "☆ Đánh dấu"}
        </button>
      </div>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <div className="w-1/2 overflow-y-auto border-r border-rule px-10 py-7">
          {question.passageMd && (
            <MathText
              text={question.passageMd}
              className="text-[16px] leading-[1.7]"
              style={{ fontFamily: "var(--font-reading), Georgia, serif", maxWidth: "66ch" }}
            />
          )}
          {question.images.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {question.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.url} alt={img.note ?? ""} className="max-w-full border border-rule" />
              ))}
            </div>
          )}
        </div>

        <div className="flex w-1/2 flex-col px-10 py-7">
          <MathText text={question.stemMd} className="mb-5 text-[15px] leading-relaxed" />

          {question.type === "MCQ" ? (
            <div className="flex flex-col border-t border-rule">
              {question.choices.map((c) => {
                const selected = selectedLabel === c.label;
                const showCorrect = feedback && c.label.toUpperCase() === (correctLabel ?? "").toUpperCase();
                const showWrongSelected = feedback && selected && !feedback.isCorrect;
                return (
                  <button
                    key={c.label}
                    type="button"
                    data-testid="practice-choice"
                    data-label={c.label}
                    disabled={!!feedback}
                    onClick={() => setSelectedLabel(c.label)}
                    className="flex items-center gap-4 border-b border-rule py-3.5 text-left"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px]"
                      style={{
                        background: showCorrect ? "var(--color-chalk-green)" : showWrongSelected ? "var(--color-red-ink)" : selected ? "var(--color-pen)" : "transparent",
                        color: showCorrect || showWrongSelected || selected ? "var(--color-paper)" : "var(--color-ink)",
                        border: `1.5px solid ${showCorrect ? "var(--color-chalk-green)" : showWrongSelected ? "var(--color-red-ink)" : selected ? "var(--color-pen)" : "var(--color-ink)"}`,
                      }}
                    >
                      {c.label}
                    </span>
                    <MathText text={c.textMd} className="flex-1 text-[14.5px]" />
                  </button>
                );
              })}
            </div>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-muted">Nhập đáp án (phân số hoặc số thập phân)</span>
              <input
                type="text"
                value={gridInValue}
                disabled={!!feedback}
                onChange={(e) => setGridInValue(e.target.value)}
                className="w-40 border border-rule bg-paper px-3 py-2 font-mono text-[15px] outline-none focus:border-pen"
              />
              {feedback && !feedback.isCorrect && (
                <span className="text-[13px] text-muted">
                  Đáp án đúng: <span className="font-mono">{Array.isArray(feedback.correctAnswer) ? feedback.correctAnswer.join(", ") : feedback.correctAnswer}</span>
                </span>
              )}
            </label>
          )}

          {feedback && (
            <div className="mt-6 border-t border-rule pt-5">
              <div
                className="mb-2 text-[14px] font-semibold"
                style={{ color: feedback.isCorrect ? "var(--color-chalk-green)" : "var(--color-red-ink)" }}
              >
                {feedback.isCorrect ? "Đúng!" : "Sai rồi."}
              </div>
              {feedback.explanationMd ? (
                <MathText text={feedback.explanationMd} className="text-[13.5px] leading-relaxed text-muted" />
              ) : (
                <p className="text-[13.5px] text-muted">Chưa có lời giải cho câu này.</p>
              )}
            </div>
          )}

          <div className="mt-8">
            {feedback ? (
              <button
                type="button"
                disabled={pending}
                onClick={next}
                className="bg-pen px-6 py-2.5 text-[13px] font-semibold text-paper disabled:opacity-60"
              >
                {index + 1 >= totalCount ? "Xem kết quả" : "Câu tiếp theo"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canCheck || pending}
                onClick={check}
                className="bg-pen px-6 py-2.5 text-[13px] font-semibold text-paper disabled:opacity-50"
              >
                Kiểm tra
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
