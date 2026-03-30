import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const registerSchema = z
  .object({
    name: z.string().min(3),
    role: z.enum(["PATIENT", "DOCTOR"]),
    password: z.string().min(6),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    specialtyId: z.string().optional(),
    whatsapp: z.string().optional(),
  })
  .refine((d) => d.role !== "PATIENT" || (d.phone && d.phone.replace(/\D/g, "").length >= 9), {
    message: "رقم الهاتف مطلوب للمريض",
    path: ["phone"],
  })
  .refine((d) => d.role !== "DOCTOR" || (d.email && d.email.includes("@")), {
    message: "البريد الإلكتروني مطلوب للطبيب",
    path: ["email"],
  })
  .refine((d) => d.role !== "DOCTOR" || (d.phone && d.phone.replace(/\D/g, "").length >= 9), {
    message: "رقم الهاتف مطلوب للطبيب (9 أرقام على الأقل)",
    path: ["phone"],
  });

export async function POST(req: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "إعدادات الخادم ناقصة: SUPABASE_SERVICE_ROLE_KEY غير موجودة. لا يمكن حفظ User/Doctor بسبب RLS." },
        { status: 500 },
      );
    }
    const body = await req.json();
    const data = registerSchema.parse(body);

    const isPatient = data.role === "PATIENT";
    let email: string;
    let phone: string | null = null;

    if (isPatient) {
      const phoneDigits = (data.phone ?? "").replace(/\D/g, "");
      const normalizedPhone = phoneDigits.slice(-9);
      const canonicalPhone = normalizedPhone.startsWith("0") ? normalizedPhone : "0" + normalizedPhone;
      phone = canonicalPhone;
      email = `phone.${canonicalPhone.replace(/\D/g, "")}@tabibi.local`;

      const { data: existingUser } = await supabaseAdmin
        .from("User")
        .select("id")
        .or(`phone.eq.${canonicalPhone},phone.eq.${normalizedPhone},phone.eq.972${normalizedPhone}`)
        .maybeSingle();
      if (existingUser) {
        return NextResponse.json({ error: "رقم الهاتف مسجّل بالفعل" }, { status: 400 });
      }
    } else {
      email = (data.email ?? "").trim();
      const phoneDigits = (data.phone ?? "").replace(/\D/g, "");
      const normalizedPhone = phoneDigits.slice(-9);
      phone = normalizedPhone ? (normalizedPhone.startsWith("0") ? normalizedPhone : "0" + normalizedPhone) : null;
      const { data: existingUser } = await supabaseAdmin.from("User").select("id").eq("email", email).maybeSingle();
      if (existingUser) {
        return NextResponse.json({ error: "البريد الإلكتروني مسجّل بالفعل" }, { status: 400 });
      }
    }

    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email_confirm: true,
      email,
      password: data.password,
      user_metadata: {
        name: data.name,
        phone: phone ?? "",
        role: data.role,
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists")
      ) {
        return NextResponse.json(
          { error: isPatient ? "رقم الهاتف مسجّل بالفعل" : "البريد الإلكتروني مسجّل بالفعل" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 });
    }

    const { error: userUpsertErr } = await supabaseAdmin.from("User").upsert({
      id: userId,
      email,
      name: data.name,
      phone: phone ?? "",
      role: data.role,
    });
    if (userUpsertErr) {
      console.error("[register] User upsert:", userUpsertErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "فشل حفظ بيانات الحساب" }, { status: 500 });
    }

    if (data.role === "DOCTOR") {
      const requested = data.specialtyId?.trim() || null;
      let specialtyId: string | null = null;
      if (requested) {
        const { data: specOk } = await supabaseAdmin.from("Specialty").select("id").eq("id", requested).maybeSingle();
        if (!specOk?.id) {
          await supabaseAdmin.from("User").delete().eq("id", userId);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          return NextResponse.json(
            { error: "التخصص المختار غير موجود — حدّث الصفحة واختر تخصصاً من القائمة." },
            { status: 400 },
          );
        }
        specialtyId = specOk.id;
      } else {
        const { data: firstSpec } = await supabaseAdmin.from("Specialty").select("id").limit(1).maybeSingle();
        specialtyId = firstSpec?.id ?? null;
      }
      if (!specialtyId) {
        await supabaseAdmin.from("User").delete().eq("id", userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: "لا يوجد تخصص في النظام — أضف تخصصات من لوحة الإدارة ثم أعد المحاولة." },
          { status: 500 },
        );
      }

      const whatsappRaw = (data.whatsapp ?? "").trim().replace(/\D/g, "").slice(-9)
        ? (data.whatsapp ?? "").trim()
        : (data.phone ?? "").trim();
      const whatsappDigits = whatsappRaw.replace(/\D/g, "").slice(-9);
      const whatsappValue = whatsappDigits ? `972${whatsappDigits}` : null;

      const { error: doctorInsertErr } = await supabaseAdmin
        .from("Doctor")
        .upsert(
          {
        userId,
        specialtyId,
        whatsapp: whatsappValue,
        status: "PENDING",
        experienceYears: 0,
        consultationFee: 0,
        rating: 0,
        totalReviews: 0,
          },
          { onConflict: "userId" },
        );
      if (doctorInsertErr) {
        console.error("[register] Doctor insert failed:", doctorInsertErr.code, doctorInsertErr.message, doctorInsertErr.details);
        await supabaseAdmin.from("User").delete().eq("id", userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          {
            error:
              "تعذر إنشاء ملف الطبيب. تحقق من اتصال قاعدة البيانات أو أن جدول Doctor متوافق مع المخطط. إن استمرت المشكلة، راجع سجلات الخادم.",
          },
          { status: 500 },
        );
      }
    }

    /* ── إشعار ترحيب ─────────────────────────────────────────── */
    const welcomeMsg = data.role === "DOCTOR"
      ? "مرحباً بك في منصة طبيبي! سيتم مراجعة حسابك والرد عليك قريباً."
      : "مرحباً بك في منصة طبيبي! يمكنك الآن حجز مواعيدك ومتابعة معاملاتك.";

    await createNotification({
      userId:  userId,
      title:   "مرحباً بك في طبيبي 👋",
      message: welcomeMsg,
      type:    "info",
      link:    data.role === "DOCTOR" ? "/dashboard/doctor" : "/dashboard/patient",
    });

    return NextResponse.json(
      { message: "تم إنشاء الحساب بنجاح", userId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
