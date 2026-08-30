"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import type { User } from "@/generated/prisma/client";

const navItems = [
  { label: "Tổng quan", href: "/dashboard", enabled: true },
  { label: "Real Test", href: "/dashboard/real-test", enabled: true },
  { label: "Luyện theo dạng", href: "/dashboard/practice", enabled: false },
  { label: "Question Bank", href: "/dashboard/question-bank", enabled: false },
  { label: "Vocab Notebook", href: "/dashboard/vocab", enabled: false },
];

export function TopNav({ user }: { user: User }) {
  const pathname = usePathname();
  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-[76px] items-center justify-between border-b border-rule px-12">
      <div className="flex items-center gap-14">
        <Link href="/dashboard" className="font-display text-[22px] italic font-semibold text-pen">
          12WSAT
        </Link>
        <nav className="flex h-[76px] items-center gap-8">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            if (!item.enabled) {
              return (
                <span
                  key={item.label}
                  className="flex h-[76px] items-center gap-2 text-[15px] text-muted"
                  title="Sắp ra mắt"
                >
                  {item.label}
                  <span className="border border-rule px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    sắp ra mắt
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex h-[76px] items-center text-[15px] font-medium"
                style={{
                  color: isActive ? "var(--color-ink)" : "var(--color-muted)",
                  borderBottom: isActive ? "2px solid var(--color-pen)" : "2px solid transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
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
