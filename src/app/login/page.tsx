import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";
import { Squirrel } from "@/components/mascots/Squirrel";
import { Cat } from "@/components/mascots/Cat";
import { ScoreConfetti } from "@/components/mascots/ScoreConfetti";

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
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-6 py-16">
      <ScoreConfetti />

      <Squirrel size={96} blinkDelay="0.3s" className="absolute bottom-[8%] left-[6%] hidden sm:block" />
      <Cat size={96} blinkDelay="1.6s" className="absolute top-[10%] right-[7%] hidden sm:block" />
      <Squirrel size={56} blinkDelay="2.4s" className="absolute bottom-[14%] right-[12%] hidden md:block" />
      <Cat size={54} blinkDelay="0.8s" className="absolute top-[16%] left-[11%] hidden md:block" />

      <div className="relative z-10 w-full max-w-[380px] border border-rule bg-paper px-10 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <Squirrel size={40} blinkDelay="1.1s" bob={false} />
            <div className="font-display text-[28px] italic font-semibold text-pen">12WSAT</div>
            <Cat size={38} blinkDelay="2s" bob={false} />
          </div>
          <p className="text-[13px] text-muted">Tài khoản do mentor cấp — không có trang đăng ký.</p>
        </div>
        <div className="border-t border-rule pt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
