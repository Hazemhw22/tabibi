import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("DoctorProduct")
      .select(
        `
        id, name, imageUrl, price, currency, stock, isActive, pickupAvailable, deliveryAvailable,
        doctor:Doctor(
          id, locationId, whatsapp, status, visibleToPatients,
          user:User!Doctor_userId_fkey(name, phone)
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    const row = data as {
      isActive?: boolean;
      doctor?: {
        status?: string | null;
        visibleToPatients?: boolean | null;
        user?: { phone?: string | null };
      } | null;
    };

    if (!row.isActive) return NextResponse.json({ error: "غير متاح" }, { status: 404 });
    const d = row.doctor;
    if (!d || d.status !== "APPROVED" || d.visibleToPatients === false) {
      return NextResponse.json({ error: "غير متاح" }, { status: 404 });
    }

    const product = data as unknown as {
      id: string;
      name: string;
      imageUrl: string;
      price: number;
      currency?: string | null;
      stock: number;
      pickupAvailable: boolean;
      deliveryAvailable: boolean;
      doctor?: {
        id?: string;
        locationId?: string | null;
        whatsapp?: string | null;
        user?: { name?: string | null; phone?: string | null };
      } | null;
    };

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        currency: product.currency,
        stock: product.stock,
        pickupAvailable: product.pickupAvailable,
        deliveryAvailable: product.deliveryAvailable,
        doctor: {
          id: product.doctor?.id,
          locationId: product.doctor?.locationId ?? null,
          whatsapp: product.doctor?.whatsapp ?? null,
          userPhone: product.doctor?.user?.phone ?? null,
          user: { name: product.doctor?.user?.name ?? null },
        },
      },
    });
  } catch (e) {
    console.error("[public/doctor-products/:id] GET", e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
