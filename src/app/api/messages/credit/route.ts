import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** GET Astra credit (مشرف المنصة فقط) */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const apiId = process.env.SMS_API_ID;
    if (!apiId) return NextResponse.json({ error: "SMS_API_ID غير مضبوط" }, { status: 400 });

    const baseUrl = process.env.SMS_CREDIT_URL || "http://astra.htd.ps/API/GetCredit.aspx";
    const url = `${baseUrl}?id=${encodeURIComponent(apiId)}`;
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: text || "فشل جلب الرصيد" }, { status: 502 });
    return NextResponse.json({ raw: text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

