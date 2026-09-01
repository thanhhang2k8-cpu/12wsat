"use client";

import { useEffect, useRef, useState } from "react";
import { logCopyAttemptAction } from "@/lib/actions/security";

/**
 * Wraps sensitive test content with: a tiled low-opacity watermark (student
 * name + email, so a screenshot/photo is traceable), blocked copy/cut/print/
 * context-menu/text-selection, and a soft-lock if the watermark node itself
 * is tampered with via devtools. None of this can stop a screenshot or a
 * photo of the screen — that's a physical limitation, not fixed here.
 */
export function AntiCopyWatermark({
  label,
  attemptId,
  children,
}: {
  label: string;
  attemptId: string | null;
  children: React.ReactNode;
}) {
  const watermarkRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      void logCopyAttemptAction(attemptId, "COPY");
    }
    function onCut(e: ClipboardEvent) {
      e.preventDefault();
      void logCopyAttemptAction(attemptId, "CUT");
    }
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
      void logCopyAttemptAction(attemptId, "CONTEXTMENU");
    }
    function onSelectStart(e: Event) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
    }
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "c") {
        e.preventDefault();
        void logCopyAttemptAction(attemptId, "COPY");
      } else if (key === "x") {
        e.preventDefault();
        void logCopyAttemptAction(attemptId, "CUT");
      } else if (key === "p") {
        e.preventDefault();
        void logCopyAttemptAction(attemptId, "PRINT");
      } else if (key === "s") {
        e.preventDefault();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "PrintScreen") {
        void logCopyAttemptAction(attemptId, "PRINTSCREEN_SUSPECTED");
      }
    }

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [attemptId]);

  useEffect(() => {
    const node = watermarkRef.current;
    if (!node) return;

    function isTampered() {
      if (!node || !document.body.contains(node)) return true;
      const style = window.getComputedStyle(node);
      return style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0;
    }

    const observer = new MutationObserver(() => {
      if (isTampered() && !locked) {
        setLocked(true);
        void logCopyAttemptAction(attemptId, "WATERMARK_TAMPER");
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    return () => observer.disconnect();
  }, [attemptId, locked]);

  const tiles = Array.from({ length: 80 }, (_, i) => i);

  return (
    <div className="relative">
      {children}

      <div
        ref={watermarkRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      >
        <div
          className="flex flex-wrap content-start gap-x-10 gap-y-10"
          style={{
            position: "absolute",
            top: "-25%",
            left: "-25%",
            width: "150%",
            height: "150%",
            transform: "rotate(-20deg)",
            opacity: 0.07,
          }}
        >
          {tiles.map((i) => (
            <span key={i} className="whitespace-nowrap font-mono text-[13px]" style={{ color: "var(--color-pen)" }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {locked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 px-6 text-center backdrop-blur-sm">
          <div className="max-w-[420px]">
            <div className="mb-3 text-[15px] font-semibold text-red-ink">Đã phát hiện can thiệp vào lớp bảo vệ nội dung</div>
            <p className="mb-6 text-[13.5px] text-muted">
              Sự việc đã được ghi lại. Tải lại trang để tiếp tục làm bài — câu trả lời đã lưu của bạn không bị mất.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-pen px-5 py-2.5 text-[13px] font-semibold text-paper"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
