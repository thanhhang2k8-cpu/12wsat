import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { WrongAnswerRow } from "./WrongAnswerRow";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}` : `${m}:${s.toString().padStart(2, "0")}`;
}

const sectionLabel: Record<string, string> = { READING_WRITING: "Reading and Writing", MATH: "Math" };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { test: true, tabSwitches: true },
  });
  if (!attempt) notFound();
  if (attempt.userId !== user.id) notFound();
  if (attempt.status !== "SUBMITTED") redirect(`/attempts/${id}`);

  const answers = await prisma.attemptAnswer.findMany({
    where: { attemptId: id },
    include: { question: { include: { module: true } } },
  });

  const domainStats = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const domain = a.question.domain ?? "Chưa phân loại";
    const entry = domainStats.get(domain) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (a.isCorrect) entry.correct += 1;
    domainStats.set(domain, entry);
  }

  const wrongAnswers = answers
    .filter((a) => a.isCorrect === false)
    .sort((a, b) => a.question.number - b.question.number);

  const scaledBySection = (attempt.scaledScoreBySection as Record<string, number> | null) ?? {};
  const totalScore = attempt.scaledScoreTotal ?? 0;
  const pct = Math.min(100, Math.max(0, ((totalScore - 400) / 1200) * 100));
  const ticks = [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600];

  const durationMs = attempt.submittedAt ? attempt.submittedAt.getTime() - attempt.startedAt.getTime() : 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex h-[76px] items-center justify-between border-b border-rule px-12">
        <div className="font-display text-[22px] italic font-semibold text-pen">12WSAT</div>
        <Link href="/dashboard/real-test" className="text-[13px] text-pen">
          Quay lại danh sách
        </Link>
      </div>

      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">Kết quả bài thi</div>
        <div className="font-display text-[26px] font-medium">{attempt.test.title}</div>
        <div className="mb-11 mt-1 text-[13px] text-muted">Hoàn thành {formatDate(attempt.submittedAt)}</div>

        <div className="mb-12 border-t border-b border-rule py-9">
          <div className="mb-8 flex items-baseline gap-3.5">
            <span data-testid="total-score" className="font-display text-[64px] font-medium leading-none">{totalScore}</span>
            <span className="font-mono text-[18px] text-muted">/ 1600</span>
          </div>
          <div className="relative h-14 w-full max-w-[900px]">
            <div className="absolute top-6 right-0 left-0 h-0.5 bg-ink" />
            {ticks.map((t) => {
              const tPct = ((t - 400) / 1200) * 100;
              return (
                <div key={t}>
                  <div className="absolute font-mono text-[10px] text-muted" style={{ top: 36, left: `${tPct}%`, transform: "translateX(-50%)" }}>
                    {t}
                  </div>
                  <div className="absolute w-px bg-ink" style={{ top: 24, height: t % 200 === 0 ? 10 : 6, left: `${tPct}%` }} />
                </div>
              );
            })}
            <div className="absolute h-3.5 w-0.5 bg-pen" style={{ left: `${pct}%`, top: 14, transform: "translateX(-1px)" }} />
            <div className="absolute h-2 w-2 rounded-full bg-pen" style={{ left: `${pct}%`, top: 2, transform: "translateX(-4px)" }} />
          </div>
        </div>

        <div className="mb-14 grid grid-cols-2 gap-16">
          {Object.entries(sectionLabel).map(([key, label]) => {
            const score = scaledBySection[key];
            if (score === undefined) return null;
            return (
              <div key={key}>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold">{label}</span>
                  <span className="font-mono text-[20px] font-semibold">
                    {score}
                    <span className="text-[12px] font-normal text-muted"> / 800</span>
                  </span>
                </div>
                <div className="relative h-1.5 bg-tint">
                  <div className="absolute inset-y-0 left-0 bg-pen" style={{ width: `${((score - 200) / 600) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-14">
          <div className="mb-5 text-[13px] font-semibold uppercase tracking-wide">Phân tích theo domain</div>
          <div className="flex flex-col">
            {Array.from(domainStats.entries()).map(([domain, stat]) => {
              const domainPct = Math.round((stat.correct / stat.total) * 100);
              return (
                <div key={domain} className="flex items-center border-t border-rule py-2.5">
                  <div className="w-[220px] shrink-0 text-[13px]">{domain}</div>
                  <div className="relative mx-3.5 h-2 flex-1 bg-tint">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${domainPct}%`, background: domainPct >= 70 ? "var(--color-chalk-green)" : "var(--color-red-ink)" }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-right font-mono text-[12.5px]">{domainPct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wide">
              Câu sai <span className="font-mono font-normal normal-case tracking-normal text-muted">({wrongAnswers.length})</span>
            </span>
          </div>
          <div className="border-t border-rule">
            {wrongAnswers.map((a) => (
              <WrongAnswerRow
                key={a.id}
                number={a.question.number}
                domain={a.question.domain ?? "Chưa phân loại"}
                section={a.question.module.section}
                explanationMd={a.question.explanationMd}
              />
            ))}
            {wrongAnswers.length === 0 && <p className="py-6 text-center text-[13px] text-muted">Không có câu nào sai — xuất sắc!</p>}
          </div>
        </div>

        <div className="flex gap-12 border-t border-rule pt-5">
          <div>
            <div className="mb-1.5 text-[11px] text-muted">Tổng thời gian làm bài</div>
            <div className="font-mono text-[16px] font-semibold">{formatDuration(durationMs)}</div>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] text-muted">Số lần rời tab trong lúc thi</div>
            <div className="font-mono text-[16px] font-semibold">{attempt.tabSwitches.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
