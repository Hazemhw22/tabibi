/**
 * تخصصات يُفترض وجودها في قوائم الاختيار (تسجيل، إعدادات، إعداد الطبيب).
 * تُدرَج تلقائياً عند طلب GET /api/specialties إن لم تكن موجودة (مطابقة لـ scripts/sql/specialties-nutrition-dermatology.sql).
 */
export const DEFAULT_SPECIALTY_SEEDS: {
  id: string;
  name: string;
  nameAr: string;
  icon: string | null;
}[] = [
  {
    id: "cm_spec_clinical_nutrition",
    name: "clinical-nutrition",
    nameAr: "التغذية العلاجية",
    icon: null,
  },
  {
    id: "cm_spec_derm_laser",
    name: "dermatology-laser",
    nameAr: "العناية بالبشرة والليزر",
    icon: null,
  },
  {
    id: "cm_spec_nutrition_derm",
    name: "nutrition-dermatology",
    nameAr: "التغذية العلاجية والعناية بالبشرة والليزر",
    icon: null,
  },
];
