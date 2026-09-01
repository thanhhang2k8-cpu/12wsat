"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addQuestionImageAction,
  deleteQuestionImageAction,
  reparseQuestionAction,
  updateQuestionAction,
  type FormState,
} from "@/lib/actions/admin-tests";
import { MathText } from "@/components/MathText";
import { QuestionPreview } from "./QuestionPreview";
import type { ReviewQuestion } from "./types";

const emptyState: FormState = {};

function answerToText(a: string | string[]): string {
  return Array.isArray(a) ? a.join(", ") : a;
}

export function QuestionEditor({ question, canReparse }: { question: ReviewQuestion; canReparse: boolean }) {
  const [saveState, saveAction, savePending] = useActionState(updateQuestionAction, emptyState);
  const [reparsePending, startReparse] = useTransition();
  const [type, setType] = useState(question.type);
  const [choices, setChoices] = useState(
    question.choices.length > 0
      ? question.choices.map((c) => ({ label: c.label, text: c.textMd }))
      : [
          { label: "A", text: "" },
          { label: "B", text: "" },
          { label: "C", text: "" },
          { label: "D", text: "" },
        ],
  );
  const [passage, setPassage] = useState(question.passageMd ?? "");
  const [stem, setStem] = useState(question.stemMd);
  const [explanation, setExplanation] = useState(question.explanationMd ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(answerToText(question.correctAnswer));
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[13px] font-semibold">Câu {question.number}</span>
          {question.needsReview ? (
            <span className="border border-red-ink px-2 py-0.5 text-[11px] text-red-ink">Cần kiểm tra</span>
          ) : (
            <span className="border border-chalk-green px-2 py-0.5 text-[11px] text-chalk-green">Đã sẵn sàng</span>
          )}
          {question.confidence != null && (
            <span className="font-mono text-[11px] text-muted">confidence {question.confidence.toFixed(2)}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowPreview((s) => !s)}
            className="text-[12.5px] text-pen"
          >
            {showPreview ? "Đóng xem trước" : "👁 Xem trước như học viên sẽ thấy"}
          </button>
          {canReparse && (
            <button
              type="button"
              disabled={reparsePending}
              onClick={() => startReparse(() => reparseQuestionAction(question.id))}
              className="text-[12.5px] text-pen disabled:opacity-60"
            >
              {reparsePending ? "Đang nhờ AI parse lại…" : "Nhờ AI parse lại câu này"}
            </button>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="mb-6">
          <QuestionPreview
            passageMd={passage}
            stemMd={stem}
            type={type}
            choices={choices.map((c) => ({ label: c.label, text: c.text }))}
            correctAnswer={correctAnswer}
            images={question.images}
          />
        </div>
      )}

      <form action={saveAction} className="flex flex-col gap-5" key={question.id}>
        <input type="hidden" name="questionId" value={question.id} />

        <div className="grid grid-cols-2 gap-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Passage (markdown, để trống nếu không có)</span>
            <textarea
              name="passageMd"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              rows={6}
              className="border border-rule bg-paper px-3 py-2 font-mono text-[13px] outline-none focus:border-pen"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Xem trước</span>
            <div className="flex-1 border border-rule px-3 py-2 text-[14px]" style={{ fontFamily: "var(--font-reading)" }}>
              {passage ? <MathText text={passage} /> : <span className="text-muted">—</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Câu hỏi (stem)</span>
            <textarea
              name="stemMd"
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              rows={3}
              required
              className="border border-rule bg-paper px-3 py-2 font-mono text-[13px] outline-none focus:border-pen"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Xem trước</span>
            <div className="border border-rule px-3 py-2 text-[14px]">
              <MathText text={stem} />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Loại câu &amp; đáp án</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "MCQ" | "GRID_IN")}
              name="type"
              className="border border-rule bg-paper px-2 py-1 text-[12.5px]"
            >
              <option value="MCQ">Trắc nghiệm (MCQ)</option>
              <option value="GRID_IN">Grid-in</option>
            </select>
          </div>

          {type === "MCQ" ? (
            <div className="flex flex-col gap-2">
              {choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c.label}
                    onChange={(e) =>
                      setChoices((prev) => prev.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))
                    }
                    name="choiceLabel"
                    className="w-12 border border-rule bg-paper px-2 py-1.5 text-center font-mono text-[13px]"
                  />
                  <input
                    value={c.text}
                    onChange={(e) =>
                      setChoices((prev) => prev.map((x, xi) => (xi === i ? { ...x, text: e.target.value } : x)))
                    }
                    name="choiceText"
                    className="flex-1 border border-rule bg-paper px-3 py-1.5 text-[13.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => setChoices((prev) => prev.filter((_, xi) => xi !== i))}
                    className="text-[12px] text-red-ink"
                  >
                    Xoá
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setChoices((prev) => [...prev, { label: "", text: "" }])}
                className="self-start text-[12.5px] text-pen"
              >
                + Thêm đáp án
              </button>
            </div>
          ) : null}

          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
              {type === "MCQ" ? 'Đáp án đúng (chữ cái, ví dụ "B")' : 'Đáp án chấp nhận (cách nhau bởi dấu phẩy, ví dụ "3/5, 0.6")'}
            </span>
            <input
              name="correctAnswer"
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              required
              className="border border-rule bg-paper px-3 py-2 font-mono text-[13.5px] outline-none focus:border-pen"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Lời giải</span>
            <textarea
              name="explanationMd"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={4}
              className="border border-rule bg-paper px-3 py-2 font-mono text-[13px] outline-none focus:border-pen"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Xem trước</span>
            <div className="border border-rule px-3 py-2 text-[14px]">
              {explanation ? <MathText text={explanation} /> : <span className="text-muted">—</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Domain</span>
            <input
              name="domain"
              defaultValue={question.domain}
              required
              className="border border-rule bg-paper px-3 py-2 text-[13.5px] outline-none focus:border-pen"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Skill</span>
            <input
              name="skill"
              defaultValue={question.skill}
              required
              className="border border-rule bg-paper px-3 py-2 text-[13.5px] outline-none focus:border-pen"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Độ khó</span>
            <select
              name="difficulty"
              defaultValue={question.difficulty}
              className="border border-rule bg-paper px-3 py-2 text-[13.5px]"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
        </div>

        {saveState.error && <p className="text-[13px] text-red-ink">{saveState.error}</p>}
        {saveState.ok && <p className="text-[13px] text-chalk-green">{saveState.ok}</p>}

        <div>
          <button
            type="submit"
            disabled={savePending}
            className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60"
          >
            {savePending ? "Đang lưu…" : "Lưu câu hỏi"}
          </button>
        </div>
      </form>

      <div className="mt-8 border-t border-rule pt-6">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Hình ảnh</span>
        <div className="mt-3 flex flex-wrap gap-4">
          {question.images.map((img) => (
            <div key={img.id} className="w-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.note ?? ""} className="w-32 border border-rule object-cover" />
              <div className="mt-1 flex items-center justify-between">
                <span className="truncate text-[11px] text-muted">{img.note}</span>
                <button
                  type="button"
                  onClick={() => deleteQuestionImageAction(img.id)}
                  className="shrink-0 text-[11px] text-red-ink"
                >
                  Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
        <AddImageForm questionId={question.id} />
      </div>
    </div>
  );
}

function AddImageForm({ questionId }: { questionId: string }) {
  const [state, formAction, pending] = useActionState(addQuestionImageAction, emptyState);
  return (
    <form action={formAction} className="mt-3 flex items-end gap-3">
      <input type="hidden" name="questionId" value={questionId} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted">Ảnh (PNG/JPEG)</span>
        <input type="file" name="image" accept="image/png,image/jpeg" required className="text-[12.5px]" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted">Ghi chú</span>
        <input name="note" className="border border-rule bg-paper px-3 py-1.5 text-[13px]" />
      </label>
      <button type="submit" disabled={pending} className="border border-pen px-4 py-1.5 text-[13px] text-pen disabled:opacity-60">
        {pending ? "Đang tải…" : "Chèn ảnh"}
      </button>
      {state.error && <span className="text-[12.5px] text-red-ink">{state.error}</span>}
    </form>
  );
}
