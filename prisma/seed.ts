import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ARGON2_OPTS = { algorithm: 2 as const, memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@12wsat.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now-123";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: "Mentor",
      passwordHash: await hash(adminPassword, ARGON2_OPTS),
      role: "ADMIN",
      maxDevices: 5,
    },
  });

  const cohort = await prisma.cohort.upsert({
    where: { name: "SAT — Lớp T8" },
    update: {},
    create: { name: "SAT — Lớp T8" },
  });

  const student1 = await prisma.user.upsert({
    where: { email: "ha@12wsat.local" },
    update: {},
    create: {
      email: "ha@12wsat.local",
      fullName: "Nguyễn Thị Hà",
      passwordHash: await hash("hocvien123", ARGON2_OPTS),
      role: "STUDENT",
      cohortId: cohort.id,
      maxDevices: 2,
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "minh@12wsat.local" },
    update: {},
    create: {
      email: "minh@12wsat.local",
      fullName: "Trần Quang Minh",
      passwordHash: await hash("hocvien123", ARGON2_OPTS),
      role: "STUDENT",
      cohortId: cohort.id,
      maxDevices: 2,
    },
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

  console.log("Seed xong:");
  console.log(`  Admin:    ${admin.email} / mật khẩu trong SEED_ADMIN_PASSWORD (.env)`);
  console.log(`  Học viên: ${student1.email} / hocvien123`);
  console.log(`  Học viên: ${student2.email} / hocvien123`);
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
