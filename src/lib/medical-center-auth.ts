import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getMedicalCenterIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("User")
    .select("medicalCenterId, role")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { medicalCenterId?: string | null; role?: string } | null;
  if (!row || row.role !== "MEDICAL_CENTER_ADMIN" || !row.medicalCenterId) return null;
  return row.medicalCenterId;
}

/** استجابة موحّدة عندما المركز لم يُعتمد بعد */
export function medicalCenterPendingResponse() {
  return NextResponse.json(
    {
      error:
        "المركز في انتظار موافقة إدارة المنصة. بعد قبول الاشتراك السنوي (1500 ₪) يمكن استخدام لوحة التحكم بالكامل.",
      code: "CENTER_PENDING_APPROVAL",
    },
    { status: 403 }
  );
}

export async function getMedicalCenterApprovalStatus(centerId: string): Promise<{
  approvalStatus: string | null;
  subscriptionEndDate: string | null;
  isActive: boolean | null;
}> {
  const { data } = await supabaseAdmin
    .from("MedicalCenter")
    .select("approvalStatus, subscriptionEndDate, isActive")
    .eq("id", centerId)
    .maybeSingle();
  const row = data as {
    approvalStatus?: string | null;
    subscriptionEndDate?: string | null;
    isActive?: boolean | null;
  } | null;
  return {
    approvalStatus: row?.approvalStatus ?? null,
    subscriptionEndDate: row?.subscriptionEndDate ?? null,
    isActive: row?.isActive ?? null,
  };
}

/** يُستخدم لعمليات التعديل (إضافة أطباء، حجوزات، إلخ) — لا للقراءة فقط مثل overview */
export async function assertMedicalCenterApproved(userId: string): Promise<
  | { ok: true; centerId: string }
  | { ok: false; response: NextResponse }
> {
  const centerId = await getMedicalCenterIdForUser(userId);
  if (!centerId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "ليس لديك صلاحية مركز طبي" }, { status: 403 }),
    };
  }
  const { approvalStatus } = await getMedicalCenterApprovalStatus(centerId);
  if (approvalStatus !== "APPROVED") {
    return { ok: false, response: medicalCenterPendingResponse() };
  }
  return { ok: true, centerId };
}
