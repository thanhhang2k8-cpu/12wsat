import { prisma } from "@/lib/prisma";

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

export default async function AdminAnalyticsPage() {
  const [students, attemptAnswers, practiceAttempts, recentLogins] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      include: {
        cohort: true,
        attempts: { where: { status: "SUBMITTED" }, select: { scaledScoreTotal: true, submittedAt: true } },
        sessions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.attemptAnswer.findMany({
      where: { isCorrect: { not: null } },
      select: { isCorrect: true, question: { select: { domain: true } } },
    }),
    prisma.practiceAttempt.findMany({
      select: { isCorrect: true, question: { select: { domain: true } } },
    }),
    prisma.loginLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { emailTried: true, success: true, reason: true, ip: true, createdAt: true },
    }),
  ]);

  const domainStats = new Map<string, { correct: number; total: number }>();
  for (const a of [...attemptAnswers, ...practiceAttempts]) {
    const domain = a.question.domain ?? "Chưa phân loại";
    const entry = domainStats.get(domain) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.isCorrect) entry.correct += 1;
    domainStats.set(domain, entry);
  }
  const domainRows = Array.from(domainStats.entries()).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="max-w-[1100px]">
      <h1 className="font-display text-[26px] font-medium">Phân tích</h1>
      <p className="mt-1 mb-10 text-[13px] text-muted">Tiến độ học viên, độ chính xác theo domain, hoạt động đăng nhập gần đây.</p>

      <div className="mb-14">
        <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Học viên</div>
        <div className="border-t border-rule">
          <div className="grid grid-cols-[1fr_140px_110px_110px_140px] gap-3 border-b border-rule py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            <span>Tên</span>
            <span>Nhóm</span>
            <span className="text-right">Lượt nộp</span>
            <span className="text-right">Điểm gần nhất</span>
            <span className="text-right">Đăng nhập gần nhất</span>
          </div>
          {students.map((s) => {
            const submitted = s.attempts.filter((a) => a.scaledScoreTotal != null);
            const latest = submitted[submitted.length - 1];
            return (
              <div key={s.id} className="grid grid-cols-[1fr_140px_110px_110px_140px] gap-3 border-b border-rule py-2.5 text-[13px]">
                <span>{s.fullName}</span>
                <span className="text-muted">{s.cohort?.name ?? "—"}</span>
                <span className="text-right font-mono">{submitted.length}</span>
                <span className="text-right font-mono">{latest?.scaledScoreTotal ?? "—"}</span>
                <span className="text-right font-mono text-[11.5px] text-muted">
                  {s.sessions[0] ? formatDateTime(s.sessions[0].createdAt) : "chưa từng"}
                </span>
              </div>
            );
          })}
          {students.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Chưa có học viên nào.</p>}
        </div>
      </div>

      <div className="mb-14">
        <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Độ chính xác theo domain (toàn hệ thống)</div>
        <div className="flex flex-col">
          {domainRows.map(([domain, stat]) => {
            const pct = Math.round((stat.correct / stat.total) * 100);
            return (
              <div key={domain} className="flex items-center border-t border-rule py-2.5">
                <div className="w-[240px] shrink-0 text-[13px]">{domain}</div>
                <div className="relative mx-3.5 h-2 flex-1 bg-tint">
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${pct}%`, background: pct >= 70 ? "var(--color-chalk-green)" : "var(--color-red-ink)" }}
                  />
                </div>
                <div className="w-24 shrink-0 text-right font-mono text-[12.5px] text-muted">
                  {pct}% ({stat.correct}/{stat.total})
                </div>
              </div>
            );
          })}
          {domainRows.length === 0 && <p className="border-t border-rule py-6 text-center text-[13px] text-muted">Chưa có dữ liệu.</p>}
        </div>
      </div>

      <div>
        <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Hoạt động đăng nhập gần đây</div>
        <div className="border-t border-rule">
          <div className="grid grid-cols-[140px_1fr_90px_140px_140px] gap-3 border-b border-rule py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            <span>Thời gian</span>
            <span>Email</span>
            <span>Kết quả</span>
            <span>Lý do</span>
            <span>IP</span>
          </div>
          {recentLogins.map((l, i) => (
            <div key={i} className="grid grid-cols-[140px_1fr_90px_140px_140px] gap-3 border-b border-rule py-2 text-[12.5px]">
              <span className="font-mono text-muted">{formatDateTime(l.createdAt)}</span>
              <span>{l.emailTried}</span>
              <span style={{ color: l.success ? "var(--color-chalk-green)" : "var(--color-red-ink)" }}>
                {l.success ? "Thành công" : "Thất bại"}
              </span>
              <span className="text-muted">{l.reason ?? "—"}</span>
              <span className="font-mono text-muted">{l.ip ?? "—"}</span>
            </div>
          ))}
          {recentLogins.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Chưa có log đăng nhập nào.</p>}
        </div>
      </div>
    </div>
  );
}
