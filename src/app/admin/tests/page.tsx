import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "./UploadForm";

// AI parse runs synchronously inside uploadTestsAction (a Server Action on
// this page) — a full multi-page test can take well over the platform
// default (10s). 60s is the max Vercel Hobby allows; upgrade the plan or
// move parsing to a background job if a single upload still times out.
export const maxDuration = 60;

const statusLabel: Record<string, { text: string; color: string }> = {
  DRAFT: { text: "Nháp", color: "var(--color-muted)" },
  PUBLISHED: { text: "Đã publish", color: "var(--color-chalk-green)" },
  ARCHIVED: { text: "Đã lưu trữ", color: "var(--color-muted)" },
};

export default async function AdminTestsPage() {
  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { modules: true } },
      modules: { select: { questions: { select: { needsReview: true } } } },
    },
  });

  return (
    <div className="max-w-[1000px]">
      <h1 className="font-display text-[26px] font-medium">Đề thi</h1>
      <p className="mt-1 text-[13px] text-muted">
        Upload → AI quét → duyệt câu bị gắn cờ → publish.
      </p>

      <div className="mt-8 border border-rule p-8">
        <UploadForm />
      </div>

      <table className="mt-10 w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-rule text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="pb-2 font-medium">Tên đề</th>
            <th className="pb-2 font-medium">Trạng thái</th>
            <th className="pb-2 font-medium">Câu hỏi</th>
            <th className="pb-2 font-medium">Cần kiểm tra</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => {
            const questions = t.modules.flatMap((m) => m.questions);
            const flagged = questions.filter((q) => q.needsReview).length;
            const status = statusLabel[t.status];
            return (
              <tr key={t.id} className="border-b border-rule">
                <td className="py-2.5">{t.title}</td>
                <td className="py-2.5" style={{ color: status.color }}>
                  {status.text}
                </td>
                <td className="py-2.5 font-mono text-muted">{questions.length}</td>
                <td className="py-2.5 font-mono" style={{ color: flagged > 0 ? "var(--color-red-ink)" : "var(--color-muted)" }}>
                  {flagged}
                </td>
                <td className="py-2.5 text-right">
                  <Link href={t.status === "DRAFT" ? `/admin/tests/${t.id}/review` : `/admin/tests/${t.id}`} className="text-pen">
                    {t.status === "DRAFT" ? "Xem lại →" : "Quản lý →"}
                  </Link>
                </td>
              </tr>
            );
          })}
          {tests.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted">
                Chưa có đề nào — tải lên một file ở trên.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
