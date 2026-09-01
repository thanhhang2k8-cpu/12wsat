import { requireUser } from "@/lib/auth/session";
import { wrongQuestionsDetailed } from "@/lib/actions/practice";
import { WrongAnswerRow } from "@/components/WrongAnswerRow";
import { PracticeAgainButton } from "./PracticeAgainButton";

export const dynamic = "force-dynamic";

export default async function WrongAnswersPage() {
  await requireUser();
  const wrongQuestions = await wrongQuestionsDetailed();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[900px] px-6 py-10">
        <div className="mb-1 text-[12px] uppercase tracking-wide text-muted">Sổ lỗi</div>
        <div className="font-display mb-1 text-[26px] font-medium">Các câu đang làm sai</div>
        <p className="mb-8 text-[13px] text-muted">
          Tính theo lần làm gần nhất của mỗi câu (Real Test hoặc luyện tập) — làm đúng lại sẽ tự biến mất khỏi danh sách này.
        </p>

        {wrongQuestions.length === 0 ? (
          <p className="border border-rule px-4 py-10 text-center text-[13px] text-muted">
            Không có câu nào đang sai — sổ lỗi trống, xuất sắc!
          </p>
        ) : (
          <>
            <div className="mb-5">
              <PracticeAgainButton questionIds={wrongQuestions.map((q) => q.id)} />
            </div>
            <div className="border-t border-rule">
              {wrongQuestions.map((q) => (
                <WrongAnswerRow key={q.id} number={q.number} domain={q.domain} section={q.section} explanationMd={q.explanationMd} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
