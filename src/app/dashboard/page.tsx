import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { wrongQuestionsDetailed } from "@/lib/actions/practice";

const firstName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await requireUser();
  const now = new Date();

  const [openAssignments, latestAttempt, dueVocabCount, wrongQuestions] = await Promise.all([
    prisma.assignment.count({
      where: {
        OR: [{ userId: user.id }, ...(user.cohortId ? [{ cohortId: user.cohortId }] : [])],
        test: { status: "PUBLISHED" },
        AND: [
          { OR: [{ openAt: null }, { openAt: { lte: now } }] },
          { OR: [{ closeAt: null }, { closeAt: { gte: now } }] },
        ],
      },
    }),
    prisma.attempt.findFirst({
      where: { userId: user.id, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      select: { scaledScoreTotal: true, submittedAt: true, test: { select: { title: true } } },
    }),
    prisma.vocabReview.count({ where: { word: { userId: user.id }, dueAt: { lte: now } } }),
    wrongQuestionsDetailed(),
  ]);

  return (
    <div>
      <h1 className="font-display mb-1 text-[34px] italic font-medium">Chào, {firstName(user.fullName)}</h1>
      <p className="mb-10 text-[14px] text-muted">Tổng quan luyện thi SAT của bạn — cập nhật theo thời gian thực.</p>

      <div className="mb-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <StatCard label="Đề đang mở" value={openAssignments} />
        <StatCard label="Điểm gần nhất" value={latestAttempt?.scaledScoreTotal ?? "—"} />
        <StatCard label="Từ đến hạn ôn" value={dueVocabCount} accent={dueVocabCount > 0} />
        <StatCard label="Câu đang sai" value={wrongQuestions.length} accent={wrongQuestions.length > 0} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickLink href="/dashboard/real-test" label="Real Test" desc="Làm đề đầy đủ, tính giờ" />
        <QuickLink href="/dashboard/practice" label="Luyện tập" desc="Theo dạng / Question Bank" />
        <QuickLink href="/dashboard/vocab" label="Vocab Notebook" desc="Ôn từ vựng SM-2" />
        <QuickLink href="/dashboard/wrong-answers" label="Sổ lỗi" desc="Xem lại câu sai" />
      </div>

      {latestAttempt && (
        <p className="mt-10 text-[13px] text-muted">
          Bài gần nhất: <span className="text-ink">{latestAttempt.test.title}</span>
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="border border-rule px-5 py-4">
      <div className="font-display text-[28px] font-medium" style={{ color: accent ? "var(--color-pen)" : "var(--color-ink)" }}>
        {value}
      </div>
      <div className="mt-1 text-[12px] text-muted">{label}</div>
    </div>
  );
}

function QuickLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link href={href} className="border-t-2 border-pen px-1 py-4">
      <div className="text-[15px] font-semibold">{label}</div>
      <div className="mt-1 text-[12.5px] text-muted">{desc}</div>
    </Link>
  );
}
