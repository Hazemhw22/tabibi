import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findPatientUsersByPhone } from "@/lib/patient-account";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim() ?? "";
    const users = await findPatientUsersByPhone(phone);
    return NextResponse.json({ users });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
