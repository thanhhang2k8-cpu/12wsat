-- CreateEnum
CREATE TYPE "CopyAttemptAction" AS ENUM ('COPY', 'CUT', 'PRINT', 'CONTEXTMENU', 'PRINTSCREEN_SUSPECTED', 'WATERMARK_TAMPER');

-- CreateTable
CREATE TABLE "CopyAttemptLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT,
    "action" "CopyAttemptAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopyAttemptLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CopyAttemptLog_userId_createdAt_idx" ON "CopyAttemptLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CopyAttemptLog_attemptId_idx" ON "CopyAttemptLog"("attemptId");

-- AddForeignKey
ALTER TABLE "CopyAttemptLog" ADD CONSTRAINT "CopyAttemptLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyAttemptLog" ADD CONSTRAINT "CopyAttemptLog_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
