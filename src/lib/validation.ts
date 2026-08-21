import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Nhập email").toLowerCase(),
  password: z.string().min(1, "Nhập mật khẩu"),
  timezone: z.string().optional(),
  screenRes: z.string().optional(),
  platform: z.string().optional(),
});

const passwordRule = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự");

export const createUserSchema = z.object({
  email: z.string().trim().min(3).toLowerCase(),
  fullName: z.string().trim().min(1, "Nhập họ tên"),
  password: passwordRule,
  note: z.string().trim().optional(),
  cohortId: z.string().trim().optional(),
  newCohortName: z.string().trim().optional(),
  maxDevices: z.coerce.number().int().min(1).max(10).default(2),
  expiresAt: z.string().trim().optional(),
  role: z.enum(["ADMIN", "STUDENT"]).default("STUDENT"),
});

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().trim().min(1, "Nhập họ tên"),
  note: z.string().trim().optional(),
  cohortId: z.string().trim().optional(),
  newCohortName: z.string().trim().optional(),
  maxDevices: z.coerce.number().int().min(1).max(10),
  expiresAt: z.string().trim().optional(),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: passwordRule,
});
