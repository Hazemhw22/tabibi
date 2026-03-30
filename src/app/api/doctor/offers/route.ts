import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertDoctorCanManageOffers, getDoctorRowForUser } from "@/lib/doctor-marketplace-guard";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2),
  imageUrl: z.string().url(),
  price: z.coerce.number().min(0),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const { doctor, error: dErr } = await getDoctorRowForUser(session.user.id);
    if (dErr) return NextResponse.json({ error: dErr }, { status: 500 });
    if (!doctor) return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 404 });
    const gate = assertDoctorCanManageOffers(doctor.specialty?.nameAr ?? null);
    if (!gate.ok) {
      return NextResponse.json({ offers: [], warning: gate.message }, { status: 200 });
    }

    const doctorId = doctor.id;
    const { data, error } = await supabaseAdmin
      .from("DoctorOffer")
      .select("id, title, imageUrl, price, currency, isActive, createdAt, updatedAt")
      .eq("doctorId", doctorId)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offers: data ?? [] });
  } catch (e) {
    console.error("[doctor/offers] GET", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "DOCTOR") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const { doctor, error: dErr } = await getDoctorRowForUser(session.user.id);
    if (dErr) return NextResponse.json({ error: dErr }, { status: 500 });
    if (!doctor) return NextResponse.json({ error: "ملف الطبيب غير موجود" }, { status: 404 });
    const gate = assertDoctorCanManageOffers(doctor.specialty?.nameAr ?? null);
    if (!gate.ok) return NextResponse.json({ error: gate.message ?? "غير مصرح" }, { status: 403 });

    const doctorId = doctor.id;

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { title, imageUrl, price, isActive } = parsed.data;
    const { data, error } = await supabaseAdmin
      .from("DoctorOffer")
      .insert({
        doctorId,
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        price,
        isActive: isActive ?? true,
      })
      .select("id, title, imageUrl, price, currency, isActive, createdAt, updatedAt")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offer: data }, { status: 201 });
  } catch (e) {
    console.error("[doctor/offers] POST", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

