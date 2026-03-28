import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  staffKind: z.enum(["RECEPTION", "ASSISTANT"]),
  salaryMonthly: z.number().nonnegative().optional(),
});

/** موظفو الطبيب (استقبال / مساعد) — إدارة من الطبيب فقط */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) return NextResponse.json({ error: "لم يُعثر على الطبيب" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("User")
      .select("id, name, email, phone, role, salaryMonthly, doctorStaffRole, createdAt, employerDoctorId")
      .eq("employerDoctorId", doctorId)
      .in("role", ["DOCTOR_RECEPTION", "DOCTOR_ASSISTANT"])
      .order("createdAt", { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }
    return NextResponse.json({ staff: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) {
      return NextResponse.json(
        { error: "لم يُعثر على ملف الطبيب في الجلسة — سجّل الخروج ثم الدخول مجدداً، أو أكمل إعداد الحساب." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const data = createSchema.parse(body);
    const email = data.email.trim().toLowerCase();
    const role = data.staffKind === "ASSISTANT" ? "DOCTOR_ASSISTANT" : "DOCTOR_RECEPTION";
    const staffRole = data.staffKind === "ASSISTANT" ? "ASSISTANT" : "RECEPTION";

    const { data: existing } = await supabaseAdmin.from("User").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "البريد مسجّل مسبقاً" }, { status: 400 });
    }

    let canonicalPhone = "";
    if (data.phone) {
      const phoneDigits = data.phone.replace(/\D/g, "");
      const normalizedPhone = phoneDigits.slice(-9);
      canonicalPhone = normalizedPhone.startsWith("0") ? normalizedPhone : "0" + normalizedPhone;
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email_confirm: true,
      email,
      password: data.password,
      user_metadata: {
        name: data.name,
        phone: canonicalPhone || undefined,
        role,
      },
    });

    if (authErr || !authData.user?.id) {
      return NextResponse.json({ error: authErr?.message ?? "فشل إنشاء الحساب" }, { status: 400 });
    }

    const userId = authData.user.id;

    const { error: uErr } = await supabaseAdmin.from("User").upsert({
      id: userId,
      email,
      name: data.name,
      phone: canonicalPhone || null,
      role,
      employerDoctorId: doctorId,
      doctorStaffRole: staffRole,
      salaryMonthly: data.salaryMonthly ?? null,
      medicalCenterId: null,
    });

    if (uErr) {
      console.error(uErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "فشل ربط الموظف بالطبيب" }, { status: 500 });
    }

    return NextResponse.json({ id: userId, message: "تم إنشاء حساب الموظف" }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
