"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { publishTestAction, reparseWholeTestAction } from "@/lib/actions/admin-tests";
import { SourceViewer } from "./SourceViewer";
import { QuestionQueue } from "./QuestionQueue";
import { QuestionEditor } from "./QuestionEditor";
import type { ReviewModule } from "./types";

export function ReviewWorkspace({
  testId,
  testTitle,
  testStatus,
  sourceFileName,
  sourceUrl,
  sourceMimeType,
  parseJobStatus,
  parseJobError,
  modules,
  flaggedCount,
}: {
  testId: string;
  testTitle: string;
  testStatus: string;
  sourceFileName: string | null;
  sourceUrl: string | null;
  sourceMimeType: string | null;
  parseJobStatus: string | null;
  parseJobError: string | null;
  modules: ReviewModule[];
  flaggedCount: number;
}) {
  const allQuestions = useMemo(() => modules.flatMap((m) => m.questions), [modules]);
  const firstFlagged = allQuestions.find((q) => q.needsReview);
  const [selectedId, setSelectedId] = useState<string | null>(firstFlagged?.id ?? allQuestions[0]?.id ?? null);
  const selected = allQuestions.find((q) => q.id === selectedId) ?? null;

  const [reparsing, startReparse] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [publishError, setPublishError] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-76px)] flex-col">
      <div className="flex items-center justify-between border-b border-rule px-8 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[19px] font-medium">{testTitle}</h1>
            <span className="text-[11px] text-muted">{sourceFileName}</span>
          </div>
          {parseJobStatus === "FAILED" && (
            <p className="mt-1 text-[12.5px] text-red-ink">AI parse lỗi: {parseJobError}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px]" style={{ color: flaggedCount > 0 ? "var(--color-red-ink)" : "var(--color-chalk-green)" }}>
            {flaggedCount > 0 ? `${flaggedCount} câu cần kiểm tra` : "Không còn câu bị gắn cờ"}
          </span>
          {sourceUrl && (
            <button
              type="button"
              disabled={reparsing}
              onClick={() => startReparse(() => reparseWholeTestAction(testId))}
              className="text-[13px] text-pen disabled:opacity-60"
            >
              {reparsing ? "Đang parse lại toàn bộ…" : "Parse lại toàn bộ"}
            </button>
          )}
          <button
            type="button"
            disabled={publishing || testStatus !== "DRAFT"}
            onClick={() =>
              startPublish(async () => {
                setPublishError(null);
                const res = await publishTestAction(testId);
                if (res?.error) setPublishError(res.error);
              })
            }
            className="bg-pen px-4 py-2 text-[13px] font-semibold text-paper disabled:opacity-60"
          >
            {testStatus === "DRAFT" ? (publishing ? "Đang publish…" : "Publish") : "Đã publish"}
          </button>
        </div>
      </div>
      {publishError && <div className="border-b border-rule bg-paper px-8 py-2 text-[13px] text-red-ink">{publishError}</div>}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r border-rule">
          <SourceViewer sourceUrl={sourceUrl} sourceMimeType={sourceMimeType} sourceFileName={sourceFileName} />
        </div>

        <div className="flex w-1/2 flex-col overflow-hidden">
          <QuestionQueue modules={modules} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <QuestionEditor question={selected} canReparse={!!sourceUrl} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-[13px] text-muted">
              <div>
                Chưa có câu hỏi nào được parse.{" "}
                <Link href="/admin/tests" className="text-pen">
                  Quay lại danh sách đề
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
