/**
 * ربط اسم التخصص (عربي) بنوع خطة العلاج في الواجهة والتخزين.
 */
export type CarePlanType =
  | "FETAL_IMAGING"
  | "OB_GYN"
  | "PEDIATRICS"
  | "ORTHOPEDICS"
  | "NEPHROLOGY"
  | "UROLOGY_NEPHROLOGY"
  | "CARDIOLOGY"
  | "PSYCHIATRY"
  | "OPHTHALMOLOGY"
  | "ENT"
  | "PHYSICAL_MEDICINE_REHAB"
  | "SPORTS_MEDICINE"
  | "OCCUPATIONAL_MEDICINE"
  | "GASTROENTEROLOGY"
  | "ENDOCRINOLOGY"
  | "RHEUMATOLOGY"
  | "INFECTIOUS_DISEASE"
  | "ONCOLOGY"
  | "HEMATOLOGY"
  | "PULMONOLOGY"
  /** زراعة الأسنان الفورية والجراحية */
  | "DENTAL_IMPLANT_IMMEDIATE_SURGICAL"
  /** زراعة الأسنان وتجميل الأسنان */
  | "DENTAL_IMPLANT_COSMETIC"
  | "DENTAL"
  | "GENERIC";

/** خطط بنموذج سريري منظم (أقسام عربية مع عناوين إنجليزية مساعدة) */
export const STRUCTURED_INTL_CARE_PLAN_TYPES: readonly CarePlanType[] = [
  "PSYCHIATRY",
  "OPHTHALMOLOGY",
  "ENT",
  "PHYSICAL_MEDICINE_REHAB",
  "SPORTS_MEDICINE",
  "OCCUPATIONAL_MEDICINE",
  "GASTROENTEROLOGY",
  "ENDOCRINOLOGY",
  "RHEUMATOLOGY",
  "NEPHROLOGY",
  "INFECTIOUS_DISEASE",
  "ONCOLOGY",
  "HEMATOLOGY",
  "PULMONOLOGY",
] as const;

export function isStructuredIntlCarePlan(t: CarePlanType): boolean {
  return (STRUCTURED_INTL_CARE_PLAN_TYPES as readonly string[]).includes(t);
}

const NORMALIZE = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

/** يطابق جزئياً إن احتوى الاسم على أحد المفاتيح (الأكثر تحديداً أولاً) */
const RULES: { type: CarePlanType; keys: string[] }[] = [
  {
    type: "DENTAL_IMPLANT_IMMEDIATE_SURGICAL",
    keys: [
      "زراعة الاسنان الفوريه والجراحيه",
      "زراعة الاسنان الفورية والجراحية",
      "زراعة الاسنان الفوريه",
      "زراعة الاسنان الفورية",
      "الزراعة الفورية",
      "الزراعه الفوريه",
      "زراعة فورية",
      "زراعه فوريه",
      "فورية وجراحية",
      "فوريه وجراحيه",
      "زراعة الاسنان الجراحية",
      "زراعة الاسنان الجراحيه",
      "زراعه جراحيه",
      "زراعة جراحية",
      "immediate implant",
      "immediate dental",
      "surgical implant",
    ],
  },
  {
    type: "DENTAL_IMPLANT_COSMETIC",
    keys: [
      "زراعة وتجميل الاسنان",
      "زراعة وتجميل الأسنان",
      "زراعه وتجميل الاسنان",
      "زراعة وتجميل",
      "زراعه وتجميل",
      "تجميل الاسنان وزراعة",
      "تجميل الأسنان وزراعة",
      "تجميل وزراعة",
      "زراعة الاسنان وتجميل",
      "زراعة الأسنان وتجميل",
      "تجميل الاسنان",
      "تجميل الأسنان",
      "طب تجميل الاسنان",
      "cosmetic implant",
      "esthetic implant",
      "aesthetic dentistry",
    ],
  },
  { type: "DENTAL", keys: ["اسنان", "سنان", "dent"] },
  {
    type: "FETAL_IMAGING",
    keys: [
      "تصوير الجنين",
      "تصوير جنين",
      "سونار جنين",
      "فحص الجنين",
      "الموجات فوق الصوتية للجنين",
      "موجات صوتيه للجنين",
      "موجات صوتية للجنين",
      "fetal ultrasound",
      "ob ultrasound",
    ],
  },
  { type: "OB_GYN", keys: ["نساء", "توليد", "ولاده", "obst", "gyn", "امراض النساء"] },
  { type: "PEDIATRICS", keys: ["اطفال", "أطفال", "طفل", "pediat"] },
  { type: "ORTHOPEDICS", keys: ["عظام", "مفاصل", "ortho"] },
  /** طب الكلى الباطني — قبل المسالك لتفادي ابتلاع «كلى» من جراحة المسالك */
  {
    type: "NEPHROLOGY",
    keys: [
      "طب الكلى",
      "كلى الباطن",
      "امراض الكلى",
      "أمراض الكلى",
      "زراعه الكلى",
      "زراعة الكلى",
      "غسيل الكلى",
      "dialysis",
      "nephrolog",
      "ckd",
    ],
  },
  {
    type: "UROLOGY_NEPHROLOGY",
    keys: [
      "مسالك",
      "بول",
      "urolog",
      "المسالك البوليه",
      "المسالك البولية",
      "جراحه المسالك",
      "جراحة المسالك",
      "جراحه الكلى",
      "جراحة الكلى",
      "prost",
      "بروستات",
    ],
  },
  { type: "CARDIOLOGY", keys: ["قلب", "قسطره", "cardio", "شرايين"] },
  {
    type: "PSYCHIATRY",
    keys: ["نفسي", "psychiat", "سلوكي", "ادمان", "إدمان", "addict", "mental health"],
  },
  { type: "OPHTHALMOLOGY", keys: ["عيون", "ophthalm", "بصريات", "شبكيه", "شبكية", "optic"] },
  {
    type: "ENT",
    keys: ["انف والاذن", "انف والأذن", "انف واذن", "حنجره", "حنجرة", "otorhinolaryngology", "ent", "اذن", "أذن"],
  },
  {
    type: "PHYSICAL_MEDICINE_REHAB",
    keys: [
      "طبيعي والتاهيل",
      "طبيعي والتأهيل",
      "الطبيعي والتاهيل",
      "الطبيعي والتأهيل",
      "فيزيائي",
      "تأهيل",
      "physiatr",
      "rehab",
      "pm&r",
    ],
  },
  { type: "SPORTS_MEDICINE", keys: ["رياضي", "sports med", "issabet", "رياضيه", "رياضية"] },
  {
    type: "OCCUPATIONAL_MEDICINE",
    keys: ["مهني", "occupational", "بيئه العمل", "بيئة العمل", "صحه مهنيه", "صحة مهنية"],
  },
  {
    type: "GASTROENTEROLOGY",
    keys: ["هضمي", "كبد", "gastro", "hepat", "امعاء", "أمعاء", "قولون", "endoscop", "مناظير"],
  },
  {
    type: "ENDOCRINOLOGY",
    keys: ["غدد", "سكري", "endocrin", "درقيه", "درقية", "thyroid", "diabet"],
  },
  { type: "RHEUMATOLOGY", keys: ["روماتيزم", "rheumat", "مفاصل التهابيه", "مفاصل التهابية"] },
  {
    type: "INFECTIOUS_DISEASE",
    keys: ["معديه", "معدي", "infectious", "اوبئه", "أوبئة", "تلوث", "ميكروب", "hiv", "سل"],
  },
  {
    type: "ONCOLOGY",
    keys: ["اورام", "أورام", "oncolo", "كيميائي", "اشعاعي", "إشعاعي", "ورم", "cancer"],
  },
  {
    type: "HEMATOLOGY",
    keys: ["امراض الدم", "أمراض الدم", "hematol", "انيميا", "أنيميا", "تخثر", "وراثه دمويه", "وراثة دموية"],
  },
  {
    type: "PULMONOLOGY",
    keys: ["صدرية", "pulmon", "تنفس", "ربو", "تليف رئوي", "copd", "جهاز تنفس"],
  },
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
  FETAL_IMAGING: "تصوير الجنين — صور السونار والتقرير",
  OB_GYN: "نساء وتوليد — حاسبة الحمل",
  PEDIATRICS: "طب الأطفال",
  ORTHOPEDICS: "العظام والمفاصل",
  NEPHROLOGY: "طب الكلى — خطة سريرية منظمة",
  UROLOGY_NEPHROLOGY: "المسالك البولية والجراحة",
  CARDIOLOGY: "أمراض القلب",
  PSYCHIATRY: "الطب النفسي — تقييم وخطة علاج",
  OPHTHALMOLOGY: "طب العيون — فحص وخطة",
  ENT: "أنف وأذن وحنجرة — خطة سريرية",
  PHYSICAL_MEDICINE_REHAB: "الطب الطبيعي والتأهيل",
  SPORTS_MEDICINE: "الطب الرياضي",
  OCCUPATIONAL_MEDICINE: "الطب المهني",
  GASTROENTEROLOGY: "الجهاز الهضمي والكبد",
  ENDOCRINOLOGY: "الغدد الصماء والسكري",
  RHEUMATOLOGY: "الروماتيزم والمناعة",
  INFECTIOUS_DISEASE: "الأمراض المعدية",
  ONCOLOGY: "طب الأورام — علاج ومتابعة",
  HEMATOLOGY: "أمراض الدم",
  PULMONOLOGY: "الأمراض الصدرية والتنفس",
  DENTAL_IMPLANT_IMMEDIATE_SURGICAL: "زراعة الأسنان الفورية والجراحية",
  DENTAL_IMPLANT_COSMETIC: "زراعة الأسنان وتجميل الأسنان",
  DENTAL: "طب الأسنان",
  GENERIC: "خطة علاج عامة",
};

/** خطط تعتمد جدول البنود والتكاليف (مثل الأسنان العامة) */
export function carePlanUsesItemsCostGrid(t: CarePlanType): boolean {
  return (
    t === "GENERIC" ||
    t === "DENTAL" ||
    t === "DENTAL_IMPLANT_IMMEDIATE_SURGICAL" ||
    t === "DENTAL_IMPLANT_COSMETIC"
  );
}

/** مخطط الأسنان التفاعلي (32 سنّاً) في صفحة المرضى */
export function carePlanShowsDentalToothChart(t: CarePlanType): boolean {
  return t === "DENTAL_IMPLANT_IMMEDIATE_SURGICAL" || t === "DENTAL_IMPLANT_COSMETIC";
}
