import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertDoctorCanManageOffers, getDoctorRowForUser } from "@/lib/doctor-marketplace-guard";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  imageUrl: z.string().url().optional(),
  price: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }
    const patch: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title.trim();
    if (parsed.data.imageUrl !== undefined) patch.imageUrl = parsed.data.imageUrl.trim();
    if (parsed.data.price !== undefined) patch.price = parsed.data.price;
    if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;

    const { data, error } = await supabaseAdmin
      .from("DoctorOffer")
      .update(patch)
      .eq("id", id)
      .eq("doctorId", doctorId)
      .select("id, title, imageUrl, price, currency, isActive, createdAt, updatedAt")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "لم يتم العثور على العرض" }, { status: 404 });
    return NextResponse.json({ offer: data });
  } catch (e) {
    console.error("[doctor/offers/:id] PUT", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("DoctorOffer")
      .delete()
      .eq("id", id)
      .eq("doctorId", doctorId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[doctor/offers/:id] DELETE", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
