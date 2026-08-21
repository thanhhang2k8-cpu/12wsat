"use client";

export function SourceViewer({
  sourceUrl,
  sourceMimeType,
  sourceFileName,
}: {
  sourceUrl: string | null;
  sourceMimeType: string | null;
  sourceFileName: string | null;
}) {
  if (!sourceUrl) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-muted">
        Không có file gốc.
      </div>
    );
  }

  if (sourceMimeType === "image/png" || sourceMimeType === "image/jpeg") {
    return (
      <div className="h-full overflow-auto bg-tint p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sourceUrl} alt={sourceFileName ?? "Ảnh đề gốc"} className="max-w-none" />
      </div>
    );
  }

  if (sourceMimeType === "application/pdf") {
    return <iframe src={sourceUrl} title={sourceFileName ?? "Đề gốc"} className="h-full w-full border-0" />;
  }

  return (
    <div className="flex h-full items-center justify-center text-[13px] text-muted">
      {sourceFileName} (DOCX — xem nội dung đã trích xuất bên phải)
    </div>
  );
}
