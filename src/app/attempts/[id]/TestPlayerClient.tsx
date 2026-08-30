"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveAnswerAction, heartbeatAction, submitModuleAction, logTabSwitchAction } from "@/lib/actions/attempt";

type Choice = { label: string; textMd: string };
type QuestionImage = { id: string; note: string | null; url: string };
type QuestionAnswer = { selectedLabel: string | null; gridInValue: string | null; flagged: boolean; strikeouts: string[] };
type Question = {
  id: string;
  number: number;
  passageMd: string | null;
  stemMd: string;
  type: "MCQ" | "GRID_IN";
  choices: Choice[];
  images: QuestionImage[];
  answer: QuestionAnswer;
};

const sectionLabel: Record<string, string> = { READING_WRITING: "Reading and Writing", MATH: "Math" };

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TestPlayerClient({
  attemptId,
  attemptModuleId,
  section,
  moduleNumber,
  untimed,
  initialRemainingSec,
  questions,
}: {
  attemptId: string;
  attemptModuleId: string;
  section: string;
  moduleNumber: number;
  untimed: boolean;
  initialRemainingSec: number | null;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.answer])),
  );
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(initialRemainingSec);
  const [showReview, setShowReview] = useState(false);
  const [tabBlurred, setTabBlurred] = useState(false);
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const hiddenSinceRef = useRef<number | null>(null);

  const q = questions[index];

  // Local 1s countdown for a smooth display; corrected every 5s by the server heartbeat.
  useEffect(() => {
    if (untimed) return;
    const id = setInterval(() => setRemaining((r) => (r === null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(id);
  }, [untimed]);

  useEffect(() => {
    if (untimed) return;
    const id = setInterval(async () => {
      const res = await heartbeatAction(attemptId);
      setRemaining(res.remainingSec);
      if (res.autoSubmitted) {
        window.location.reload();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [attemptId, untimed]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
        setTabBlurred(true);
      } else if (hiddenSinceRef.current) {
        const durationSec = Math.round((Date.now() - hiddenSinceRef.current) / 1000);
        hiddenSinceRef.current = null;
        setTabBlurred(false);
        void logTabSwitchAction(attemptId, durationSec);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [attemptId]);

  function updateAnswer(questionId: string, patch: Partial<QuestionAnswer>) {
    const merged = { ...answers[questionId], ...patch };
    setAnswers((prev) => ({ ...prev, [questionId]: merged }));
    startTransition(() => {
      void saveAnswerAction({ attemptId, questionId, ...merged });
    });
  }

  function toggleStrikeout(label: string) {
    const current = answers[q.id].strikeouts;
    const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
    updateAnswer(q.id, { strikeouts: next });
  }

  const answeredCount = useMemo(
    () => questions.filter((qq) => !!answers[qq.id]?.selectedLabel || !!answers[qq.id]?.gridInValue?.trim()).length,
    [questions, answers],
  );

  function handleSubmitModule() {
    if (!confirm("Nộp module này? Bạn sẽ không quay lại sửa được nữa.")) return;
    setSubmitting(true);
    startTransition(() => {
      void submitModuleAction(attemptModuleId);
    });
  }

  return (
    <div className="relative flex h-screen flex-col bg-paper text-ink" style={{ fontFamily: "var(--font-ui), system-ui, sans-serif" }}>
      {tabBlurred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/90 backdrop-blur-sm">
          <div className="text-[15px] font-medium">Quay lại tab để tiếp tục làm bài</div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-6">
        <div className="flex items-center gap-3.5">
          <span className="text-[13px] font-semibold">{sectionLabel[section] ?? section}</span>
          <span className="border border-rule px-1.5 py-0.5 font-mono text-[11px] text-muted">Module {moduleNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          {untimed ? (
            <span className="text-[13px] text-muted">Không giới hạn thời gian</span>
          ) : (
            <span
              className="font-mono text-[20px] font-semibold"
              style={{ color: remaining !== null && remaining < 300 ? "var(--color-red-ink)" : "var(--color-ink)" }}
            >
              {remaining !== null ? formatClock(remaining) : "--:--"}
            </span>
          )}
        </div>
        <div className="w-[140px]" />
      </div>

      {/* Main split */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-y-auto border-r border-rule px-10 py-7">
          <div
            className="mb-5 inline-block border font-mono text-[12px]"
            style={{ borderColor: "var(--color-ink)", padding: "2px 9px" }}
          >
            {q.number}
          </div>
          {q.passageMd && (
            <div
              className="whitespace-pre-wrap text-[17px] leading-[1.7]"
              style={{ fontFamily: "var(--font-reading), Georgia, serif", maxWidth: "66ch", userSelect: "none" }}
            >
              {q.passageMd}
            </div>
          )}
          {q.images.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {q.images.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.url} alt={img.note ?? ""} className="max-w-full border border-rule" />
              ))}
            </div>
          )}
        </div>

        <div className="flex w-1/2 flex-col overflow-y-auto px-10 py-7">
          <div className="mb-5 flex items-center gap-4 border-b border-rule pb-4 text-[12px]">
            <span className="text-muted">Gạch bỏ đáp án: bấm vào vòng tròn bên phải mỗi lựa chọn</span>
          </div>

          <div className="mb-5 text-[15px] leading-relaxed" style={{ userSelect: "none" }}>
            {q.stemMd}
          </div>

          {q.type === "MCQ" ? (
            <div className="flex flex-col border-t border-rule">
              {q.choices.map((c) => {
                const selected = answers[q.id].selectedLabel === c.label;
                const struck = answers[q.id].strikeouts.includes(c.label);
                return (
                  <div key={c.label} className="flex items-center gap-4 border-b border-rule py-3.5">
                    <button
                      type="button"
                      onClick={() => !struck && updateAnswer(q.id, { selectedLabel: c.label })}
                      disabled={struck}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px]"
                      style={{
                        background: selected ? "var(--color-pen)" : "transparent",
                        color: selected ? "var(--color-paper)" : "var(--color-ink)",
                        border: `1.5px solid ${selected ? "var(--color-pen)" : "var(--color-ink)"}`,
                        opacity: struck ? 0.4 : 1,
                      }}
                    >
                      {c.label}
                    </button>
                    <div className="flex-1 text-[14.5px]" style={{ textDecoration: struck ? "line-through" : "none", opacity: struck ? 0.4 : 1 }}>
                      {c.textMd}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStrikeout(c.label)}
                      className="shrink-0"
                      title={struck ? "Bỏ gạch" : "Gạch bỏ"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={struck ? "var(--color-ink)" : "var(--color-rule)"} strokeWidth="1.8">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M7 7l10 10" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <label className="flex flex-col gap-2">
              <span className="text-[12px] font-medium text-muted">Nhập đáp án (phân số hoặc số thập phân)</span>
              <input
                type="text"
                defaultValue={answers[q.id].gridInValue ?? ""}
                onChange={(e) => updateAnswer(q.id, { gridInValue: e.target.value })}
                className="w-40 border border-rule bg-paper px-3 py-2 font-mono text-[15px] outline-none focus:border-pen"
              />
            </label>
          )}
        </div>

        {showReview && (
          <div className="absolute right-6 bottom-6 z-40 w-[380px] border border-ink bg-paper p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wide">Xem lại câu hỏi</span>
              <button type="button" onClick={() => setShowReview(false)} className="text-[12px] text-muted">
                Đóng
              </button>
            </div>
            <div className="grid grid-cols-9 gap-1.5">
              {questions.map((qq, i) => {
                const a = answers[qq.id];
                const isAnswered = !!a.selectedLabel || !!a.gridInValue?.trim();
                const isCurrent = i === index;
                return (
                  <button
                    key={qq.id}
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setShowReview(false);
                    }}
                    className="relative flex h-8 w-8 items-center justify-center font-mono text-[11.5px]"
                    style={{
                      background: isCurrent ? "var(--color-pen)" : isAnswered ? "color-mix(in srgb, var(--color-pen) 16%, var(--color-paper))" : "transparent",
                      color: isCurrent ? "var(--color-paper)" : "var(--color-ink)",
                      border: `1px solid ${a.flagged ? "var(--color-red-ink)" : "var(--color-rule)"}`,
                    }}
                  >
                    {qq.number}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-t border-rule px-6">
        <div className="flex items-center gap-3.5">
          <button type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className="disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.8"><path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span className="font-mono text-[13px]">
            Câu {index + 1} / {questions.length}
          </span>
          <button type="button" disabled={index === questions.length - 1} onClick={() => setIndex((i) => i + 1)} className="disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.8"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <button type="button" onClick={() => setShowReview((s) => !s)} className="text-[13px] text-pen underline decoration-pen/40">
          Xem tất cả câu hỏi ({answeredCount}/{questions.length} đã làm)
        </button>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => updateAnswer(q.id, { flagged: !answers[q.id].flagged })}
            className="flex items-center gap-1.5 text-[13px]"
            style={{ color: answers[q.id].flagged ? "var(--color-red-ink)" : "var(--color-ink)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3v18M6 4h11l-3 4 3 4H6" strokeLinejoin="round" /></svg>
            Đánh dấu để xem lại
          </button>
          {index === questions.length - 1 ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitModule}
              className="bg-pen px-6 py-2.5 text-[13px] font-semibold text-paper disabled:opacity-60"
            >
              {submitting ? "Đang nộp…" : "Nộp module"}
            </button>
          ) : (
            <button type="button" onClick={() => setIndex((i) => i + 1)} className="bg-pen px-6 py-2.5 text-[13px] font-semibold text-paper">
              Tiếp theo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
