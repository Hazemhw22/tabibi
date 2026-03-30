import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertDoctorCanManageProducts, getDoctorRowForUser } from "@/lib/doctor-marketplace-guard";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url(),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  pickupAvailable: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
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

    const gate = assertDoctorCanManageProducts(doctor.specialty?.nameAr ?? null);
    if (!gate.ok) {
      return NextResponse.json({ products: [], warning: gate.message }, { status: 200 });
    }

    const doctorId = doctor.id;
    const { data, error } = await supabaseAdmin
      .from("DoctorProduct")
      .select("id, name, description, imageUrl, price, currency, stock, isActive, pickupAvailable, deliveryAvailable, createdAt, updatedAt")
      .eq("doctorId", doctorId)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ products: data ?? [] });
  } catch (e) {
    console.error("[doctor/products] GET", e);
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
    const gate = assertDoctorCanManageProducts(doctor.specialty?.nameAr ?? null);
    if (!gate.ok) return NextResponse.json({ error: gate.message ?? "غير مصرح" }, { status: 403 });
    const doctorId = doctor.id;

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("DoctorProduct")
      .insert({
        doctorId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        imageUrl: parsed.data.imageUrl.trim(),
        price: parsed.data.price,
        stock: parsed.data.stock ?? 0,
        isActive: parsed.data.isActive ?? true,
        pickupAvailable: parsed.data.pickupAvailable ?? true,
        deliveryAvailable: parsed.data.deliveryAvailable ?? true,
      })
      .select("id, name, description, imageUrl, price, currency, stock, isActive, pickupAvailable, deliveryAvailable, createdAt, updatedAt")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (e) {
    console.error("[doctor/products] POST", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
