"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";

export type GoalState = { error?: string };

export async function setGoalAction(_prev: GoalState, formData: FormData): Promise<GoalState> {
  const { user } = await requireUser();

  const scoreRaw = String(formData.get("targetScore") ?? "").trim();
  const dateRaw = String(formData.get("targetExamDate") ?? "").trim();

  const targetScore = scoreRaw ? Number(scoreRaw) : null;
  if (scoreRaw && (!Number.isFinite(targetScore) || targetScore! < 400 || targetScore! > 1600)) {
    return { error: "Điểm mục tiêu phải từ 400 đến 1600." };
  }

  const targetExamDate = dateRaw ? new Date(dateRaw) : null;
  if (dateRaw && Number.isNaN(targetExamDate?.getTime())) {
    return { error: "Ngày thi không hợp lệ." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { targetScore, targetExamDate },
  });

  revalidatePath("/dashboard");
  return {};
}
