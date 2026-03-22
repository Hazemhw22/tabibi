import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/** استجابة موحّدة لأخطاء Prisma في واجهات API */
export function jsonFromPrismaError(e: unknown, logContext: string) {
  console.error(logContext, e);

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    // الجدول غير موجود في قاعدة البيانات
    if (e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "جدول خطة العلاج غير موجود في قاعدة البيانات. من جذر المشروع شغّل: npx prisma db push",
        },
        { status: 500 },
      );
    }
  }

  const msg = e instanceof Error ? e.message : String(e);
  return NextResponse.json(
    {
      error: "حدث خطأ",
      ...(process.env.NODE_ENV === "development" && { detail: msg }),
    },
    { status: 500 },
  );
}
