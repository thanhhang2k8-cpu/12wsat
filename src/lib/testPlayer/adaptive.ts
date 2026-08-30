import "server-only";
import type { Module } from "@/generated/prisma/client";

const SECTION_ORDER = ["READING_WRITING", "MATH"] as const;

/**
 * Given every module in the test and the modules already completed in this
 * attempt (in order), returns the next module to serve, or null when the
 * attempt has gone through every section.
 *
 * Adaptive branching (spec: module 1 result decides module 2 difficulty)
 * only kicks in when a section actually has two module-2 variants (EASY and
 * HARD authored for it) — a section with a single module 2, or no module 2
 * at all, just proceeds linearly.
 */
export function pickNextModule(
  allModules: Module[],
  completed: { module: Module; correctCount: number; totalCount: number }[],
  adaptiveThresholdPct: number,
): Module | null {
  const completedIds = new Set(completed.map((c) => c.module.id));

  for (const section of SECTION_ORDER) {
    const sectionModules = allModules.filter((m) => m.section === section);
    if (sectionModules.length === 0) continue;

    const module1 = sectionModules.find((m) => m.moduleNumber === 1);
    const module2Variants = sectionModules.filter((m) => m.moduleNumber === 2);

    if (module1 && !completedIds.has(module1.id)) {
      return module1;
    }

    if (module2Variants.length === 0) continue;
    const module2Done = module2Variants.some((m) => completedIds.has(m.id));
    if (module2Done) continue;

    if (module2Variants.length === 1) {
      return module2Variants[0];
    }

    // Adaptive: use module 1's result in *this* attempt (not module1 itself,
    // which may be absent if a test somehow starts mid-section — in that
    // case fall back to the standard/first variant).
    const module1Result = completed.find((c) => c.module.id === module1?.id);
    if (!module1Result) {
      return module2Variants.find((m) => m.difficultyTier === "STANDARD") ?? module2Variants[0];
    }
    const pct = module1Result.totalCount > 0 ? (module1Result.correctCount / module1Result.totalCount) * 100 : 0;
    const wantTier = pct >= adaptiveThresholdPct ? "HARD" : "EASY";
    return module2Variants.find((m) => m.difficultyTier === wantTier) ?? module2Variants[0];
  }

  return null;
}
