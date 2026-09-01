export type ReviewGrade = "AGAIN" | "HARD" | "GOOD" | "EASY";

export type ReviewState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

/**
 * Simplified SM-2 (4-button Anki-style) scheduler. Returns the next
 * state and the due date computed from "now".
 */
export function schedule(state: ReviewState, grade: ReviewGrade, now: Date = new Date()): ReviewState & { dueAt: Date } {
  let { easeFactor, intervalDays, repetitions } = state;

  switch (grade) {
    case "AGAIN":
      repetitions = 0;
      intervalDays = 0; // due again today
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      break;
    case "HARD":
      repetitions += 1;
      intervalDays = Math.max(1, Math.round((intervalDays || 1) * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      break;
    case "GOOD":
      repetitions += 1;
      if (repetitions === 1) intervalDays = 1;
      else if (repetitions === 2) intervalDays = 6;
      else intervalDays = Math.round(intervalDays * easeFactor);
      break;
    case "EASY":
      repetitions += 1;
      intervalDays = Math.round((intervalDays || 1) * easeFactor * 1.3);
      easeFactor = easeFactor + 0.15;
      break;
  }

  const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  // "Again" stays due today so it resurfaces in the same review session.
  if (grade === "AGAIN") dueAt.setTime(now.getTime());

  return { easeFactor, intervalDays, repetitions, dueAt };
}
