import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/auth";
import { SessionWatcher } from "@/components/layout/SessionWatcher";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireRole("ADMIN");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SessionWatcher />
      <div className="flex h-[76px] items-center justify-between border-b border-rule px-12">
        <div className="flex items-center gap-10">
          <Link href="/admin" className="font-display text-[22px] italic font-semibold text-pen">
            12WSAT <span className="font-ui not-italic text-[13px] font-normal text-muted">/ Admin</span>
          </Link>
          <nav className="flex items-center gap-6 text-[14px]">
            <Link href="/admin/users" className="text-ink hover:text-pen">
              Học viên
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-muted">{user.fullName}</span>
          <form action={logoutAction}>
            <button type="submit" className="text-[13px] text-muted hover:text-ink">
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
      <div className="flex-1 px-12 py-10">{children}</div>
    </div>
  );
}
