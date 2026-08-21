import { requireUser } from "@/lib/auth/session";

const firstName = (fullName: string) => fullName.trim().split(/\s+/).pop() ?? fullName;

export default async function DashboardPage() {
  const { user } = await requireUser();

  return (
    <div>
      <div className="mb-10">
        <h1 className="font-display text-[34px] italic font-medium">
          Chào, {firstName(user.fullName)}
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Đây là bản dựng Phase 2 — mentor đã có thể upload/AI-parse/duyệt/publish đề, nhưng
          màn hình làm bài cho học viên vẫn chưa có.
        </p>
      </div>

      <div className="border-t border-b border-rule py-6">
        <p className="text-[14px] leading-relaxed text-muted">
          Real Test, Luyện theo dạng, Question Bank, Vocab Notebook và Sổ lỗi sẽ có ở Phase 3
          trở đi, khi màn hình làm bài (timer, adaptive, chấm điểm) được xây xong. Trang này sẽ
          tự hiện tiến độ, bài mentor giao và điểm gần nhất ngay khi bạn làm được bài đầu tiên.
        </p>
      </div>
    </div>
  );
}
