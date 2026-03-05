import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

async function main() {
  console.log("🌱 Starting seed...");

  // Specialties
  const specialties = await Promise.all([
    prisma.specialty.upsert({
      where: { name: "general" },
      update: {},
      create: { name: "general", nameAr: "طب عام", icon: "🩺" },
    }),
    prisma.specialty.upsert({
      where: { name: "dentist" },
      update: {},
      create: { name: "dentist", nameAr: "طب أسنان", icon: "🦷" },
    }),
    prisma.specialty.upsert({
      where: { name: "pediatrician" },
      update: {},
      create: { name: "pediatrician", nameAr: "طب أطفال", icon: "👶" },
    }),
    prisma.specialty.upsert({
      where: { name: "cardiologist" },
      update: {},
      create: { name: "cardiologist", nameAr: "طب قلب", icon: "❤️" },
    }),
    prisma.specialty.upsert({
      where: { name: "dermatologist" },
      update: {},
      create: { name: "dermatologist", nameAr: "طب جلدية", icon: "🌿" },
    }),
    prisma.specialty.upsert({
      where: { name: "orthopedic" },
      update: {},
      create: { name: "orthopedic", nameAr: "جراحة عظام", icon: "🦴" },
    }),
    prisma.specialty.upsert({
      where: { name: "gynecologist" },
      update: {},
      create: { name: "gynecologist", nameAr: "نسائية وتوليد", icon: "🌸" },
    }),
    prisma.specialty.upsert({
      where: { name: "neurologist" },
      update: {},
      create: { name: "neurologist", nameAr: "طب أعصاب", icon: "🧠" },
    }),
  ]);
  console.log(`✅ Created ${specialties.length} specialties`);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
