import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { isDoctorOrStaffRole, isDoctorStaffRole } from "@/lib/doctor-team-roles";

export type DoctorRowForPage = {
  id: string;
  consultationFee?: number | null;
  status?: string | null;
  userId?: string | null;
  specialty?: { nameAr?: string | null } | null;
  medicalCenter?: { name?: string | null; nameAr?: string | null } | null;
};

/**
 * سياق الطبيب أو موظف عيادته — نفس صفوف Doctor لاستخدامها في صفحات الخادم.
 */
export async function requireDoctorPageContext(): Promise<{
  session: Session;
  doctor: DoctorRowForPage;
  isStaff: boolean;
  staffRoleLabel: string | null;
}> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  if (!isDoctorOrStaffRole(role)) {
    if (role === "PATIENT") redirect("/dashboard/patient");
    if (role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN") redirect("/dashboard/admin");
    if (
      role === "MEDICAL_CENTER_ADMIN" ||
      role === "MEDICAL_CENTER_RECEPTIONIST" ||
      role === "MEDICAL_CENTER_LAB_STAFF"
    ) {
      redirect("/dashboard/medical-center");
    }
    redirect("/");
  }

  const doctorIdFromSession = (session.user as { doctorId?: string | null }).doctorId;

  if (role === "DOCTOR") {
    const { data: doctor } = await supabaseAdmin
      .from("Doctor")
      .select("id, consultationFee, status, userId, specialty:Specialty(nameAr), medicalCenter:MedicalCenter(name, nameAr)")
      .eq("userId", session.user.id)
      .single();
    if (!doctor) redirect("/dashboard/doctor/setup");
    return {
      session,
      doctor: doctor as DoctorRowForPage,
      isStaff: false,
      staffRoleLabel: null,
    };
  }

  const targetDoctorId = doctorIdFromSession;
  if (!targetDoctorId) redirect("/login");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id, consultationFee, status, userId, specialty:Specialty(nameAr), medicalCenter:MedicalCenter(name, nameAr)")
    .eq("id", targetDoctorId)
    .single();
  if (!doctor) redirect("/login");

  const staffRole = (session.user as { doctorStaffRole?: string | null }).doctorStaffRole;
  const label =
    staffRole === "ASSISTANT" || staffRole === "DOCTOR_ASSISTANT"
      ? "مساعد طبيب"
      : staffRole === "RECEPTION" || staffRole === "DOCTOR_RECEPTION"
        ? "استقبال"
        : isDoctorStaffRole(role)
          ? "موظف عيادة"
          : null;

  return {
    session,
    doctor: doctor as DoctorRowForPage,
    isStaff: true,
    staffRoleLabel: label,
  };
}
