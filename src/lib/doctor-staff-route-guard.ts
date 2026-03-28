import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";

/** يمنع موظفي عيادة الطبيب من صفحات حصرية للطبيب (الإعدادات، التقارير، …). */
export function redirectDoctorStaffToAppointments(session: Session | null) {
  if (session?.user?.role && isDoctorStaffRole(session.user.role)) {
    redirect("/dashboard/doctor/appointments");
  }
}
