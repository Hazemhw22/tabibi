/**
 * إضافة تخصص «تصوير الجنين» إن لم يكن موجوداً (لربطه بخطة FETAL_IMAGING في الواجهة).
 * تشغيل: npm run seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const name = "fetal-ultrasound";
  const nameAr = "تصوير الجنين";

  const existing = await prisma.specialty.findFirst({
    where: { OR: [{ name }, { nameAr }] },
  });

  if (existing) {
    console.log("التخصص موجود مسبقاً:", nameAr);
    return;
  }

  await prisma.specialty.create({
    data: {
      name,
      nameAr,
      icon: "📷",
    },
  });
  console.log("تمت إضافة التخصص:", nameAr);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
