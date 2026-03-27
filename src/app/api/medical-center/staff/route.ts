import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLE_LAB, CENTER_ROLE_RECEPTIONIST, CENTER_ROLES_ADMIN_ONLY } from "@/lib/medical-center-roles";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum([CENTER_ROLE_RECEPTIONIST, CENTER_ROLE_LAB]),
  salaryMonthly: z.number().nonnegative().optional(),
  educationLevel: z.string().optional(),
  staffType: z.string().optional(),
  attendanceNotes: z.string().optional(),
});

const STAFF_ROLES_LIST = [CENTER_ROLE_RECEPTIONIST, CENTER_ROLE_LAB];

/** موظفو المركز (استقبال / مختبر) — عرض وإضافة وإزالة الربط */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { data, error } = await supabaseAdmin
      .from("User")
      .select("id, name, email, phone, role, salaryMonthly, staffType, educationLevel, createdAt")
      .eq("medicalCenterId", centerId)
      .in("role", STAFF_ROLES_LIST)
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json();
    const data = createSchema.parse(body);
    const email = data.email.trim().toLowerCase();

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
        role: data.role,
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
      role: data.role,
      medicalCenterId: centerId,
      salaryMonthly: data.salaryMonthly ?? null,
      educationLevel: data.educationLevel?.trim() || null,
      staffType: data.staffType?.trim() || null,
      attendanceNotes: data.attendanceNotes?.trim() || null,
    });

    if (uErr) {
      console.error(uErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "فشل ربط الموظف بالمركز" }, { status: 500 });
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

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("id")?.trim();
    if (!staffId) {
      return NextResponse.json({ error: "معرّف الموظف مطلوب" }, { status: 400 });
    }
    if (staffId === session.user.id) {
      return NextResponse.json({ error: "لا يمكنك إزالة حسابك الحالي" }, { status: 400 });
    }

    const { data: row } = await supabaseAdmin
      .from("User")
      .select("id, medicalCenterId, role")
      .eq("id", staffId)
      .maybeSingle();
    const u = row as { id?: string; medicalCenterId?: string | null; role?: string } | null;
    if (!u || u.medicalCenterId !== centerId || !STAFF_ROLES_LIST.includes(String(u.role))) {
      return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
    }

    const { error: upErr } = await supabaseAdmin
      .from("User")
      .update({ role: "PATIENT", medicalCenterId: null })
      .eq("id", staffId);
    if (upErr) {
      console.error(upErr);
      return NextResponse.json({ error: "فشل تحديث الحساب" }, { status: 500 });
    }

    await supabaseAdmin.auth.admin.updateUserById(staffId, {
      user_metadata: { role: "PATIENT" },
    });

    return NextResponse.json({ message: "تم إلغاء ربط الموظف بالمركز" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
