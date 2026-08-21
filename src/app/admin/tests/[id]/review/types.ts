export type ReviewImage = { id: string; note: string | null; url: string };

export type ReviewQuestion = {
  id: string;
  number: number;
  passageMd: string | null;
  stemMd: string;
  type: "MCQ" | "GRID_IN";
  correctAnswer: string | string[];
  explanationMd: string | null;
  domain: string;
  skill: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  confidence: number | null;
  needsReview: boolean;
  choices: { id: string; label: string; textMd: string }[];
  images: ReviewImage[];
};

export type ReviewModule = {
  id: string;
  section: "READING_WRITING" | "MATH";
  moduleNumber: number;
  difficultyTier: string;
  questions: ReviewQuestion[];
};
