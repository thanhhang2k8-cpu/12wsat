import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@/generated/prisma/client";

export const SESSION_COOKIE = "sat_session";
export const DEVICE_COOKIE = "sat_device";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, re-validated server-side every request
const DEVICE_COOKIE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export type SessionContext = {
  user: User;
  sessionId: string;
  deviceId: string;
};

/**
 * Validates the session cookie against the database on every call — no
 * client-trusted claims. Cached only within a single request's render pass.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true, device: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (session.device.revokedAt) return null;
  if (session.user.status !== "ACTIVE") return null;
  if (session.user.expiresAt && session.user.expiresAt.getTime() < Date.now()) return null;

  // Best-effort activity timestamp; not required for correctness.
  void prisma.session
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
  void prisma.device
    .update({ where: { id: session.deviceId }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return { user: session.user, sessionId: session.id, deviceId: session.deviceId };
});

export async function requireUser(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(role: Role): Promise<SessionContext> {
  const session = await requireUser();
  if (session.user.role !== role) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }
  return session;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip");
}

export async function requestUserAgent(): Promise<string> {
  const h = await headers();
  return h.get("user-agent") ?? "unknown";
}

export async function issueSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readOrCreateDeviceToken(): Promise<{ token: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing) return { token: existing, isNew: false };
  return { token: newOpaqueToken(), isNew: true };
}

export async function issueDeviceCookie(token: string) {
  const jar = await cookies();
  jar.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_TTL_MS / 1000,
  });
}

export function sessionExpiryFromNow(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}
