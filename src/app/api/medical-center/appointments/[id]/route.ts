import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ADMIN_RECEPTION } from "@/lib/medical-center-roles";

const patchSchema = z.object({
  paymentStatus: z.enum(["PAID", "UNPAID"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_RECEPTION });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const data = patchSchema.parse(body);

    const { data: apt } = await supabaseAdmin
      .from("Appointment")
      .select("id, medicalCenterId")
      .eq("id", id)
      .maybeSingle();
    const mid = (apt as { medicalCenterId?: string | null } | null)?.medicalCenterId ?? null;
    if (mid !== centerId) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const now = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin
      .from("Appointment")
      .update({ paymentStatus: data.paymentStatus, updatedAt: now })
      .eq("id", id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // keep Payment table in sync when exists
    await supabaseAdmin.from("Payment").update({ status: data.paymentStatus, updatedAt: now }).eq("appointmentId", id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

