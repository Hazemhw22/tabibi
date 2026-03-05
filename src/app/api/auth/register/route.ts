import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["PATIENT", "DOCTOR"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // 1. إنشاء المستخدم في Supabase Auth
    const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
      email_confirm: true,
      email: data.email,
      password: data.password,
      user_metadata: {
        name: data.name,
        phone: data.phone ?? "",
        role: data.role,
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("already registered") ||
        error.message.toLowerCase().includes("already exists")
      ) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم بالفعل" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "فشل إنشاء المستخدم" }, { status: 500 });
    }

    // 2. إنشاء record في جدول User (يُنشأ أيضاً عبر trigger لكن نضمنه هنا)
    await supabaseAdmin.from("User").upsert({
      id: userId,
      email: data.email,
      name: data.name,
      phone: data.phone ?? "",
      role: data.role,
    });

    // 3. إذا كان طبيباً، إنشاء record في جدول Doctor
    if (data.role === "DOCTOR") {
      const { data: specialty } = await supabaseAdmin
        .from("Specialty")
        .select("id")
        .limit(1)
        .single();

      if (specialty) {
        await supabaseAdmin.from("Doctor").insert({
          userId: userId,
          specialtyId: specialty.id,
          status: "PENDING",
          experienceYears: 0,
          consultationFee: 0,
          rating: 0,
          totalReviews: 0,
        });
      }
    }

    return NextResponse.json(
      { message: "تم إنشاء الحساب بنجاح", userId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 });
  }
}
