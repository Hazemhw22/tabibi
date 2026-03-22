/**
 * ربط اسم التخصص (عربي) بنوع خطة العلاج في الواجهة والتخزين.
 */
export type CarePlanType =
  | "OB_GYN"
  | "PEDIATRICS"
  | "ORTHOPEDICS"
  | "UROLOGY_NEPHROLOGY"
  | "CARDIOLOGY"
  | "DENTAL"
  | "GENERIC";

const NORMALIZE = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

/** يطابق جزئياً إن احتوى الاسم على أحد المفاتيح */
const RULES: { type: CarePlanType; keys: string[] }[] = [
  { type: "DENTAL", keys: ["اسنان", "سنان", "dent"] },
  { type: "OB_GYN", keys: ["نساء", "توليد", "ولاده", "obst", "gyn", "امراض النساء"] },
  { type: "PEDIATRICS", keys: ["اطفال", "أطفال", "طفل", "pediat"] },
  { type: "ORTHOPEDICS", keys: ["عظام", "مفاصل", "ortho"] },
  { type: "UROLOGY_NEPHROLOGY", keys: ["كلى", "كلا", "مسالك", "بول", "urolog", "nephro"] },
  { type: "CARDIOLOGY", keys: ["قلب", "قسطره", "cardio", "شرايين"] },
];

export function resolveCarePlanType(specialtyNameAr: string | null | undefined): CarePlanType {
  const n = NORMALIZE(specialtyNameAr ?? "");
  if (!n) return "GENERIC";
  for (const { type, keys } of RULES) {
    if (keys.some((k) => n.includes(NORMALIZE(k)))) return type;
  }
  return "GENERIC";
}

export const CARE_PLAN_LABELS: Record<CarePlanType, string> = {
  OB_GYN: "نساء وتوليد — حاسبة الحمل",
  PEDIATRICS: "طب الأطفال",
  ORTHOPEDICS: "العظام والمفاصل",
  UROLOGY_NEPHROLOGY: "الكلى والمسالك البولية",
  CARDIOLOGY: "أمراض القلب",
  DENTAL: "طب الأسنان",
  GENERIC: "خطة علاج عامة",
};
