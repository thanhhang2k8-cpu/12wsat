-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('FULL_TEST', 'PRACTICE_SET');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TimedMode" AS ENUM ('TIMED', 'UNTIMED');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('READING_WRITING', 'MATH');

-- CreateEnum
CREATE TYPE "DifficultyTier" AS ENUM ('STANDARD', 'EASY', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'GRID_IN');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ParseJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "SourceFile" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseJob" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "sourceFileId" TEXT NOT NULL,
    "status" "ParseJobStatus" NOT NULL DEFAULT 'PENDING',
    "questionId" TEXT,
    "rawResponse" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ParseJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TestType" NOT NULL DEFAULT 'FULL_TEST',
    "status" "TestStatus" NOT NULL DEFAULT 'DRAFT',
    "timedMode" "TimedMode" NOT NULL DEFAULT 'TIMED',
    "allowRetakes" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rootTestId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "difficultyTier" "DifficultyTier" NOT NULL DEFAULT 'STANDARD',
    "timeLimitSec" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "passageMd" TEXT,
    "stemMd" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "correctAnswer" JSONB NOT NULL,
    "explanationMd" TEXT,
    "domain" TEXT,
    "skill" TEXT,
    "difficulty" "Difficulty",
    "confidence" DOUBLE PRECISION,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "textMd" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionImage" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "placeholder" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreScale" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "rawScore" INTEGER NOT NULL,
    "scaledScore" INTEGER NOT NULL,

    CONSTRAINT "ScoreScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "cohortId" TEXT,
    "userId" TEXT,
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceFile_testId_idx" ON "SourceFile"("testId");

-- CreateIndex
CREATE INDEX "ParseJob_testId_idx" ON "ParseJob"("testId");

-- CreateIndex
CREATE INDEX "Test_status_idx" ON "Test"("status");

-- CreateIndex
CREATE INDEX "Test_rootTestId_idx" ON "Test"("rootTestId");

-- CreateIndex
CREATE INDEX "Module_testId_idx" ON "Module"("testId");

-- CreateIndex
CREATE INDEX "Question_moduleId_idx" ON "Question"("moduleId");

-- CreateIndex
CREATE INDEX "Question_domain_skill_difficulty_idx" ON "Question"("domain", "skill", "difficulty");

-- CreateIndex
CREATE INDEX "Choice_questionId_idx" ON "Choice"("questionId");

-- CreateIndex
CREATE INDEX "QuestionImage_questionId_idx" ON "QuestionImage"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreScale_testId_section_rawScore_key" ON "ScoreScale"("testId", "section", "rawScore");

-- CreateIndex
CREATE INDEX "Assignment_testId_idx" ON "Assignment"("testId");

-- CreateIndex
CREATE INDEX "Assignment_cohortId_idx" ON "Assignment"("cohortId");

-- CreateIndex
CREATE INDEX "Assignment_userId_idx" ON "Assignment"("userId");

-- AddForeignKey
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseJob" ADD CONSTRAINT "ParseJob_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParseJob" ADD CONSTRAINT "ParseJob_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_rootTestId_fkey" FOREIGN KEY ("rootTestId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionImage" ADD CONSTRAINT "QuestionImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreScale" ADD CONSTRAINT "ScoreScale_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
