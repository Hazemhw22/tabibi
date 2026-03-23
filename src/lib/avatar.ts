/** Default doctor images based on gender */
export const DOCTOR_AVATAR_MALE =
  "/happy-smiling-male-doctor-with-hand-present-something-empty-space-standing-isolate-on-transparent-background-png.png";
export const DOCTOR_AVATAR_FEMALE =
  "/doctor-woman-with-stethoscope-keeping-the-arms-crossed-on-isolated-transparent-background-png.png";

/** Default patient avatars based on gender */
export const PATIENT_AVATAR_MALE =
  "/3d-character-people-close-up-portrait-smiling-nice-3d-avartar-or-icon-png.png";
export const PATIENT_AVATAR_FEMALE =
  "/stunning-classic-stylized-portrait-of-a-woman-s-face-high-quality-free-png.png";

export function getDoctorAvatar(
  imageUrl: string | null | undefined,
  gender: string | null | undefined
): string {
  if (imageUrl) return imageUrl;
  return gender === "FEMALE" ? DOCTOR_AVATAR_FEMALE : DOCTOR_AVATAR_MALE;
}

export function getPatientAvatar(
  imageUrl: string | null | undefined,
  gender: string | null | undefined
): string {
  if (imageUrl) return imageUrl;
  return gender === "FEMALE" ? PATIENT_AVATAR_FEMALE : PATIENT_AVATAR_MALE;
}
