import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const specialtyId = body.specialtyId as string | undefined;
    const newSpecialtyName = body.newSpecialtyName as string | undefined;
    const imageUrl = body.imageUrl as string | undefined;

    const userId = session.user.id;
    const email = session.user.email ?? "";
    const name = session.user.name ?? "";

    // 1) التأكد من وجود المستخدم في جدول User
    await supabaseAdmin.from("User").upsert(
      {
        id: userId,
        email,
        name,
        image: imageUrl ?? null,
        role: "DOCTOR",
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    const { data: existing } = await supabaseAdmin
      .from("Doctor")
      .select("id")
      .eq("userId", userId)
      .maybeSingle();

    if (existing) {
      if (imageUrl) {
        await supabaseAdmin.from("User").update({ image: imageUrl }).eq("id", userId);
      }
      return NextResponse.json({ doctorId: existing.id });
    }

    let finalSpecialtyId = specialtyId;

    if (newSpecialtyName?.trim()) {
      const { data: newSpec, error: insertSpecErr } = await supabaseAdmin
        .from("Specialty")
        .insert({ name: newSpecialtyName.trim().toLowerCase().replace(/\s+/g, "-"), nameAr: newSpecialtyName.trim(), icon: "🩺" })
        .select("id")
        .single();
      if (insertSpecErr || !newSpec) {
        return NextResponse.json({ error: "فشل إضافة التخصص الجديد" }, { status: 500 });
      }
      finalSpecialtyId = newSpec.id;
    }

    if (!finalSpecialtyId) {
      const { data: first } = await supabaseAdmin.from("Specialty").select("id").limit(1).maybeSingle();
      if (!first) {
        return NextResponse.json({ error: "اختر تخصصاً أو أضف تخصصاً جديداً" }, { status: 400 });
      }
      finalSpecialtyId = first.id;
    }

    const { data: doctor, error } = await supabaseAdmin
      .from("Doctor")
      .insert({
        userId,
        specialtyId: finalSpecialtyId,
        status: "PENDING",
        experienceYears: 0,
        consultationFee: 0,
        rating: 0,
        totalReviews: 0,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ doctorId: "exists" });
      console.error("Doctor setup insert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctorId: doctor.id }, { status: 201 });
  } catch (e) {
    console.error("Doctor setup:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "خطأ غير متوقع" },
      { status: 500 }
    );
  }
}
