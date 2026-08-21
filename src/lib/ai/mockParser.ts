import type { ParsedQuestion, ParsedTest } from "./schema";

/**
 * Deterministic stand-in for the real Anthropic call, used when
 * ANTHROPIC_API_KEY is unset or AI_PARSE_MODE=mock. Lets the whole
 * upload → review → publish pipeline be exercised (including the
 * needs-review queue) without a live API key or a real SAT PDF on hand.
 * Swap this out by setting ANTHROPIC_API_KEY in production — parseTest.ts
 * picks the real path automatically.
 */
export function mockParseTest(originalName: string): ParsedTest {
  return {
    title: originalName.replace(/\.[^.]+$/, "") || "Đề mẫu (mock parser)",
    type: "practice_set",
    modules: [
      {
        section: "reading_writing",
        module: 1,
        difficulty: "standard",
        questions: [
          {
            number: 1,
            passage:
              "Marine biologists have long assumed that coral bleaching events are driven almost entirely by rising sea temperatures. Recent fieldwork suggests the relationship is more provisional than the standard model implies.",
            stem: "Which choice completes the text with the most logical and precise word or phrase?",
            type: "mcq",
            choices: [
              { label: "A", text: "diminish" },
              { label: "B", text: "strengthen" },
              { label: "C", text: "obscure" },
              { label: "D", text: "interrupt" },
            ],
            correct: "B",
            explanation:
              "The passage describes moderate stress leading to higher thermal tolerance, so the missing word should mean the opposite of weaken — \"strengthen\" fits.",
            domain: "Craft and Structure",
            skill: "Words in Context",
            confidence: 0.94,
            images: [],
            difficulty: "medium",
          },
          {
            number: 2,
            passage:
              "The following text is adapted from a report on urban tree canopy. Researchers found that neighborhoods with denser tree cover recorded surface temperatures up to 6°F lower during summer heat waves than neighborhoods with sparse canopy.",
            stem: "Which finding, if true, would most directly support the researchers' claim?",
            type: "mcq",
            choices: [
              { label: "A", text: "Tree-planting programs are costly to maintain long-term." },
              { label: "B", text: "Some tree species tolerate urban pollution better than others." },
              { label: "C", text: "Streets shaded by mature trees showed measurably lower asphalt temperatures." },
              { label: "D", text: "Public opinion favors more green space in cities." },
            ],
            correct: "C",
            explanation: null,
            domain: "Information and Ideas",
            skill: "Command of Evidence (Textual)",
            confidence: 0.71,
            images: [],
            difficulty: "hard",
          },
          {
            number: 3,
            passage: null,
            stem:
              "The committee, initially skeptical of the proposal, ______ its position after reviewing the pilot program's results.",
            type: "mcq",
            choices: [
              { label: "A", text: "reversed" },
              { label: "B", text: "maintained" },
              { label: "C", text: "questioned" },
              { label: "D", text: "announced" },
            ],
            correct: "A",
            explanation: "\"Initially skeptical\" contrasted with a change after reviewing results signals a reversal.",
            domain: "Standard English Conventions",
            skill: "Form, Structure, and Sense",
            confidence: 0.97,
            images: [],
            difficulty: "easy",
          },
          {
            number: 4,
            passage:
              "[IMG_1] shows the relationship between study hours and quiz scores for a sample of 40 students.",
            stem: "Based on the graph, which statement best describes the trend?",
            type: "mcq",
            choices: [
              { label: "A", text: "Quiz scores decrease as study hours increase." },
              { label: "B", text: "There is no clear relationship between the two variables." },
              { label: "C", text: "Quiz scores generally increase as study hours increase." },
              { label: "D", text: "Quiz scores remain constant regardless of study hours." },
            ],
            correct: "",
            explanation: null,
            domain: "Information and Ideas",
            skill: "Command of Evidence (Quantitative)",
            confidence: 0.52,
            images: [{ placeholder: "[IMG_1]", note: "biểu đồ phân tán: giờ học vs điểm quiz" }],
            difficulty: "medium",
          },
        ],
      },
    ],
  };
}

export function mockParseQuestion(): ParsedQuestion {
  const test = mockParseTest("reparsed");
  return { ...test.modules[0].questions[1], confidence: 0.9, explanation: "Đã parse lại — lời giải được bổ sung." };
}
