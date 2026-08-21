"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { describeUserAgent } from "@/lib/auth/device";
import {
  clearSessionCookie,
  clientIp,
  hashToken,
  issueDeviceCookie,
  issueSessionCookie,
  newOpaqueToken,
  readOrCreateDeviceToken,
  requestUserAgent,
  sessionExpiryFromNow,
  getSession,
} from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: string };

const MAX_FAILED_ATTEMPTS = 8;
const FAILED_WINDOW_MS = 10 * 60 * 1000;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone") ?? undefined,
    screenRes: formData.get("screenRes") ?? undefined,
    platform: formData.get("platform") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "Nhập đủ email và mật khẩu." };
  }
  const { email, password, timezone, screenRes, platform } = parsed.data;

  const ip = await clientIp();
  const userAgent = await requestUserAgent();

  async function logAttempt(userId: string | null, deviceId: string | null, success: boolean, reason: string) {
    await prisma.loginLog.create({
      data: { userId, deviceId, emailTried: email, success, reason, ip, userAgent },
    });
  }

  const recentFailures = await prisma.loginLog.count({
    where: {
      emailTried: email,
      success: false,
      createdAt: { gte: new Date(Date.now() - FAILED_WINDOW_MS) },
    },
  });
  if (recentFailures >= MAX_FAILED_ATTEMPTS) {
    await logAttempt(null, null, false, "rate_limited");
    return { error: "Bạn đã thử sai quá nhiều lần. Vui lòng thử lại sau ít phút." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await logAttempt(null, null, false, "bad_credentials");
    return { error: "Sai email hoặc mật khẩu." };
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    await logAttempt(user.id, null, false, "bad_credentials");
    return { error: "Sai email hoặc mật khẩu." };
  }

  if (user.status !== "ACTIVE") {
    await logAttempt(user.id, null, false, "suspended");
    return { error: "Tài khoản đã bị khoá. Liên hệ mentor để được hỗ trợ." };
  }

  if (user.expiresAt && user.expiresAt.getTime() < Date.now()) {
    await logAttempt(user.id, null, false, "expired");
    return { error: "Tài khoản đã hết hạn truy cập. Liên hệ mentor." };
  }

  const { token: deviceToken, isNew: deviceCookieIsNew } = await readOrCreateDeviceToken();

  let device = await prisma.device.findFirst({
    where: { userId: user.id, deviceIdToken: deviceToken, revokedAt: null },
  });

  const isKnownDevice = !!device && !deviceCookieIsNew;

  if (!isKnownDevice) {
    const activeDeviceCount = await prisma.device.count({
      where: { userId: user.id, revokedAt: null },
    });
    if (activeDeviceCount >= user.maxDevices) {
      await logAttempt(user.id, null, false, "device_limit");
      return {
        error: `Tài khoản đã đăng nhập trên tối đa ${user.maxDevices} thiết bị. Liên hệ mentor để gỡ thiết bị cũ.`,
      };
    }

    const freshDeviceToken = deviceCookieIsNew ? deviceToken : newOpaqueToken();
    device = await prisma.device.create({
      data: {
        userId: user.id,
        deviceIdToken: freshDeviceToken,
        label: describeUserAgent(userAgent),
        userAgent,
        platform: platform || null,
        screenRes: screenRes || null,
        timezone: timezone || null,
        firstIp: ip,
        lastIp: ip,
      },
    });
    await issueDeviceCookie(freshDeviceToken);
  } else {
    device = await prisma.device.update({
      where: { id: device!.id },
      data: { lastIp: ip ?? undefined, lastSeenAt: new Date() },
    });
  }

  // Single active session per account: logging in anywhere else kicks the old one out.
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "superseded_by_new_login" },
  });

  const sessionToken = newOpaqueToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      deviceId: device.id,
      tokenHash: hashToken(sessionToken),
      expiresAt: sessionExpiryFromNow(),
      ip,
      userAgent,
    },
  });
  await issueSessionCookie(sessionToken);
  await logAttempt(user.id, device.id, true, "ok");

  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await prisma.session.update({
      where: { id: session.sessionId },
      data: { revokedAt: new Date(), revokedReason: "logout" },
    }).catch(() => {});
  }
  await clearSessionCookie();
  redirect("/login");
}
