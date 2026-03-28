/** موظفو الطبيب (عيادة خاصة) — ليسوا موظفي مركز طبي */

export const DOCTOR_STAFF_ROLES = ["DOCTOR_RECEPTION", "DOCTOR_ASSISTANT"] as const;
export type DoctorStaffRoleId = (typeof DOCTOR_STAFF_ROLES)[number];

export function isDoctorStaffRole(role: string | undefined | null): boolean {
  return role === "DOCTOR_RECEPTION" || role === "DOCTOR_ASSISTANT";
}

export function isDoctorOrStaffRole(role: string | undefined | null): boolean {
  return role === "DOCTOR" || isDoctorStaffRole(role);
}

/** تسميات عربية لعرض الواجهة */
export const DOCTOR_STAFF_ROLE_LABELS: Record<string, string> = {
  DOCTOR_RECEPTION: "استقبال",
  DOCTOR_ASSISTANT: "مساعد طبيب",
  RECEPTION: "استقبال",
  ASSISTANT: "مساعد طبيب",
};
