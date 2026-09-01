import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { wrongQuestionsDetailed } from "@/lib/actions/practice";
import { GoalCard } from "./GoalCard";

const firstName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await requireUser();
  const now = new Date();

  const [openAssignments, latestAttempt, dueVocabCount, wrongQuestions, recentAttempts, recentPracticeSets] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        OR: [{ userId: user.id }, ...(user.cohortId ? [{ cohortId: user.cohortId }] : [])],
        test: { status: "PUBLISHED", type: "FULL_TEST" },
        AND: [
          { OR: [{ openAt: null }, { openAt: { lte: now } }] },
          { OR: [{ closeAt: null }, { closeAt: { gte: now } }] },
        ],
      },
      include: { test: { select: { title: true } } },
      orderBy: { closeAt: "asc" },
      take: 5,
    }),
    prisma.attempt.findFirst({
      where: { userId: user.id, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      select: { scaledScoreTotal: true, submittedAt: true, test: { select: { title: true } } },
    }),
    prisma.vocabReview.count({ where: { word: { userId: user.id }, dueAt: { lte: now } } }),
    wrongQuestionsDetailed(),
    prisma.attempt.findMany({
      where: { userId: user.id, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { id: true, scaledScoreTotal: true, submittedAt: true, test: { select: { title: true } } },
    }),
    prisma.practiceSet.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: { id: true, questionIds: true, completedAt: true },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display mb-1 text-[34px] italic font-medium">Chào, {firstName(user.fullName)}</h1>
      <p className="mb-8 text-[14px] text-muted">Tổng quan luyện thi SAT của bạn — cập nhật theo thời gian thực.</p>

      <GoalCard targetScore={user.targetScore} targetExamDate={user.targetExamDate} />

      <div className="mb-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
        <StatCard label="Đề đang mở" value={openAssignments.length} />
        <StatCard label="Điểm gần nhất" value={latestAttempt?.scaledScoreTotal ?? "—"} />
        <StatCard label="Từ đến hạn ôn" value={dueVocabCount} accent={dueVocabCount > 0} />
        <StatCard label="Câu đang sai" value={wrongQuestions.length} accent={wrongQuestions.length > 0} />
      </div>

      {wrongQuestions.length > 0 && (
        <Link
          href="/dashboard/wrong-answers"
          className="mb-10 block border border-red-ink px-5 py-3 text-[13.5px]"
          style={{ color: "var(--color-red-ink)" }}
        >
          Bạn đang có {wrongQuestions.length} câu làm sai chưa ôn lại — bấm để xem sổ lỗi →
        </Link>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickLink href="/dashboard/real-test" label="Real Test" desc="Làm đề đầy đủ, tính giờ" />
        <QuickLink href="/dashboard/practice" label="Luyện tập" desc="Theo dạng / Question Bank" />
        <QuickLink href="/dashboard/vocab" label="Vocab Notebook" desc="Ôn từ vựng SM-2" />
        <QuickLink href="/dashboard/wrong-answers" label="Sổ lỗi" desc="Xem lại câu sai" />
      </div>

      <section className="mt-14 border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Cần làm hôm nay</h2>
        <div className="flex flex-col">
          {openAssignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b border-rule py-3 text-[13.5px]">
              <span>{a.test.title}</span>
              <span className="font-mono text-[12px] text-muted">
                {a.closeAt ? `Hạn chót: ${formatDate(a.closeAt)}` : "Không có hạn"}
              </span>
            </div>
          ))}
          {dueVocabCount > 0 && (
            <div className="flex items-center justify-between border-b border-rule py-3 text-[13.5px]">
              <span>Ôn {dueVocabCount} từ vựng đến hạn</span>
              <Link href="/dashboard/vocab/review" className="text-[12px] text-pen">
                Ôn ngay →
              </Link>
            </div>
          )}
          {openAssignments.length === 0 && dueVocabCount === 0 && (
            <p className="border-b border-rule py-6 text-center text-[13px] text-muted">Không có việc gì cần làm gấp hôm nay — nghỉ ngơi hoặc luyện thêm tuỳ bạn.</p>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Đã làm gần đây</h2>
        <div className="flex flex-col">
          {recentAttempts.map((a) => (
            <Link
              key={a.id}
              href={`/attempts/${a.id}/results`}
              className="flex items-center justify-between border-b border-rule py-3 text-[13.5px]"
            >
              <span>{a.test.title}</span>
              <span className="flex items-center gap-4">
                <span className="font-mono text-[13px] font-semibold">{a.scaledScoreTotal}</span>
                <span className="font-mono text-[11.5px] text-muted">{a.submittedAt && formatDate(a.submittedAt)}</span>
              </span>
            </Link>
          ))}
          {recentPracticeSets.map((p) => (
            <div key={p.id} className="flex items-center justify-between border-b border-rule py-3 text-[13.5px] text-muted">
              <span>Luyện tập — {(p.questionIds as string[]).length} câu</span>
              <span className="font-mono text-[11.5px]">{p.completedAt && formatDate(p.completedAt)}</span>
            </div>
          ))}
          {recentAttempts.length === 0 && recentPracticeSets.length === 0 && (
            <p className="border-b border-rule py-6 text-center text-[13px] text-muted">Chưa làm bài nào.</p>
          )}
        </div>
      </section>
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
