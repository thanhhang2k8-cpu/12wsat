"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/lib/validation";

export type FormState = { error?: string; ok?: string };

async function resolveCohortId(cohortId?: string, newCohortName?: string): Promise<string | null> {
  const name = newCohortName?.trim();
  if (name) {
    const cohort = await prisma.cohort.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    return cohort.id;
  }
  return cohortId && cohortId.length > 0 ? cohortId : null;
}

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    password: formData.get("password"),
    note: formData.get("note") ?? undefined,
    cohortId: formData.get("cohortId") ?? undefined,
    newCohortName: formData.get("newCohortName") ?? undefined,
    maxDevices: formData.get("maxDevices") ?? 2,
    expiresAt: formData.get("expiresAt") ?? undefined,
    role: formData.get("role") ?? "STUDENT",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "Email này đã được dùng cho một tài khoản khác." };
  }

  const cohortId = await resolveCohortId(data.cohortId, data.newCohortName);
  const passwordHash = await hashPassword(data.password);

  await prisma.user.create({
    data: {
      email: data.email,
      fullName: data.fullName,
      passwordHash,
      note: data.note || null,
      cohortId,
      maxDevices: data.maxDevices,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      role: data.role,
    },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    note: formData.get("note") ?? undefined,
    cohortId: formData.get("cohortId") ?? undefined,
    newCohortName: formData.get("newCohortName") ?? undefined,
    maxDevices: formData.get("maxDevices"),
    expiresAt: formData.get("expiresAt") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;
  const cohortId = await resolveCohortId(data.cohortId, data.newCohortName);

  await prisma.user.update({
    where: { id: data.userId },
    data: {
      fullName: data.fullName,
      note: data.note || null,
      cohortId,
      maxDevices: data.maxDevices,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  revalidatePath(`/admin/users/${data.userId}`);
  revalidatePath("/admin/users");
  return { ok: "Đã lưu." };
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Mật khẩu không hợp lệ." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash },
  });

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { ok: "Đã đặt lại mật khẩu." };
}

async function revokeAllSessions(userId: string, reason: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

export async function suspendUserAction(userId: string) {
  await requireRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await revokeAllSessions(userId, "suspended");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function activateUserAction(userId: string) {
  await requireRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

export async function deleteUserAction(userId: string) {
  const { user: admin } = await requireRole("ADMIN");
  if (admin.id === userId) {
    throw new Error("Không thể tự xoá tài khoản admin đang đăng nhập.");
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function revokeDeviceAction(deviceId: string) {
  await requireRole("ADMIN");
  const device = await prisma.device.update({
    where: { id: deviceId },
    data: { revokedAt: new Date() },
  });
  await prisma.session.updateMany({
    where: { deviceId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "device_revoked" },
  });
  revalidatePath(`/admin/users/${device.userId}`);
}
