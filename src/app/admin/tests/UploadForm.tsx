"use client";

import { useActionState, useRef, useState } from "react";
import { uploadTestsAction, type FormState } from "@/lib/actions/admin-tests";

const initialState: FormState = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadTestsAction, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function setFiles(files: FileList | null) {
    if (!files || !inputRef.current) return;
    const dt = new DataTransfer();
    Array.from(files).forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
    setFileNames(Array.from(files).map((f) => f.name));
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          setFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer border border-dashed px-6 py-10 text-center transition-colors"
        style={{ borderColor: dragOver ? "var(--color-pen)" : "var(--color-rule)" }}
      >
        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))}
        />
        {fileNames.length === 0 ? (
          <>
            <div className="text-[14px]">Kéo thả PDF / DOCX / ảnh chụp đề vào đây, hoặc bấm để chọn file</div>
            <div className="mt-1 text-[12px] text-muted">Được nhiều file cùng lúc — mỗi file tạo một đề riêng</div>
          </>
        ) : (
          <ul className="text-[13px]">
            {fileNames.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      {state.error && <p className="text-[13px] text-red-ink">{state.error}</p>}

      <div>
        <button
          type="submit"
          disabled={pending || fileNames.length === 0}
          className="bg-pen px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Đang quét bằng AI…" : "Tải lên và quét bằng AI"}
        </button>
      </div>
    </form>
  );
}
