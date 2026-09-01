"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import type { CopyAttemptAction } from "@/generated/prisma/client";

const validActions: CopyAttemptAction[] = ["COPY", "CUT", "PRINT", "CONTEXTMENU", "PRINTSCREEN_SUSPECTED", "WATERMARK_TAMPER"];

export async function logCopyAttemptAction(attemptId: string | null, action: string) {
  const { user } = await requireUser();
  if (!validActions.includes(action as CopyAttemptAction)) return;
  await prisma.copyAttemptLog.create({
    data: { userId: user.id, attemptId, action: action as CopyAttemptAction },
  });
}
