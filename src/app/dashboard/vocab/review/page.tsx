import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { VocabReviewClient } from "./VocabReviewClient";

export const dynamic = "force-dynamic";

export default async function VocabReviewPage() {
  const { user } = await requireUser();

  const due = await prisma.vocabReview.findMany({
    where: { word: { userId: user.id }, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    include: { word: true },
    take: 50,
  });

  const words = due.map((r) => ({
    id: r.word.id,
    term: r.word.term,
    definition: r.word.definition,
    partOfSpeech: r.word.partOfSpeech,
    ipa: r.word.ipa,
    synonyms: r.word.synonyms,
    exampleSentence: r.word.exampleSentence,
  }));

  return <VocabReviewClient words={words} />;
}
