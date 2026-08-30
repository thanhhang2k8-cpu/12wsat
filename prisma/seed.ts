import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Same hashPassword() used by the login flow (src/lib/auth/session.ts +
// src/lib/actions/auth.ts) — one place decides the argon2id parameters, so
// a hash written by seeding can never drift from what login verifies against.

async function upsertUser(opts: {
  email: string;
  password: string;
  fullName: string;
  role: "ADMIN" | "STUDENT";
  cohortId?: string;
  maxDevices?: number;
}) {
  return prisma.user.upsert({
    where: { email: opts.email },
    // Deliberately empty: re-running the seed must never reset a password
    // an admin already changed through /admin/users, or flip someone back
    // to ACTIVE after being suspended. Seeding only ever creates.
    update: {},
    create: {
      email: opts.email,
      fullName: opts.fullName,
      passwordHash: await hashPassword(opts.password),
      role: opts.role,
      cohortId: opts.cohortId,
      maxDevices: opts.maxDevices ?? 2,
    },
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL và SEED_ADMIN_PASSWORD phải được đặt trong .env (hoặc biến môi trường Vercel) " +
        "trước khi chạy seed — không có admin mặc định để tránh lộ mật khẩu đoán được.",
    );
  }

  const admin = await upsertUser({
    email: adminEmail,
    password: adminPassword,
    fullName: process.env.SEED_ADMIN_NAME ?? "Mentor",
    role: "ADMIN",
    maxDevices: 5,
  });

  const cohort = await prisma.cohort.upsert({
    where: { name: "SAT — Lớp T8" },
    update: {},
    create: { name: "SAT — Lớp T8" },
  });

  // A real student account, only created when explicitly configured — set
  // SEED_STUDENT_EMAIL / SEED_STUDENT_PASSWORD (and optionally
  // SEED_STUDENT_NAME) to seed it, the same way as the admin above.
  let realStudentEmail: string | null = null;
  if (process.env.SEED_STUDENT_EMAIL && process.env.SEED_STUDENT_PASSWORD) {
    const realStudent = await upsertUser({
      email: process.env.SEED_STUDENT_EMAIL,
      password: process.env.SEED_STUDENT_PASSWORD,
      fullName: process.env.SEED_STUDENT_NAME ?? "Học viên",
      role: "STUDENT",
      cohortId: cohort.id,
    });
    realStudentEmail = realStudent.email;
  }

  // Demo accounts — always present, harmless placeholders for quick manual
  // testing. Not meant to be real logins; feel free to delete them from
  // /admin/users once you have real students.
  const student1 = await upsertUser({
    email: "ha@12wsat.local",
    password: "hocvien123",
    fullName: "Nguyễn Thị Hà",
    role: "STUDENT",
    cohortId: cohort.id,
  });
  const student2 = await upsertUser({
    email: "minh@12wsat.local",
    password: "hocvien123",
    fullName: "Trần Quang Minh",
    role: "STUDENT",
    cohortId: cohort.id,
  });

  const existingTest = await prisma.test.findFirst({ where: { title: "Đề mẫu — Reading & Writing (rút gọn)" } });
  if (!existingTest) {
    const test = await prisma.test.create({
      data: {
        title: "Đề mẫu — Reading & Writing (rút gọn)",
        type: "PRACTICE_SET",
        status: "PUBLISHED",
        publishedAt: new Date(),
        createdByUserId: admin.id,
        modules: {
          create: {
            section: "READING_WRITING",
            moduleNumber: 1,
            difficultyTier: "STANDARD",
            timeLimitSec: 32 * 60,
            orderIndex: 0,
            questions: {
              create: [
                {
                  number: 1,
                  orderIndex: 0,
                  stemMd:
                    "The committee, initially skeptical of the proposal, ______ its position after reviewing the pilot program's results.",
                  type: "MCQ",
                  correctAnswer: "A",
                  explanationMd:
                    "\"Initially skeptical\" contrasted with a change after reviewing results signals a reversal.",
                  domain: "Standard English Conventions",
                  skill: "Form, Structure, and Sense",
                  difficulty: "EASY",
                  confidence: 1,
                  needsReview: false,
                  choices: {
                    create: [
                      { label: "A", textMd: "reversed", orderIndex: 0 },
                      { label: "B", textMd: "maintained", orderIndex: 1 },
                      { label: "C", textMd: "questioned", orderIndex: 2 },
                      { label: "D", textMd: "announced", orderIndex: 3 },
                    ],
                  },
                },
                {
                  number: 2,
                  orderIndex: 1,
                  passageMd:
                    "Marine biologists have long assumed that coral bleaching events are driven almost entirely by rising sea temperatures. Recent fieldwork suggests the relationship is more provisional than the standard model implies.",
                  stemMd: "Which choice completes the text with the most logical and precise word or phrase?",
                  type: "MCQ",
                  correctAnswer: "B",
                  explanationMd:
                    "The passage describes moderate stress leading to higher thermal tolerance, so the missing word should mean the opposite of weaken.",
                  domain: "Craft and Structure",
                  skill: "Words in Context",
                  difficulty: "MEDIUM",
                  confidence: 1,
                  needsReview: false,
                  choices: {
                    create: [
                      { label: "A", textMd: "diminish", orderIndex: 0 },
                      { label: "B", textMd: "strengthen", orderIndex: 1 },
                      { label: "C", textMd: "obscure", orderIndex: 2 },
                      { label: "D", textMd: "interrupt", orderIndex: 3 },
                    ],
                  },
                },
              ],
            },
          },
        },
        scoreScales: {
          create: [
            { section: "READING_WRITING", rawScore: 2, scaledScore: 800 },
            { section: "READING_WRITING", rawScore: 1, scaledScore: 650 },
            { section: "READING_WRITING", rawScore: 0, scaledScore: 400 },
          ],
        },
      },
    });
    await prisma.assignment.create({
      data: { testId: test.id, cohortId: cohort.id, maxAttempts: 3 },
    });
  }

  // A second, short-timed sample exercising Phase 3: two sections, adaptive
  // module 2 (EASY vs HARD), timer, scoring. Time limits are shortened to a
  // few minutes on purpose — this is a fixture for testing the player, not
  // real exam content.
  const existingAdaptiveTest = await prisma.test.findFirst({ where: { title: "Đề mẫu — Adaptive (rút gọn để test Phase 3)" } });
  if (!existingAdaptiveTest) {
    const mkChoices = (correct: string) =>
      ["A", "B", "C", "D"].map((label, i) => ({
        label,
        textMd: label === correct ? "đáp án đúng" : `đáp án sai ${label}`,
        orderIndex: i,
      }));

    const adaptiveTest = await prisma.test.create({
      data: {
        title: "Đề mẫu — Adaptive (rút gọn để test Phase 3)",
        type: "FULL_TEST",
        status: "PUBLISHED",
        timedMode: "TIMED",
        publishedAt: new Date(),
        createdByUserId: admin.id,
        modules: {
          create: [
            {
              section: "READING_WRITING",
              moduleNumber: 1,
              difficultyTier: "STANDARD",
              timeLimitSec: 5 * 60,
              orderIndex: 0,
              questions: {
                create: [1, 2].map((n) => ({
                  number: n,
                  orderIndex: n - 1,
                  stemMd: `[RW module 1] Câu ${n} — chọn đáp án đúng.`,
                  type: "MCQ",
                  correctAnswer: "A",
                  explanationMd: "Đây là câu mẫu để test bộ chấm điểm.",
                  domain: "Information and Ideas",
                  skill: "Central Ideas & Details",
                  difficulty: "MEDIUM",
                  confidence: 1,
                  needsReview: false,
                  choices: { create: mkChoices("A") },
                })),
              },
            },
            {
              section: "READING_WRITING",
              moduleNumber: 2,
              difficultyTier: "EASY",
              timeLimitSec: 5 * 60,
              orderIndex: 1,
              questions: {
                create: [{
                  number: 3,
                  orderIndex: 0,
                  stemMd: "[RW module 2 — EASY] Câu 3 — chọn đáp án đúng.",
                  type: "MCQ",
                  correctAnswer: "A",
                  explanationMd: "Câu mẫu bản dễ.",
                  domain: "Craft and Structure",
                  skill: "Words in Context",
                  difficulty: "EASY",
                  confidence: 1,
                  needsReview: false,
                  choices: { create: mkChoices("A") },
                }],
              },
            },
            {
              section: "READING_WRITING",
              moduleNumber: 2,
              difficultyTier: "HARD",
              timeLimitSec: 5 * 60,
              orderIndex: 2,
              questions: {
                create: [{
                  number: 3,
                  orderIndex: 0,
                  stemMd: "[RW module 2 — HARD] Câu 3 — chọn đáp án đúng.",
                  type: "MCQ",
                  correctAnswer: "A",
                  explanationMd: "Câu mẫu bản khó.",
                  domain: "Craft and Structure",
                  skill: "Words in Context",
                  difficulty: "HARD",
                  confidence: 1,
                  needsReview: false,
                  choices: { create: mkChoices("A") },
                }],
              },
            },
            {
              section: "MATH",
              moduleNumber: 1,
              difficultyTier: "STANDARD",
              timeLimitSec: 5 * 60,
              orderIndex: 3,
              questions: {
                create: [4, 5].map((n) => ({
                  number: n,
                  orderIndex: n - 4,
                  stemMd: `[Math module 1] Câu ${n} — chọn đáp án đúng.`,
                  type: "MCQ",
                  correctAnswer: "A",
                  explanationMd: "Câu mẫu Math.",
                  domain: "Algebra",
                  skill: "Linear equations",
                  difficulty: "MEDIUM",
                  confidence: 1,
                  needsReview: false,
                  choices: { create: mkChoices("A") },
                })),
              },
            },
            {
              section: "MATH",
              moduleNumber: 2,
              difficultyTier: "EASY",
              timeLimitSec: 5 * 60,
              orderIndex: 4,
              questions: {
                create: [{
                  number: 6,
                  orderIndex: 0,
                  stemMd: "[Math module 2 — EASY] Câu 6.",
                  type: "GRID_IN",
                  correctAnswer: ["3/5", "0.6"],
                  explanationMd: "3/5 = 0.6 — cả hai cách viết đều được chấp nhận.",
                  domain: "Problem-Solving and Data Analysis",
                  skill: "Ratios",
                  difficulty: "EASY",
                  confidence: 1,
                  needsReview: false,
                }],
              },
            },
            {
              section: "MATH",
              moduleNumber: 2,
              difficultyTier: "HARD",
              timeLimitSec: 5 * 60,
              orderIndex: 5,
              questions: {
                create: [{
                  number: 6,
                  orderIndex: 0,
                  stemMd: "[Math module 2 — HARD] Câu 6.",
                  type: "GRID_IN",
                  correctAnswer: ["3/5", "0.6"],
                  explanationMd: "3/5 = 0.6 — cả hai cách viết đều được chấp nhận.",
                  domain: "Problem-Solving and Data Analysis",
                  skill: "Ratios",
                  difficulty: "HARD",
                  confidence: 1,
                  needsReview: false,
                }],
              },
            },
          ],
        },
        scoreScales: {
          create: [
            { section: "READING_WRITING", rawScore: 3, scaledScore: 800 },
            { section: "READING_WRITING", rawScore: 2, scaledScore: 700 },
            { section: "READING_WRITING", rawScore: 1, scaledScore: 550 },
            { section: "READING_WRITING", rawScore: 0, scaledScore: 400 },
            { section: "MATH", rawScore: 3, scaledScore: 800 },
            { section: "MATH", rawScore: 2, scaledScore: 700 },
            { section: "MATH", rawScore: 1, scaledScore: 550 },
            { section: "MATH", rawScore: 0, scaledScore: 400 },
          ],
        },
      },
    });
    await prisma.assignment.create({
      data: { testId: adaptiveTest.id, cohortId: cohort.id, maxAttempts: 5 },
    });
  }

  console.log("Seed xong:");
  console.log(`  Admin:    ${admin.email}`);
  if (realStudentEmail) console.log(`  Học viên: ${realStudentEmail}`);
  console.log(`  Học viên (demo): ${student1.email} / hocvien123`);
  console.log(`  Học viên (demo): ${student2.email} / hocvien123`);
  console.log(`  Đề mẫu:   đã publish + giao cho nhóm "${cohort.name}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
