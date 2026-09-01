"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { schedule, type ReviewGrade } from "@/lib/vocab/srs";

async function getOrCreateDefaultDeck(userId: string) {
  const existing = await prisma.vocabDeck.findFirst({
    where: { ownerUserId: userId, isSharedTemplate: false },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.vocabDeck.create({ data: { ownerUserId: userId, name: "Từ vựng của tôi" } });
}

export type AddWordState = { error?: string; ok?: string };

export async function createDeckAction(_prev: AddWordState, formData: FormData): Promise<AddWordState> {
  const { user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nhập tên bộ từ." };
  await prisma.vocabDeck.create({ data: { ownerUserId: user.id, name } });
  revalidatePath("/dashboard/vocab");
  return { ok: "Đã tạo bộ từ." };
}

export async function addWordAction(_prev: AddWordState, formData: FormData): Promise<AddWordState> {
  const { user } = await requireUser();
  const term = String(formData.get("term") ?? "").trim();
  const definition = String(formData.get("definition") ?? "").trim();
  if (!term || !definition) return { error: "Nhập ít nhất từ vựng và định nghĩa." };

  const deckId = String(formData.get("deckId") ?? "") || (await getOrCreateDefaultDeck(user.id)).id;
  const synonymsRaw = String(formData.get("synonyms") ?? "").trim();
  const sourceQuestionId = String(formData.get("sourceQuestionId") ?? "").trim() || null;

  const word = await prisma.vocabWord.create({
    data: {
      userId: user.id,
      deckId,
      term,
      definition,
      partOfSpeech: String(formData.get("partOfSpeech") ?? "").trim() || null,
      ipa: String(formData.get("ipa") ?? "").trim() || null,
      synonyms: synonymsRaw ? synonymsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
      exampleSentence: String(formData.get("exampleSentence") ?? "").trim() || null,
      sourceQuestionId,
    },
  });
  await prisma.vocabReview.create({ data: { wordId: word.id } });

  revalidatePath("/dashboard/vocab");
  return { ok: `Đã thêm "${term}".` };
}

export async function quickAddWordFromQuestionAction(input: {
  term: string;
  definition: string;
  exampleSentence?: string;
  sourceQuestionId: string;
}) {
  const { user } = await requireUser();
  const deck = await getOrCreateDefaultDeck(user.id);
  const word = await prisma.vocabWord.create({
    data: {
      userId: user.id,
      deckId: deck.id,
      term: input.term.trim(),
      definition: input.definition.trim(),
      exampleSentence: input.exampleSentence?.trim() || null,
      sourceQuestionId: input.sourceQuestionId,
    },
  });
  await prisma.vocabReview.create({ data: { wordId: word.id } });
}

export async function deleteWordAction(wordId: string) {
  const { user } = await requireUser();
  const word = await prisma.vocabWord.findUniqueOrThrow({ where: { id: wordId } });
  if (word.userId !== user.id) throw new Error("Không có quyền.");
  await prisma.vocabWord.delete({ where: { id: wordId } });
  revalidatePath("/dashboard/vocab");
}

export async function dueWordCount(): Promise<number> {
  const { user } = await requireUser();
  return prisma.vocabReview.count({ where: { word: { userId: user.id }, dueAt: { lte: new Date() } } });
}

export async function gradeWordAction(wordId: string, grade: ReviewGrade) {
  const { user } = await requireUser();
  const review = await prisma.vocabReview.findUniqueOrThrow({ where: { wordId }, include: { word: true } });
  if (review.word.userId !== user.id) throw new Error("Không có quyền.");

  const next = schedule({ easeFactor: review.easeFactor, intervalDays: review.intervalDays, repetitions: review.repetitions }, grade);

  await prisma.vocabReview.update({
    where: { wordId },
    data: {
      easeFactor: next.easeFactor,
      intervalDays: next.intervalDays,
      repetitions: next.repetitions,
      dueAt: next.dueAt,
      lastReviewedAt: new Date(),
      lastGrade: grade,
    },
  });
}
