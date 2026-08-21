import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ScoreScaleForm } from "./ScoreScaleForm";
import { AssignmentForm, DeleteAssignmentButton } from "./AssignmentForm";
import { TestLifecycleActions } from "./TestLifecycleActions";

const statusLabel: Record<string, string> = { DRAFT: "Nháp", PUBLISHED: "Đã publish", ARCHIVED: "Đã lưu trữ" };

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [test, cohorts, students] = await Promise.all([
    prisma.test.findUnique({
      where: { id },
      include: {
        modules: { include: { _count: { select: { questions: true } } }, orderBy: { orderIndex: "asc" } },
        scoreScales: true,
        assignments: { include: { cohort: true, user: true }, orderBy: { createdAt: "desc" } },
        laterVersions: { orderBy: { version: "asc" } },
        rootTest: true,
      },
    }),
    prisma.cohort.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "STUDENT" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
  ]);

  if (!test) notFound();

  const rwScale = test.scoreScales.filter((s) => s.section === "READING_WRITING").sort((a, b) => a.rawScore - b.rawScore);
  const mathScale = test.scoreScales.filter((s) => s.section === "MATH").sort((a, b) => a.rawScore - b.rawScore);

  return (
    <div className="max-w-[900px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[26px] font-medium">{test.title}</h1>
            <span className="text-[11px] text-muted">{statusLabel[test.status]}</span>
            {test.version > 1 && <span className="font-mono text-[11px] text-muted">v{test.version}</span>}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {test.modules.length} module · {test.modules.reduce((n, m) => n + m._count.questions, 0)} câu hỏi
            {test.publishedAt && <> · publish lúc {formatDate(test.publishedAt)}</>}
          </p>
        </div>
        <TestLifecycleActions testId={test.id} status={test.status} />
      </div>

      {test.rootTest && (
        <p className="mb-6 text-[12.5px] text-muted">
          Phiên bản mới của{" "}
          <Link href={`/admin/tests/${test.rootTest.id}`} className="text-pen">
            {test.rootTest.title}
          </Link>
        </p>
      )}
      {test.laterVersions.length > 0 && (
        <p className="mb-6 text-[12.5px] text-muted">
          Có phiên bản mới hơn:{" "}
          {test.laterVersions.map((v) => (
            <Link key={v.id} href={`/admin/tests/${v.id}`} className="text-pen">
              v{v.version}{" "}
            </Link>
          ))}
        </p>
      )}

      <section className="border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Bảng quy đổi điểm</h2>
        <div className="flex gap-12">
          <ScoreScaleForm testId={test.id} section="READING_WRITING" label="Reading & Writing (/800)" initialRows={rwScale} />
          <ScoreScaleForm testId={test.id} section="MATH" label="Math (/800)" initialRows={mathScale} />
        </div>
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Giao đề</h2>
        <div className="mb-6 flex flex-col gap-2">
          {test.assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-rule py-2 text-[13px]">
              <span>{a.cohort ? `Nhóm: ${a.cohort.name}` : a.user ? `Học viên: ${a.user.fullName}` : "—"}</span>
              <span className="font-mono text-[12px] text-muted">
                {formatDate(a.openAt)} → {formatDate(a.closeAt)} · tối đa {a.maxAttempts} lượt
              </span>
              <DeleteAssignmentButton id={a.id} />
            </div>
          ))}
          {test.assignments.length === 0 && <p className="text-[13px] text-muted">Chưa giao cho ai.</p>}
        </div>
        <AssignmentForm testId={test.id} cohorts={cohorts} students={students} />
      </section>
    </div>
  );
}
