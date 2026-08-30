import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resumeOrStartAttemptAction } from "@/lib/actions/attempt";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function RealTestListPage() {
  const { user } = await requireUser();
  const now = new Date();

  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [{ userId: user.id }, ...(user.cohortId ? [{ cohortId: user.cohortId }] : [])],
      test: { status: "PUBLISHED" },
    },
    include: { test: true },
    orderBy: { createdAt: "desc" },
  });

  const testIds = assignments.map((a) => a.testId);
  const attempts = await prisma.attempt.findMany({
    where: { userId: user.id, testId: { in: testIds } },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="max-w-[900px]">
      <h1 className="font-display text-[26px] font-medium">Real Test SAT</h1>
      <p className="mt-1 text-[13px] text-muted">Mô phỏng bài thi Digital SAT — có tính thời gian, adaptive.</p>

      <div className="mt-8 flex flex-col">
        {assignments.map((a) => {
          const attemptsForTest = attempts.filter((x) => x.testId === a.testId);
          const inProgress = attemptsForTest.find((x) => x.status === "IN_PROGRESS");
          const isOpen = (!a.openAt || a.openAt <= now) && (!a.closeAt || a.closeAt >= now);
          const usedUp = attemptsForTest.length >= a.maxAttempts;

          return (
            <div key={a.id} className="flex items-center justify-between border-t border-rule py-5">
              <div>
                <div className="text-[15px] font-medium">{a.test.title}</div>
                <div className="mt-1 text-[12px] text-muted">
                  {a.test.timedMode === "TIMED" ? "Có tính thời gian" : "Không giới hạn thời gian"} ·{" "}
                  {a.closeAt ? `Đóng lúc ${formatDate(a.closeAt)}` : "Không có hạn đóng"} · Đã làm{" "}
                  {attemptsForTest.length}/{a.maxAttempts} lượt
                </div>
              </div>

              {!isOpen ? (
                <span className="text-[13px] text-muted">Chưa mở hoặc đã đóng</span>
              ) : inProgress ? (
                <Link href={`/attempts/${inProgress.id}`} className="border border-pen px-4 py-2 text-[13px] font-medium text-pen">
                  Tiếp tục làm →
                </Link>
              ) : usedUp ? (
                <Link
                  href={`/attempts/${attemptsForTest[0].id}/results`}
                  className="text-[13px] text-pen"
                >
                  Xem kết quả gần nhất →
                </Link>
              ) : (
                <form action={resumeOrStartAttemptAction.bind(null, a.testId)}>
                  <button type="submit" className="bg-pen px-4 py-2 text-[13px] font-semibold text-paper">
                    Bắt đầu làm bài
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {assignments.length === 0 && (
          <p className="border-t border-rule py-6 text-center text-[13px] text-muted">
            Bạn chưa được giao đề Real Test nào.
          </p>
        )}
      </div>
    </div>
  );
}
