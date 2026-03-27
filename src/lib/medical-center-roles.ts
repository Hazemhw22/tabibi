/** أدوار موظفي المركز الطبي (تتطابق مع Role في قاعدة البيانات) */
export const CENTER_ROLE_ADMIN = "MEDICAL_CENTER_ADMIN";
export const CENTER_ROLE_RECEPTIONIST = "MEDICAL_CENTER_RECEPTIONIST";
export const CENTER_ROLE_LAB = "MEDICAL_CENTER_LAB_STAFF";

export const MEDICAL_CENTER_STAFF_ROLES = [
  CENTER_ROLE_ADMIN,
  CENTER_ROLE_RECEPTIONIST,
  CENTER_ROLE_LAB,
] as const;

export type MedicalCenterStaffRole = (typeof MEDICAL_CENTER_STAFF_ROLES)[number];

export function isMedicalCenterStaffRole(role: string | undefined): boolean {
  return role != null && (MEDICAL_CENTER_STAFF_ROLES as readonly string[]).includes(role);
}

/** مدير المركز فقط */
export const CENTER_ROLES_ADMIN_ONLY = [CENTER_ROLE_ADMIN] as const;

/** مدير + استقبال — مواعيد، طوارئ، مرضى، أطباء للعرض */
export const CENTER_ROLES_ADMIN_RECEPTION = [CENTER_ROLE_ADMIN, CENTER_ROLE_RECEPTIONIST] as const;

/** مدير + مختبر — رفع نتائج */
export const CENTER_ROLES_ADMIN_LAB = [CENTER_ROLE_ADMIN, CENTER_ROLE_LAB] as const;

/** كل موظفي المركز */
export const CENTER_ROLES_ALL_STAFF = MEDICAL_CENTER_STAFF_ROLES;
