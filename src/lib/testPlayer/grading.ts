import "server-only";

/** Parses "3/5", "0.6", "-2", "1 1/2" into a comparable number, or null if not numeric. */
function toNumber(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed;
    const d = Number(den);
    if (d === 0) return null;
    const sign = whole.startsWith("-") ? -1 : 1;
    return Number(whole) + sign * (Number(num) / d);
  }

  const fraction = s.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    const [, num, den] = fraction;
    const d = Number(den);
    if (d === 0) return null;
    return Number(num) / d;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Grid-in answers accept multiple equivalent written forms (spec: "3/5" == "0.6"). */
export function gridInMatches(studentRaw: string, accepted: string | string[]): boolean {
  const options = Array.isArray(accepted) ? accepted : [accepted];
  const student = studentRaw.trim();
  if (!student) return false;

  for (const opt of options) {
    if (student === opt.trim()) return true;
    const a = toNumber(student);
    const b = toNumber(opt);
    if (a !== null && b !== null && Math.abs(a - b) < 1e-9) return true;
  }
  return false;
}

export function mcqMatches(selectedLabel: string | null, correct: string | string[]): boolean {
  if (!selectedLabel) return false;
  const correctLabel = Array.isArray(correct) ? correct[0] : correct;
  return selectedLabel.trim().toUpperCase() === (correctLabel ?? "").trim().toUpperCase();
}

export function isAnswerCorrect(
  type: "MCQ" | "GRID_IN",
  correctAnswer: unknown,
  selectedLabel: string | null,
  gridInValue: string | null,
): boolean {
  const accepted = correctAnswer as string | string[];
  if (type === "MCQ") return mcqMatches(selectedLabel, accepted);
  return gridInValue ? gridInMatches(gridInValue, accepted) : false;
}

/** Maps a raw (# correct) score to the admin-entered scaled score for that section. */
export function scaleScore(
  scoreScale: { rawScore: number; scaledScore: number }[],
  rawScore: number,
): number {
  if (scoreScale.length === 0) return 200; // no table entered yet — floor, never crash the results page
  const sorted = [...scoreScale].sort((a, b) => a.rawScore - b.rawScore);
  const exact = sorted.find((s) => s.rawScore === rawScore);
  if (exact) return exact.scaledScore;

  if (rawScore <= sorted[0].rawScore) return sorted[0].scaledScore;
  if (rawScore >= sorted[sorted.length - 1].rawScore) return sorted[sorted.length - 1].scaledScore;

  // Fall back to the nearest entry at or below — admin tables are monotonic step tables, not interpolated curves.
  let best = sorted[0];
  for (const entry of sorted) {
    if (entry.rawScore <= rawScore) best = entry;
  }
  return best.scaledScore;
}
