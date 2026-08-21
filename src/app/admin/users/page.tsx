import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "./CreateUserForm";

export default async function AdminUsersPage() {
  const [users, cohorts] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { cohort: true, _count: { select: { devices: { where: { revokedAt: null } } } } },
    }),
    prisma.cohort.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-[1000px]">
      <h1 className="font-display text-[26px] font-medium">Học viên</h1>
      <p className="mt-1 text-[13px] text-muted">
        Tài khoản chỉ được tạo ở đây. Không có trang đăng ký công khai.
      </p>

      <table className="mt-8 w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-rule text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="pb-2 font-medium">Họ tên</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Nhóm</th>
            <th className="pb-2 font-medium">Trạng thái</th>
            <th className="pb-2 font-medium">Thiết bị</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-rule">
              <td className="py-2.5">{u.fullName}</td>
              <td className="py-2.5 font-mono text-[12.5px] text-muted">{u.email}</td>
              <td className="py-2.5">{u.cohort?.name ?? "—"}</td>
              <td className="py-2.5">
                {u.status === "ACTIVE" ? (
                  <span className="border border-chalk-green px-2 py-0.5 text-[11px] text-chalk-green">
                    Hoạt động
                  </span>
                ) : (
                  <span className="border border-red-ink px-2 py-0.5 text-[11px] text-red-ink">
                    Đã khoá
                  </span>
                )}
              </td>
              <td className="py-2.5 font-mono text-muted">
                {u._count.devices} / {u.maxDevices}
              </td>
              <td className="py-2.5 text-right">
                <Link href={`/admin/users/${u.id}`} className="text-pen">
                  Quản lý →
                </Link>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-muted">
                Chưa có học viên nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-14 border-t border-rule pt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide">Tạo tài khoản mới</h2>
        <div className="mt-6">
          <CreateUserForm cohorts={cohorts} />
        </div>
      </div>
    </div>
  );
}
