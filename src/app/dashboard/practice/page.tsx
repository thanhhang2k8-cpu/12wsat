import { requireUser } from "@/lib/auth/session";
import { findMatchingQuestions, distinctDomainsAndSkills, type PracticeFilters } from "@/lib/actions/practice";
import { PracticeBankList } from "./PracticeBankList";

export const dynamic = "force-dynamic";

const sectionLabel: Record<string, string> = { READING_WRITING: "Reading and Writing", MATH: "Math" };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUser();
  const sp = await searchParams;

  const filters: PracticeFilters = {
    section: sp.section === "READING_WRITING" || sp.section === "MATH" ? sp.section : undefined,
    domain: sp.domain || undefined,
    skill: sp.skill || undefined,
    difficulty: sp.difficulty === "EASY" || sp.difficulty === "MEDIUM" || sp.difficulty === "HARD" ? sp.difficulty : undefined,
    onlyWrong: sp.onlyWrong === "1",
  };

  const [{ domains, skills }, { total, questions }] = await Promise.all([
    distinctDomainsAndSkills(),
    findMatchingQuestions(filters),
  ]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">Luyện tập</div>
        <div className="font-display text-[26px] font-medium">Luyện theo dạng &amp; Ngân hàng câu hỏi</div>
        <p className="mb-8 mt-1 text-[13px] text-muted">
          Lọc theo môn/domain/skill, chọn câu muốn luyện — không tính giờ, biết đúng/sai ngay sau mỗi câu.
        </p>

        <form method="get" className="mb-8 grid grid-cols-2 gap-4 border border-rule p-5 sm:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Môn</span>
            <select name="section" defaultValue={filters.section ?? ""} className="border border-rule bg-paper px-2 py-1.5 text-[13px]">
              <option value="">Tất cả</option>
              {Object.entries(sectionLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Domain</span>
            <select name="domain" defaultValue={filters.domain ?? ""} className="border border-rule bg-paper px-2 py-1.5 text-[13px]">
              <option value="">Tất cả</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Skill</span>
            <select name="skill" defaultValue={filters.skill ?? ""} className="border border-rule bg-paper px-2 py-1.5 text-[13px]">
              <option value="">Tất cả</option>
              {skills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted">Độ khó</span>
            <select name="difficulty" defaultValue={filters.difficulty ?? ""} className="border border-rule bg-paper px-2 py-1.5 text-[13px]">
              <option value="">Tất cả</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="col-span-2 flex items-center gap-2 sm:col-span-4">
            <input type="checkbox" name="onlyWrong" value="1" defaultChecked={filters.onlyWrong} className="h-4 w-4" />
            <span className="text-[13px]">Chỉ hiện câu tôi từng làm sai (Sổ lỗi)</span>
          </label>
          <div className="col-span-2 sm:col-span-4">
            <button type="submit" className="border border-pen px-4 py-2 text-[13px] text-pen">
              Lọc
            </button>
          </div>
        </form>

        <PracticeBankList questions={questions} total={total} />
      </div>
    </div>
  );
}
