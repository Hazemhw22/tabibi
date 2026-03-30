import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertDoctorCanManageProducts, getDoctorRowForUser } from "@/lib/doctor-marketplace-guard";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  pickupAvailable: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
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
    const gate = assertDoctorCanManageProducts(doctor.specialty?.nameAr ?? null);
    if (!gate.ok) return NextResponse.json({ error: gate.message ?? "غير مصرح" }, { status: 403 });
    const doctorId = doctor.id;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
    if (parsed.data.description !== undefined) patch.description = parsed.data.description?.trim() || null;
    if (parsed.data.imageUrl !== undefined) patch.imageUrl = parsed.data.imageUrl.trim();
    if (parsed.data.price !== undefined) patch.price = parsed.data.price;
    if (parsed.data.stock !== undefined) patch.stock = parsed.data.stock;
    if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;
    if (parsed.data.pickupAvailable !== undefined) patch.pickupAvailable = parsed.data.pickupAvailable;
    if (parsed.data.deliveryAvailable !== undefined) patch.deliveryAvailable = parsed.data.deliveryAvailable;

    const { data, error } = await supabaseAdmin
      .from("DoctorProduct")
      .update(patch)
      .eq("id", id)
      .eq("doctorId", doctorId)
      .select("id, name, description, imageUrl, price, currency, stock, isActive, pickupAvailable, deliveryAvailable, createdAt, updatedAt")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "لم يتم العثور على المنتج" }, { status: 404 });
    return NextResponse.json({ product: data });
  } catch (e) {
    console.error("[doctor/products/:id] PUT", e);
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
    const gate = assertDoctorCanManageProducts(doctor.specialty?.nameAr ?? null);
    if (!gate.ok) return NextResponse.json({ error: gate.message ?? "غير مصرح" }, { status: 403 });
    const doctorId = doctor.id;

    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("DoctorProduct")
      .delete()
      .eq("id", id)
      .eq("doctorId", doctorId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[doctor/products/:id] DELETE", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
