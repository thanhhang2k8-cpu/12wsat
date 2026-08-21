import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập — 12WSAT",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 text-center">
          <div className="font-display text-[26px] italic font-semibold text-pen">12WSAT</div>
          <p className="mt-2 text-[13px] text-muted">
            Tài khoản do mentor cấp — không có trang đăng ký.
          </p>
        </div>
        <div className="border-t border-rule pt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
