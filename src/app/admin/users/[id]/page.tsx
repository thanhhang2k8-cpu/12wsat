import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditUserForm } from "./EditUserForm";
import { ResetPasswordForm } from "./ResetPasswordForm";
import { DangerZone } from "./DangerZone";
import { RevokeDeviceButton } from "./RevokeDeviceButton";

function toDateInputValue(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, cohorts] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        devices: { orderBy: { lastSeenAt: "desc" } },
        loginLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    }),
    prisma.cohort.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!user) notFound();

  const activeDevices = user.devices.filter((d) => !d.revokedAt);
  const revokedDevices = user.devices.filter((d) => d.revokedAt);

  return (
    <div className="max-w-[900px]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium">{user.fullName}</h1>
          <p className="mt-1 font-mono text-[13px] text-muted">{user.email}</p>
        </div>
        <DangerZone userId={user.id} status={user.status} />
      </div>

      <section className="border-t border-rule pt-8">
        <h2 className="mb-6 text-[13px] font-semibold uppercase tracking-wide">Thông tin tài khoản</h2>
        <EditUserForm
          userId={user.id}
          fullName={user.fullName}
          note={user.note}
          cohortId={user.cohortId}
          maxDevices={user.maxDevices}
          expiresAt={toDateInputValue(user.expiresAt)}
          cohorts={cohorts}
        />
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Mật khẩu</h2>
        <ResetPasswordForm userId={user.id} />
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">
          Thiết bị ({activeDevices.length} / {user.maxDevices})
        </h2>
        <div className="flex flex-col">
          {activeDevices.map((d) => (
            <div key={d.id} className="flex items-center justify-between border-b border-rule py-3">
              <div>
                <div className="text-[14px]">{d.label}</div>
                <div className="mt-0.5 text-[12px] text-muted">
                  IP gần nhất {d.lastIp ?? "—"} · lần cuối {formatDateTime(d.lastSeenAt)}
                </div>
              </div>
              <RevokeDeviceButton deviceId={d.id} />
            </div>
          ))}
          {activeDevices.length === 0 && (
            <p className="py-3 text-[13px] text-muted">Chưa có thiết bị nào đăng nhập.</p>
          )}
        </div>

        {revokedDevices.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-[12.5px] text-muted">
              {revokedDevices.length} thiết bị đã gỡ
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {revokedDevices.map((d) => (
                <div key={d.id} className="text-[12.5px] text-muted">
                  {d.label} — gỡ lúc {d.revokedAt ? formatDateTime(d.revokedAt) : "—"}
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide">Lịch sử đăng nhập</h2>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-rule text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="pb-2 font-medium">Thời gian</th>
              <th className="pb-2 font-medium">Kết quả</th>
              <th className="pb-2 font-medium">IP</th>
              <th className="pb-2 font-medium">Thiết bị</th>
            </tr>
          </thead>
          <tbody>
            {user.loginLogs.map((log) => (
              <tr key={log.id} className="border-b border-rule">
                <td className="py-2 font-mono text-[12.5px]">{formatDateTime(log.createdAt)}</td>
                <td className="py-2">
                  {log.success ? (
                    <span className="text-chalk-green">Thành công</span>
                  ) : (
                    <span className="text-red-ink">{log.reason ?? "Thất bại"}</span>
                  )}
                </td>
                <td className="py-2 font-mono text-[12.5px] text-muted">{log.ip ?? "—"}</td>
                <td className="py-2 text-[12.5px] text-muted">{log.userAgent ?? "—"}</td>
              </tr>
            ))}
            {user.loginLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-muted">
                  Chưa có lượt đăng nhập nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
