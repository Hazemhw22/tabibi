import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MEDICAL_CENTER_STAFF_ROLES } from "@/lib/medical-center-roles";

export type MedicalCenterStaffContext = {
  centerId: string;
  role: string;
};

export async function getMedicalCenterStaffContext(userId: string): Promise<MedicalCenterStaffContext | null> {
  const { data } = await supabaseAdmin
    .from("User")
    .select("medicalCenterId, role")
    .eq("id", userId)
    .maybeSingle();
  const row = data as { medicalCenterId?: string | null; role?: string } | null;
  if (!row?.medicalCenterId || !row.role) return null;
  if (!(MEDICAL_CENTER_STAFF_ROLES as readonly string[]).includes(row.role)) return null;
  return { centerId: row.medicalCenterId, role: row.role };
}

/** معرف المركز لأي موظف مركز (مدير، استقبال، مختبر) */
export async function getMedicalCenterIdForUser(userId: string): Promise<string | null> {
  const ctx = await getMedicalCenterStaffContext(userId);
  return ctx?.centerId ?? null;
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

export type ApprovedCenterGate =
  | { ok: true; centerId: string; role: string }
  | { ok: false; response: NextResponse };

/**
 * مركز معتمد + موظف مركز (مدير/استقبال/مختبر).
 * يمكن تقييد الأدوار بـ roles (مثلاً مدير فقط للحسابات).
 */
export async function assertApprovedMedicalCenter(
  userId: string,
  options?: { roles?: readonly string[] }
): Promise<ApprovedCenterGate> {
  const ctx = await getMedicalCenterStaffContext(userId);
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: "ليس لديك صلاحية مركز طبي" }, { status: 403 }),
    };
  }
  if (options?.roles && !options.roles.includes(ctx.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "ليس لديك صلاحية لهذه العملية" }, { status: 403 }),
    };
  }
  const { approvalStatus } = await getMedicalCenterApprovalStatus(ctx.centerId);
  if (approvalStatus !== "APPROVED") {
    return { ok: false, response: medicalCenterPendingResponse() };
  }
  return { ok: true, centerId: ctx.centerId, role: ctx.role };
}

/** توافق مع الكود القديم: أي موظف مركز معتمد */
export async function assertMedicalCenterApproved(userId: string): Promise<ApprovedCenterGate> {
  return assertApprovedMedicalCenter(userId);
}
