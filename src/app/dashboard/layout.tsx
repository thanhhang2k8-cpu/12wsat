import { requireUser } from "@/lib/auth/session";
import { TopNav } from "@/components/layout/TopNav";
import { SessionWatcher } from "@/components/layout/SessionWatcher";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SessionWatcher />
      <TopNav user={user} />
      <div className="flex flex-1">
        <div className="relative w-16 shrink-0">
          <div className="absolute inset-y-0 left-12 w-0.5 bg-pen" />
        </div>
        <div className="flex-1 px-14 py-10">{children}</div>
      </div>
    </div>
  );
}
