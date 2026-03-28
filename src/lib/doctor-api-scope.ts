import type { Session } from "next-auth";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";

/** معرف Doctor الفعّال من الجلسة (للطبيب أو لموظف عيادته). */
export function getSessionDoctorRecordId(session: Session | null): string | null {
  if (!session?.user) return null;
  return (session.user as { doctorId?: string | null }).doctorId ?? null;
}

export function assertStaffActsForDoctor(session: Session, bodyDoctorId: string): boolean {
  if (!isDoctorStaffRole(session.user.role)) return true;
  const sid = getSessionDoctorRecordId(session);
  return Boolean(sid && sid === bodyDoctorId);
}
