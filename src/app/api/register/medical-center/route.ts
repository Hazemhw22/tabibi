import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createNotification, notifyPlatformAdmins } from "@/lib/notifications";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(9),
  centerName: z.string().min(2),
  centerAddress: z.string().min(3),
  centerCity: z.string().optional(),
  centerPhone: z.string().optional(),
});

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .slice(0, 80) || "center";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const email = data.email.trim();
    const { data: existing } = await supabaseAdmin.from("User").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجّل بالفعل" }, { status: 400 });
    }

    let baseSlug = slugify(data.centerName);
    const { data: slugClash } = await supabaseAdmin
      .from("MedicalCenter")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    if (slugClash) {
      baseSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const phoneDigits = data.phone.replace(/\D/g, "");
    const normalizedPhone = phoneDigits.slice(-9);
    const canonicalPhone = normalizedPhone.startsWith("0") ? normalizedPhone : "0" + normalizedPhone;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email_confirm: true,
      email,
      password: data.password,
      user_metadata: {
        name: data.name,
        phone: canonicalPhone,
        role: "MEDICAL_CENTER_ADMIN",
      },
    });

    if (authErr || !authData.user?.id) {
      return NextResponse.json({ error: authErr?.message ?? "فشل إنشاء الحساب" }, { status: 400 });
    }

    const userId = authData.user.id;

    const { data: center, error: cErr } = await supabaseAdmin
      .from("MedicalCenter")
      .insert({
        name: data.centerName,
        slug: baseSlug,
        nameAr: data.centerName,
        address: data.centerAddress,
        city: data.centerCity ?? "الخليل",
        phone: data.centerPhone ?? canonicalPhone,
        isActive: false,
        approvalStatus: "PENDING",
      })
      .select("id")
      .single();

    if (cErr || !center) {
      console.error(cErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "فشل إنشاء المركز" }, { status: 500 });
    }

    const { error: uErr } = await supabaseAdmin.from("User").upsert({
      id: userId,
      email,
      name: data.name,
      phone: canonicalPhone,
      role: "MEDICAL_CENTER_ADMIN",
      medicalCenterId: center.id,
    });

    if (uErr) {
      console.error(uErr);
      await supabaseAdmin.from("MedicalCenter").delete().eq("id", center.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "فشل ربط الحساب بالمركز" }, { status: 500 });
    }

    await createNotification({
      userId,
      title: "تم استلام طلب تسجيل المركز",
      message:
        "طلبك قيد المراجعة من إدارة المنصة. بعد الموافقة على الاشتراك السنوي (1500 ₪) يُفعَّل المركز بالكامل.",
      type: "info",
      link: "/dashboard/medical-center",
    });

    await notifyPlatformAdmins(
      "طلب تسجيل مركز طبي جديد",
      `المركز: ${data.centerName} — البريد: ${email}. راجع قائمة المراكز في لوحة الإدارة للموافقة على الاشتراك السنوي.`,
      "/dashboard/admin/medical-centers"
    );

    return NextResponse.json(
      {
        message:
          "تم إنشاء الحساب. سيتم مراجعة طلبك من إدارة المنصة؛ بعد قبول الاشتراك السنوي (1500 ₪) يُفعَّل المركز.",
        centerId: center.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
