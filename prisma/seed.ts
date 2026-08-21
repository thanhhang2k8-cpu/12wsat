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

  console.log("Seed xong:");
  console.log(`  Admin:    ${admin.email} / mật khẩu trong SEED_ADMIN_PASSWORD (.env)`);
  console.log(`  Học viên: ${student1.email} / hocvien123`);
  console.log(`  Học viên: ${student2.email} / hocvien123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
