import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import mammoth from "mammoth";
import {
  parsedQuestionSchema,
  parsedTestSchema,
  type ParsedQuestion,
  type ParsedTest,
} from "./schema";
import { PARSE_TEST_SYSTEM_PROMPT, REPARSE_QUESTION_SYSTEM_PROMPT } from "./prompt";
import { mockParseTest, mockParseQuestion } from "./mockParser";

// Sonnet balances accuracy and speed/cost well for structured document
// extraction — Opus is markedly slower and pricier per page for this task.
// Override with ANTHROPIC_MODEL if you want to try a different model.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

function client(): Anthropic {
  return new Anthropic();
}

type FileInput = { buffer: Buffer; mimeType: string; originalName: string };

async function toContentBlock(
  file: FileInput,
): Promise<Anthropic.Messages.ContentBlockParam> {
  if (file.mimeType === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: file.buffer.toString("base64") },
    };
  }
  if (file.mimeType === "image/png" || file.mimeType === "image/jpeg") {
    return {
      type: "image",
      source: { type: "base64", media_type: file.mimeType, data: file.buffer.toString("base64") },
    };
  }
  if (
    file.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const { value: text } = await mammoth.extractRawText({ buffer: file.buffer });
    return { type: "text", text };
  }
  throw new Error(`Định dạng file không hỗ trợ: ${file.mimeType}`);
}

function isMockMode(): boolean {
  return process.env.AI_PARSE_MODE === "mock" || !process.env.ANTHROPIC_API_KEY;
}

export async function parseTestFromFile(file: FileInput): Promise<ParsedTest> {
  if (isMockMode()) {
    return mockParseTest(file.originalName);
  }

  const block = await toContentBlock(file);
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: PARSE_TEST_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [block, { type: "text", text: "Trích xuất đề thi này thành JSON theo đúng schema." }],
      },
    ],
    output_config: { format: zodOutputFormat(parsedTestSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("AI không trả về JSON hợp lệ cho file này.");
  }
  return response.parsed_output;
}

export async function reparseQuestionFromFile(
  file: FileInput,
  focus: { questionNumber: number; currentStem: string },
): Promise<ParsedQuestion> {
  if (isMockMode()) {
    return mockParseQuestion();
  }

  const block = await toContentBlock(file);
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: REPARSE_QUESTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          block,
          {
            type: "text",
            text: `Đây là toàn bộ đề gốc. Hãy tìm và đọc lại thật kỹ câu số ${focus.questionNumber} (nội dung hiện đang lưu là: "${focus.currentStem}"). Trả về đúng một object JSON cho riêng câu này theo schema.`,
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(parsedQuestionSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("AI không trả về JSON hợp lệ cho câu này.");
  }
  return response.parsed_output;
}
