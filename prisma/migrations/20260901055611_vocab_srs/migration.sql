-- CreateEnum
CREATE TYPE "ReviewGrade" AS ENUM ('AGAIN', 'HARD', 'GOOD', 'EASY');

-- CreateTable
CREATE TABLE "VocabDeck" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "isSharedTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "ipa" TEXT,
    "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exampleSentence" TEXT,
    "sourceQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabReview" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3),
    "lastGrade" "ReviewGrade",

    CONSTRAINT "VocabReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabDeck_ownerUserId_idx" ON "VocabDeck"("ownerUserId");

-- CreateIndex
CREATE INDEX "VocabWord_userId_idx" ON "VocabWord"("userId");

-- CreateIndex
CREATE INDEX "VocabWord_deckId_idx" ON "VocabWord"("deckId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabReview_wordId_key" ON "VocabReview"("wordId");

-- CreateIndex
CREATE INDEX "VocabReview_dueAt_idx" ON "VocabReview"("dueAt");

-- AddForeignKey
ALTER TABLE "VocabDeck" ADD CONSTRAINT "VocabDeck_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabWord" ADD CONSTRAINT "VocabWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabWord" ADD CONSTRAINT "VocabWord_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "VocabDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabWord" ADD CONSTRAINT "VocabWord_sourceQuestionId_fkey" FOREIGN KEY ("sourceQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabReview" ADD CONSTRAINT "VocabReview_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
