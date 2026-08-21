import { z } from "zod";

// Mirrors the JSON shape from the Phase 0 spec (§4.2) — field names stay
// snake_case/lowercase here to match what the model is prompted to produce;
// admin-tests.ts maps this onto the Prisma (PascalCase enum) shape.

export const choiceSchema = z.object({
  label: z.string().describe('Choice letter, e.g. "A"'),
  text: z.string(),
});

export const imageRefSchema = z.object({
  placeholder: z.string().describe('e.g. "[IMG_1]" as referenced in the passage/stem'),
  note: z.string().describe("Short description of what the image shows, e.g. \"biểu đồ cột\""),
});

export const parsedQuestionSchema = z.object({
  number: z.number().int().min(1),
  passage: z.string().nullable().describe("Markdown, null if the question has no passage"),
  stem: z.string(),
  type: z.enum(["mcq", "grid_in"]),
  choices: z.array(choiceSchema).describe("Empty array for grid_in questions"),
  correct: z
    .union([z.string(), z.array(z.string())])
    .describe('Choice letter for mcq, or accepted string forms for grid_in, e.g. ["3/5", "0.6"]'),
  explanation: z.string().nullable(),
  domain: z.string(),
  skill: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  images: z.array(imageRefSchema),
  confidence: z.number().min(0).max(1),
});

export const parsedModuleSchema = z.object({
  section: z.enum(["reading_writing", "math"]),
  module: z.union([z.literal(1), z.literal(2)]),
  difficulty: z.enum(["standard", "easy", "hard"]),
  questions: z.array(parsedQuestionSchema),
});

export const parsedTestSchema = z.object({
  title: z.string(),
  type: z.enum(["full_test", "practice_set"]),
  modules: z.array(parsedModuleSchema),
});

export type ParsedTest = z.infer<typeof parsedTestSchema>;
export type ParsedQuestion = z.infer<typeof parsedQuestionSchema>;

const DEFAULT_TIME_LIMIT_SEC: Record<"reading_writing" | "math", number> = {
  reading_writing: 32 * 60,
  math: 35 * 60,
};

export function defaultTimeLimitSec(section: "reading_writing" | "math"): number {
  return DEFAULT_TIME_LIMIT_SEC[section];
}

/** A question needs a human look before it can publish. */
export function computeNeedsReview(q: ParsedQuestion): boolean {
  if (q.confidence < 0.85) return true;
  if (!q.stem?.trim()) return true;
  if (q.correct === "" || (Array.isArray(q.correct) && q.correct.length === 0)) return true;
  if (!q.explanation?.trim()) return true;
  if (q.type === "mcq") {
    if (q.choices.length < 2) return true;
    const correctLabel = Array.isArray(q.correct) ? q.correct[0] : q.correct;
    if (!q.choices.some((c) => c.label === correctLabel)) return true;
  }
  return false;
}
