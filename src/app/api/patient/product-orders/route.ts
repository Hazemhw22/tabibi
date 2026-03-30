import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  fulfillmentMethod: z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddress: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "PATIENT") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    const { productId, quantity, fulfillmentMethod, deliveryAddress } = parsed.data;

    const { data: product, error: productErr } = await supabaseAdmin
      .from("DoctorProduct")
      .select("id, doctorId, price, currency, stock, isActive, pickupAvailable, deliveryAvailable")
      .eq("id", productId)
      .maybeSingle();

    if (productErr) return NextResponse.json({ error: productErr.message }, { status: 500 });
    if (!product || !(product as { isActive?: boolean }).isActive) {
      return NextResponse.json({ error: "المنتج غير متاح" }, { status: 404 });
    }

    const p = product as {
      id: string;
      doctorId: string;
      price: number;
      currency?: string | null;
      stock?: number | null;
      pickupAvailable?: boolean | null;
      deliveryAvailable?: boolean | null;
    };

    if (p.stock != null && p.stock < quantity) {
      return NextResponse.json({ error: "الكمية غير متوفرة" }, { status: 400 });
    }

    if (fulfillmentMethod === "PICKUP" && p.pickupAvailable === false) {
      return NextResponse.json({ error: "الاستلام من العيادة غير متاح لهذا المنتج" }, { status: 400 });
    }
    if (fulfillmentMethod === "DELIVERY" && p.deliveryAvailable === false) {
      return NextResponse.json({ error: "التوصيل غير متاح لهذا المنتج" }, { status: 400 });
    }
    if (fulfillmentMethod === "DELIVERY" && !(deliveryAddress?.trim() || "")) {
      return NextResponse.json({ error: "أدخل عنوان التوصيل" }, { status: 400 });
    }

    const unitPrice = Number(p.price) || 0;
    const totalPrice = unitPrice * quantity;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("ProductOrder")
      .insert({
        productId: p.id,
        doctorId: p.doctorId,
        patientUserId: session.user.id,
        quantity,
        unitPrice,
        totalPrice,
        currency: p.currency ?? "ILS",
        fulfillmentMethod,
        deliveryAddress: fulfillmentMethod === "DELIVERY" ? (deliveryAddress?.trim() || null) : null,
        paymentMethod: "COD",
        status: "PENDING",
      })
      .select("id")
      .single();

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    // Best-effort: decrement stock (non-transactional). In production you'd do RPC/transaction.
    if (p.stock != null) {
      await supabaseAdmin
        .from("DoctorProduct")
        .update({ stock: Math.max(0, p.stock - quantity) })
        .eq("id", p.id);
    }

    return NextResponse.json({ orderId: order?.id }, { status: 201 });
  } catch (e) {
    console.error("[patient/product-orders] POST", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

