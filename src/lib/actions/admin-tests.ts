"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { putObject, getObjectBuffer } from "@/lib/storage";
import { parseTestFromFile, reparseQuestionFromFile } from "@/lib/ai/parseTest";
import { computeNeedsReview, defaultTimeLimitSec, type ParsedQuestion, type ParsedTest } from "@/lib/ai/schema";

export type FormState = { error?: string; ok?: string };

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function sectionEnum(s: "reading_writing" | "math") {
  return s === "reading_writing" ? ("READING_WRITING" as const) : ("MATH" as const);
}
function tierEnum(d: "standard" | "easy" | "hard") {
  return d.toUpperCase() as "STANDARD" | "EASY" | "HARD";
}
function difficultyEnum(d: "easy" | "medium" | "hard") {
  return d.toUpperCase() as "EASY" | "MEDIUM" | "HARD";
}
function typeEnum(t: "mcq" | "grid_in") {
  return t === "mcq" ? ("MCQ" as const) : ("GRID_IN" as const);
}

async function saveParsedTestIntoModules(testId: string, parsed: ParsedTest) {
  for (const [moduleIndex, mod] of parsed.modules.entries()) {
    const createdModule = await prisma.module.create({
      data: {
        testId,
        section: sectionEnum(mod.section),
        moduleNumber: mod.module,
        difficultyTier: tierEnum(mod.difficulty),
        timeLimitSec: defaultTimeLimitSec(mod.section),
        orderIndex: moduleIndex,
      },
    });

    for (const [qIndex, q] of mod.questions.entries()) {
      const createdQuestion = await prisma.question.create({
        data: {
          moduleId: createdModule.id,
          number: q.number,
          orderIndex: qIndex,
          passageMd: q.passage,
          stemMd: q.stem,
          type: typeEnum(q.type),
          correctAnswer: q.correct,
          explanationMd: q.explanation,
          domain: q.domain,
          skill: q.skill,
          difficulty: difficultyEnum(q.difficulty),
          confidence: q.confidence,
          needsReview: computeNeedsReview(q),
        },
      });

      if (q.choices.length > 0) {
        await prisma.choice.createMany({
          data: q.choices.map((c, i) => ({
            questionId: createdQuestion.id,
            label: c.label,
            textMd: c.text,
            orderIndex: i,
          })),
        });
      }
    }
  }
}

export async function uploadTestsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireRole("ADMIN");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Chọn ít nhất một file (PDF, DOCX, hoặc ảnh)." };
  }

  const createdTestIds: string[] = [];

  for (const file of files) {
    if (!ALLOWED_MIME.has(file.type)) {
      return { error: `Định dạng không hỗ trợ: ${file.name} (${file.type || "không rõ"}).` };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const title = file.name.replace(/\.[^.]+$/, "");

    const test = await prisma.test.create({
      data: { title, status: "DRAFT", createdByUserId: user.id },
    });
    createdTestIds.push(test.id);

    const storageKey = `sources/${test.id}/${randomUUID()}-${file.name}`;
    await putObject(storageKey, buffer, file.type);

    const sourceFile = await prisma.sourceFile.create({
      data: {
        testId: test.id,
        storageKey,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: buffer.byteLength,
        uploadedByUserId: user.id,
      },
    });

    const parseJob = await prisma.parseJob.create({
      data: { testId: test.id, sourceFileId: sourceFile.id, status: "RUNNING" },
    });

    try {
      const parsed = await parseTestFromFile({
        buffer,
        mimeType: file.type,
        originalName: file.name,
      });
      await saveParsedTestIntoModules(test.id, parsed);
      await prisma.parseJob.update({
        where: { id: parseJob.id },
        data: { status: "SUCCEEDED", rawResponse: parsed, completedAt: new Date() },
      });
      if (parsed.title) {
        await prisma.test.update({
          where: { id: test.id },
          data: { title: parsed.title, type: parsed.type === "full_test" ? "FULL_TEST" : "PRACTICE_SET" },
        });
      }
    } catch (err) {
      await prisma.parseJob.update({
        where: { id: parseJob.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Lỗi không xác định khi parse.",
          completedAt: new Date(),
        },
      });
    }
  }

  revalidatePath("/admin/tests");
  if (createdTestIds.length === 1) {
    redirect(`/admin/tests/${createdTestIds[0]}/review`);
  }
  redirect("/admin/tests");
}

export async function reparseWholeTestAction(testId: string) {
  await requireRole("ADMIN");
  const test = await prisma.test.findUniqueOrThrow({
    where: { id: testId },
    include: { sourceFiles: { orderBy: { createdAt: "asc" }, take: 1 } },
  });
  const sourceFile = test.sourceFiles[0];
  if (!sourceFile) throw new Error("Không có file gốc để parse lại.");

  const buffer = await getObjectBuffer(sourceFile.storageKey);
  const parseJob = await prisma.parseJob.create({
    data: { testId, sourceFileId: sourceFile.id, status: "RUNNING" },
  });

  try {
    const parsed = await parseTestFromFile({
      buffer,
      mimeType: sourceFile.mimeType,
      originalName: sourceFile.originalName,
    });
    // Re-parsing the whole file replaces existing modules/questions outright.
    await prisma.module.deleteMany({ where: { testId } });
    await saveParsedTestIntoModules(testId, parsed);
    await prisma.parseJob.update({
      where: { id: parseJob.id },
      data: { status: "SUCCEEDED", rawResponse: parsed, completedAt: new Date() },
    });
  } catch (err) {
    await prisma.parseJob.update({
      where: { id: parseJob.id },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Lỗi không xác định.",
        completedAt: new Date(),
      },
    });
    throw err;
  }

  revalidatePath(`/admin/tests/${testId}/review`);
}

export async function reparseQuestionAction(questionId: string) {
  await requireRole("ADMIN");
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    include: { module: { include: { test: { include: { sourceFiles: { orderBy: { createdAt: "asc" }, take: 1 } } } } } },
  });
  const sourceFile = question.module.test.sourceFiles[0];
  if (!sourceFile) throw new Error("Không có file gốc để parse lại.");

  const buffer = await getObjectBuffer(sourceFile.storageKey);
  const reparsed: ParsedQuestion = await reparseQuestionFromFile(
    { buffer, mimeType: sourceFile.mimeType, originalName: sourceFile.originalName },
    { questionNumber: question.number, currentStem: question.stemMd },
  );

  await prisma.$transaction([
    prisma.choice.deleteMany({ where: { questionId } }),
    prisma.question.update({
      where: { id: questionId },
      data: {
        passageMd: reparsed.passage,
        stemMd: reparsed.stem,
        type: typeEnum(reparsed.type),
        correctAnswer: reparsed.correct,
        explanationMd: reparsed.explanation,
        domain: reparsed.domain,
        skill: reparsed.skill,
        difficulty: difficultyEnum(reparsed.difficulty),
        confidence: reparsed.confidence,
        needsReview: computeNeedsReview(reparsed),
      },
    }),
  ]);
  if (reparsed.choices.length > 0) {
    await prisma.choice.createMany({
      data: reparsed.choices.map((c, i) => ({ questionId, label: c.label, textMd: c.text, orderIndex: i })),
    });
  }

  revalidatePath(`/admin/tests/${question.module.testId}/review`);
}

const answerToJson = (raw: string): string | string[] => {
  const parts = raw
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : (parts[0] ?? "");
};

export async function updateQuestionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const questionId = String(formData.get("questionId"));
  const passageMd = String(formData.get("passageMd") ?? "").trim() || null;
  const stemMd = String(formData.get("stemMd") ?? "").trim();
  const explanationMd = String(formData.get("explanationMd") ?? "").trim() || null;
  const domain = String(formData.get("domain") ?? "").trim();
  const skill = String(formData.get("skill") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "MEDIUM") as "EASY" | "MEDIUM" | "HARD";
  const type = String(formData.get("type") ?? "MCQ") as "MCQ" | "GRID_IN";
  const correctRaw = String(formData.get("correctAnswer") ?? "");
  const correctAnswer = type === "GRID_IN" ? answerToJson(correctRaw) : correctRaw.trim();

  if (!stemMd) return { error: "Câu hỏi không được để trống." };

  const choiceLabels = formData.getAll("choiceLabel").map(String);
  const choiceTexts = formData.getAll("choiceText").map(String);

  const parsedForReview: ParsedQuestion = {
    number: 0,
    passage: passageMd,
    stem: stemMd,
    type: type === "MCQ" ? "mcq" : "grid_in",
    choices: choiceLabels.map((label, i) => ({ label, text: choiceTexts[i] ?? "" })),
    correct: correctAnswer,
    explanation: explanationMd,
    domain,
    skill,
    difficulty: difficulty.toLowerCase() as "easy" | "medium" | "hard",
    images: [],
    confidence: 1, // human-edited: only the content checks below still apply
  };

  await prisma.$transaction([
    prisma.choice.deleteMany({ where: { questionId } }),
    prisma.question.update({
      where: { id: questionId },
      data: {
        passageMd,
        stemMd,
        type,
        correctAnswer,
        explanationMd,
        domain,
        skill,
        difficulty,
        needsReview: computeNeedsReview(parsedForReview),
      },
    }),
  ]);

  if (choiceLabels.length > 0) {
    await prisma.choice.createMany({
      data: choiceLabels.map((label, i) => ({
        questionId,
        label,
        textMd: choiceTexts[i] ?? "",
        orderIndex: i,
      })),
    });
  }

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { module: { select: { testId: true } } },
  });
  revalidatePath(`/admin/tests/${question.module.testId}/review`);
  return { ok: "Đã lưu câu hỏi." };
}

export async function addQuestionImageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const questionId = String(formData.get("questionId"));
  const note = String(formData.get("note") ?? "").trim() || null;
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Chọn một ảnh để chèn." };
  }
  if (!["image/png", "image/jpeg"].includes(file.type)) {
    return { error: "Chỉ nhận ảnh PNG hoặc JPEG." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `question-images/${questionId}/${randomUUID()}-${file.name}`;
  await putObject(storageKey, buffer, file.type);

  await prisma.questionImage.create({
    data: { questionId, storageKey, note },
  });

  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
    select: { module: { select: { testId: true } } },
  });
  revalidatePath(`/admin/tests/${question.module.testId}/review`);
  return { ok: "Đã chèn ảnh." };
}

export async function deleteQuestionImageAction(imageId: string) {
  await requireRole("ADMIN");
  const image = await prisma.questionImage.delete({
    where: { id: imageId },
    include: { question: { select: { module: { select: { testId: true } } } } },
  });
  revalidatePath(`/admin/tests/${image.question.module.testId}/review`);
}

export async function publishTestAction(testId: string): Promise<FormState> {
  await requireRole("ADMIN");
  const flaggedCount = await prisma.question.count({
    where: { module: { testId }, needsReview: true },
  });
  if (flaggedCount > 0) {
    return { error: `Còn ${flaggedCount} câu đang bị gắn cờ "Cần kiểm tra" — sửa xong mới publish được.` };
  }
  const questionCount = await prisma.question.count({ where: { module: { testId } } });
  if (questionCount === 0) {
    return { error: "Đề chưa có câu hỏi nào." };
  }

  await prisma.test.update({
    where: { id: testId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath(`/admin/tests/${testId}`);
  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${testId}`);
}

export async function archiveTestAction(testId: string) {
  await requireRole("ADMIN");
  await prisma.test.update({ where: { id: testId }, data: { status: "ARCHIVED" } });
  revalidatePath("/admin/tests");
}

export async function deleteDraftTestAction(testId: string) {
  await requireRole("ADMIN");
  const test = await prisma.test.findUniqueOrThrow({ where: { id: testId } });
  if (test.status !== "DRAFT") {
    throw new Error("Chỉ xoá được đề đang ở trạng thái nháp — đề đã publish phải Archive thay vì xoá.");
  }
  await prisma.test.delete({ where: { id: testId } });
  revalidatePath("/admin/tests");
  redirect("/admin/tests");
}

/** Editing a published test never mutates it in place — see prisma/schema.prisma Test.rootTestId. */
export async function duplicateAsDraftAction(testId: string) {
  const { user } = await requireRole("ADMIN");
  const original = await prisma.test.findUniqueOrThrow({
    where: { id: testId },
    include: {
      modules: { include: { questions: { include: { choices: true, images: true } } }, orderBy: { orderIndex: "asc" } },
      scoreScales: true,
    },
  });

  const rootId = original.rootTestId ?? original.id;
  const latestVersion = await prisma.test.aggregate({
    where: { OR: [{ id: rootId }, { rootTestId: rootId }] },
    _max: { version: true },
  });

  const draft = await prisma.test.create({
    data: {
      title: original.title,
      type: original.type,
      timedMode: original.timedMode,
      allowRetakes: original.allowRetakes,
      status: "DRAFT",
      rootTestId: rootId,
      version: (latestVersion._max.version ?? original.version) + 1,
      createdByUserId: user.id,
    },
  });

  for (const mod of original.modules) {
    const newModule = await prisma.module.create({
      data: {
        testId: draft.id,
        section: mod.section,
        moduleNumber: mod.moduleNumber,
        difficultyTier: mod.difficultyTier,
        timeLimitSec: mod.timeLimitSec,
        orderIndex: mod.orderIndex,
      },
    });
    for (const q of mod.questions) {
      const newQuestion = await prisma.question.create({
        data: {
          moduleId: newModule.id,
          number: q.number,
          orderIndex: q.orderIndex,
          passageMd: q.passageMd,
          stemMd: q.stemMd,
          type: q.type,
          correctAnswer: q.correctAnswer as never,
          explanationMd: q.explanationMd,
          domain: q.domain,
          skill: q.skill,
          difficulty: q.difficulty,
          confidence: q.confidence,
          needsReview: q.needsReview,
        },
      });
      if (q.choices.length > 0) {
        await prisma.choice.createMany({
          data: q.choices.map((c) => ({
            questionId: newQuestion.id,
            label: c.label,
            textMd: c.textMd,
            orderIndex: c.orderIndex,
          })),
        });
      }
      if (q.images.length > 0) {
        await prisma.questionImage.createMany({
          data: q.images.map((img) => ({
            questionId: newQuestion.id,
            storageKey: img.storageKey,
            placeholder: img.placeholder,
            note: img.note,
          })),
        });
      }
    }
  }

  if (original.scoreScales.length > 0) {
    await prisma.scoreScale.createMany({
      data: original.scoreScales.map((s) => ({
        testId: draft.id,
        section: s.section,
        rawScore: s.rawScore,
        scaledScore: s.scaledScore,
      })),
    });
  }

  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${draft.id}/review`);
}

export async function saveScoreScalesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const testId = String(formData.get("testId"));
  const section = String(formData.get("section")) as "READING_WRITING" | "MATH";
  const rows = String(formData.get("rows") ?? ""); // "raw,scaled\n..." pasted/typed table

  const parsed = rows
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawStr, scaledStr] = line.split(",").map((s) => s.trim());
      return { rawScore: Number(rawStr), scaledScore: Number(scaledStr) };
    });

  if (parsed.some((r) => Number.isNaN(r.rawScore) || Number.isNaN(r.scaledScore))) {
    return { error: 'Mỗi dòng phải có dạng "điểm thô,điểm quy đổi", ví dụ "54,800".' };
  }

  await prisma.$transaction([
    prisma.scoreScale.deleteMany({ where: { testId, section } }),
    prisma.scoreScale.createMany({
      data: parsed.map((r) => ({ testId, section, rawScore: r.rawScore, scaledScore: r.scaledScore })),
    }),
  ]);

  revalidatePath(`/admin/tests/${testId}`);
  return { ok: "Đã lưu bảng quy đổi điểm." };
}

export async function createAssignmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("ADMIN");
  const testId = String(formData.get("testId"));
  const cohortId = String(formData.get("cohortId") ?? "") || null;
  const userId = String(formData.get("userId") ?? "") || null;
  const openAt = String(formData.get("openAt") ?? "");
  const closeAt = String(formData.get("closeAt") ?? "");
  const maxAttempts = Number(formData.get("maxAttempts") ?? 1);

  if (!cohortId && !userId) {
    return { error: "Chọn một nhóm hoặc một học viên cụ thể để giao đề." };
  }

  await prisma.assignment.create({
    data: {
      testId,
      cohortId,
      userId,
      openAt: openAt ? new Date(openAt) : null,
      closeAt: closeAt ? new Date(closeAt) : null,
      maxAttempts: Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 1,
    },
  });

  revalidatePath(`/admin/tests/${testId}`);
  return { ok: "Đã giao đề." };
}

export async function deleteAssignmentAction(assignmentId: string) {
  await requireRole("ADMIN");
  const a = await prisma.assignment.delete({ where: { id: assignmentId } });
  revalidatePath(`/admin/tests/${a.testId}`);
}
