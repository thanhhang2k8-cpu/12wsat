import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getObjectUrl } from "@/lib/storage";
import { ReviewWorkspace } from "./ReviewWorkspace";

export const dynamic = "force-dynamic";

export default async function TestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      sourceFiles: { orderBy: { createdAt: "asc" } },
      parseJobs: { orderBy: { createdAt: "desc" }, take: 5 },
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          questions: {
            orderBy: { orderIndex: "asc" },
            include: { choices: { orderBy: { orderIndex: "asc" } }, images: true },
          },
        },
      },
    },
  });

  if (!test) notFound();

  const sourceFile = test.sourceFiles[0] ?? null;
  const sourceUrl = sourceFile ? await getObjectUrl(sourceFile.storageKey) : null;
  const latestJob = test.parseJobs[0] ?? null;

  const modules = await Promise.all(
    test.modules.map(async (m) => ({
      id: m.id,
      section: m.section,
      moduleNumber: m.moduleNumber,
      difficultyTier: m.difficultyTier,
      questions: await Promise.all(
        m.questions.map(async (q) => ({
          id: q.id,
          number: q.number,
          passageMd: q.passageMd,
          stemMd: q.stemMd,
          type: q.type,
          correctAnswer: q.correctAnswer as string | string[],
          explanationMd: q.explanationMd,
          domain: q.domain ?? "",
          skill: q.skill ?? "",
          difficulty: q.difficulty ?? "MEDIUM",
          confidence: q.confidence,
          needsReview: q.needsReview,
          choices: q.choices.map((c) => ({ id: c.id, label: c.label, textMd: c.textMd })),
          images: await Promise.all(
            q.images.map(async (img) => ({
              id: img.id,
              note: img.note,
              url: await getObjectUrl(img.storageKey),
            })),
          ),
        })),
      ),
    })),
  );

  const flaggedCount = modules.flatMap((m) => m.questions).filter((q) => q.needsReview).length;

  return (
    <ReviewWorkspace
      testId={test.id}
      testTitle={test.title}
      testStatus={test.status}
      sourceFileName={sourceFile?.originalName ?? null}
      sourceUrl={sourceUrl}
      sourceMimeType={sourceFile?.mimeType ?? null}
      parseJobStatus={latestJob?.status ?? null}
      parseJobError={latestJob?.errorMessage ?? null}
      modules={modules}
      flaggedCount={flaggedCount}
    />
  );
}
