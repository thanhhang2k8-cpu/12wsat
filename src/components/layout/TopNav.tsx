import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";
import type { User } from "@/generated/prisma/client";

const comingSoon = ["Real Test", "Luyện theo dạng", "Question Bank", "Vocab Notebook"];

export function TopNav({ user }: { user: User }) {
  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-[76px] items-center justify-between border-b border-rule px-12">
      <div className="flex items-center gap-14">
        <Link href="/dashboard" className="font-display text-[22px] italic font-semibold text-pen">
          12WSAT
        </Link>
        <nav className="flex h-[76px] items-center gap-8">
          <span className="flex h-[76px] items-center border-b-2 border-pen text-[15px] font-medium text-ink">
            Tổng quan
          </span>
          {comingSoon.map((label) => (
            <span
              key={label}
              className="flex h-[76px] items-center gap-2 text-[15px] text-muted"
              title="Sắp ra mắt"
            >
              {label}
              <span className="border border-rule px-1.5 py-0.5 font-mono text-[10px] text-muted">
                sắp ra mắt
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[13px] text-muted">
          {user.role === "ADMIN" ? "Admin" : "Học viên"}: <span className="text-ink">{user.fullName}</span>
        </span>
        <div className="h-8 w-px bg-rule" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pen text-[13px] font-semibold text-paper">
          {initial}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-[13px] text-muted hover:text-ink">
            Đăng xuất
          </button>
        </form>
      </div>
    </div>
  );
}
