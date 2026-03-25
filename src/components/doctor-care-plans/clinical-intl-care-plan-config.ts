import type { CarePlanType } from "@/lib/specialty-plan-registry";

/** زر ثابت يضيف صفاً مستقلاً من هذا النوع (يمكن تكرار النوع أكثر من مرة) */
export type IntlOptionalButtonBlock = {
  blockId: string;
  /** نص الزر */
  buttonLabelAr: string;
  buttonLabelEn?: string;
  /** عنوان الصف بعد الإضافة */
  rowLabelAr: string;
  rowLabelEn?: string;
  multiline?: boolean;
  rows?: number;
  placeholderAr?: string;
  /** حد أقصى لعدد الصفوف من هذا النوع داخل المجموعة */
  maxRows?: number;
};

/** حقل نصي تقليدي */
export type IntlFieldText = {
  kind?: "text";
  key: string;
  labelAr: string;
  labelEn?: string;
  optional?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholderAr?: string;
};

/**
 * أزرار اختيارية ثابتة — كل زر يضيف بنداً منفصلاً (ليس كل البنود في مربع واحد).
 * يُخزَّن تحت optionalRows[groupKey] في JSON التخصص.
 */
export type IntlFieldOptionalButtons = {
  kind: "optionalButtons";
  groupKey: string;
  labelAr?: string;
  labelEn?: string;
  hint?: string;
  blocks: IntlOptionalButtonBlock[];
  maxRowsPerGroup?: number;
};

export type IntlField = IntlFieldText | IntlFieldOptionalButtons;

export type IntlSection = {
  id: string;
  titleAr: string;
  titleEn?: string;
  hint?: string;
  fields: IntlField[];
};

export type IntlPlanLayout = {
  accentBorder: string;
  accentBg: string;
  printTitleAr: string;
  sections: IntlSection[];
  /** لم يعد يُستخدم — مواعيد المتابعة على مستوى جذر خطة العلاج في اللوحة الأم */
  showFollowUpAppointments?: boolean;
};

/** مفتاح التخزين في JSON خطة العلاج */
export const INTL_CLINICAL_DATA_KEY = "intlClinical" as const;

/** مواعيد متابعة منظمة داخل كائن التخصص — خارج الحقول النصية */
export const INTL_FOLLOW_UP_VISITS_KEY = "followUpVisits" as const;

/** صفوف مضافة عبر أزرار «بند اختياري» — مفتاح المجموعة = groupKey من الإعداد */
export const INTL_OPTIONAL_ROWS_KEY = "optionalRows" as const;

export type IntlOptionalRow = {
  id: string;
  blockId: string;
  value: string;
};

export type IntlFollowUpVisit = {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm — اختياري؛ كل طبيب يحدد أسلوب مواعيده */
  time?: string;
  /** دور / فتحة / وردية بصياغة الطبيب (مثال: دور صباحي، الفتحة 3) — اختياري */
  slot?: string;
  /** فحوصات، تحويل، ملاحظة — اختياري */
  note?: string;
};

export const INTL_CLINICAL_PLAN_LAYOUTS: Partial<Record<CarePlanType, IntlPlanLayout>> = {
  PSYCHIATRY: {
    accentBorder: "border-violet-200",
    accentBg: "bg-violet-50/40",
    printTitleAr: "ملخص الطب النفسي / خطة العلاج",
    sections: [
      {
        id: "present",
        titleAr: "العرض والتاريخ المرضي",
        titleEn: "Presenting concerns & HPI",
        hint: "صف الشكوى، البداية، التطور، العوامل المفاقمة/المخففة، والوظائف المتأثرة.",
        fields: [
          { key: "chief", labelAr: "الشكوى الرئيسية", labelEn: "Chief complaint", multiline: true, rows: 3 },
          { key: "hpi", labelAr: "تاريخ الاضطراب الحالي", labelEn: "HPI", multiline: true, rows: 4 },
          { key: "pastPsych", labelAr: "التاريخ النفسي والعلاجات السابقة", labelEn: "Past psychiatric history", multiline: true, rows: 3 },
        ],
      },
      {
        id: "mse",
        titleAr: "الفحص الذهني والمخاطر",
        titleEn: "MSE & safety",
        fields: [
          { key: "mse", labelAr: "ملخص الفحص الذهني", labelEn: "MSE summary", multiline: true, rows: 4 },
          { key: "risk", labelAr: "المخاطر (ذاتية/موضوعية)", labelEn: "Risk assessment", multiline: true, rows: 3 },
        ],
      },
      {
        id: "dx",
        titleAr: "التشخيص والتصنيف",
        titleEn: "Diagnosis / formulation",
        fields: [
          { key: "dx", labelAr: "التشخيص أو صياغة الحالة", labelEn: "Diagnosis / formulation", multiline: true, rows: 3 },
          { key: "comorb", labelAr: "الأمراض المصاحبة ذات الصلة", labelEn: "Relevant comorbidities", multiline: true, rows: 2 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة والمتابعة",
        titleEn: "Plan & follow-up",
        hint: "للمواعيد التقويمية استخدم قسم «مواعيد المتابعة» أسفل النموذج.",
        fields: [
          { key: "meds", labelAr: "الدواء (جرعات/تعديلات)", labelEn: "Pharmacotherapy", multiline: true, rows: 3 },
          { key: "therapy", labelAr: "العلاج النفسي / التثقيف", labelEn: "Psychotherapy / psychoeducation", multiline: true, rows: 3 },
          {
            key: "follow",
            labelAr: "المتابعة والأهداف القصيرة (نصي)",
            labelEn: "Follow-up & short-term goals",
            optional: true,
            multiline: true,
            rows: 3,
          },
        ],
      },
    ],
  },
  OPHTHALMOLOGY: {
    accentBorder: "border-emerald-200",
    accentBg: "bg-emerald-50/35",
    printTitleAr: "ملخص طب العيون",
    sections: [
      {
        id: "hx",
        titleAr: "الشكوى والتاريخ",
        titleEn: "History",
        fields: [
          { key: "cc", labelAr: "الشكوى الرئيسية", labelEn: "Chief complaint", multiline: true, rows: 2 },
          { key: "hx", labelAr: "تاريخ العين والجراحات والأدوية", labelEn: "Ocular history & meds", multiline: true, rows: 3 },
        ],
      },
      {
        id: "va",
        titleAr: "حدة البصر والقياسات",
        titleEn: "VA & key measures",
        fields: [
          { key: "va", labelAr: "حدة البصر (يمين / يسار) — مع التصحيح إن وجد", labelEn: "Visual acuity OD/OS", multiline: true, rows: 2 },
          { key: "iop", labelAr: "ضغط العين / قياسات أخرى", labelEn: "IOP / other metrics", multiline: true, rows: 2 },
        ],
      },
      {
        id: "exam",
        titleAr: "الفحص السريري",
        titleEn: "Examination",
        fields: [
          { key: "exam", labelAr: "القرنية / العدسة / الشبكية / عنق العصب — حسب الفحص", labelEn: "Slit-lamp / fundus notes", multiline: true, rows: 5 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة",
        titleEn: "Plan",
        fields: [
          { key: "dx", labelAr: "التشخيص العامل", labelEn: "Working diagnosis", multiline: true, rows: 2 },
          { key: "plan", labelAr: "العلاج / الصف / الجراحة / التحويل", labelEn: "Treatment / referral", multiline: true, rows: 4 },
        ],
      },
    ],
  },
  ENT: {
    accentBorder: "border-teal-200",
    accentBg: "bg-teal-50/35",
    printTitleAr: "ملخص أنف وأذن وحنجرة",
    sections: [
      {
        id: "hx",
        titleAr: "الشكوى والتاريخ",
        titleEn: "History",
        fields: [
          { key: "cc", labelAr: "الشكوى الرئيسية", labelEn: "Chief complaint", multiline: true, rows: 2 },
          { key: "hx", labelAr: "المدة، الأنف/الأذن/الحنجرة، الحمى، السمع", labelEn: "ENT history", multiline: true, rows: 3 },
        ],
      },
      {
        id: "exam",
        titleAr: "الفحص",
        titleEn: "Physical exam",
        fields: [
          { key: "otoscopy", labelAr: "الأذن (قناة، طبلة)", labelEn: "Otoscopy", multiline: true, rows: 2 },
          { key: "noseThroat", labelAr: "الأنف / الفم / البلعوم", labelEn: "Nose & throat", multiline: true, rows: 3 },
          { key: "neck", labelAr: "الرقبة — غدد، حركة", labelEn: "Neck exam", multiline: true, rows: 2 },
        ],
      },
      {
        id: "inv",
        titleAr: "التحاليل والتصوير",
        titleEn: "Investigations",
        fields: [
          { key: "inv", labelAr: "مطلوب / نتائج", labelEn: "Tests & results", multiline: true, rows: 3 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة",
        titleEn: "Plan",
        fields: [
          { key: "dx", labelAr: "التشخيص العامل", labelEn: "Working diagnosis", multiline: true, rows: 2 },
          { key: "plan", labelAr: "دواء / إجراء / تحويل", labelEn: "Management", multiline: true, rows: 4 },
        ],
      },
    ],
  },
  PHYSICAL_MEDICINE_REHAB: {
    accentBorder: "border-sky-200",
    accentBg: "bg-sky-50/35",
    printTitleAr: "ملخص الطب الطبيعي والتأهيل",
    sections: [
      {
        id: "goals",
        titleAr: "الأهداف الوظيفية",
        titleEn: "Functional goals",
        fields: [
          { key: "baseline", labelAr: "الخط الأساس (مثال: المشي، الدرج، العمل)", labelEn: "Baseline function", multiline: true, rows: 3 },
          { key: "goals", labelAr: "أهداف قابلة للقياس (SMART)", labelEn: "SMART goals", multiline: true, rows: 3 },
        ],
      },
      {
        id: "impair",
        titleAr: "العجز والعلاج",
        titleEn: "Impairments & therapy",
        fields: [
          { key: "impair", labelAr: "القيود الحركية / الألم / التوازن", labelEn: "Impairments", multiline: true, rows: 3 },
          { key: "modalities", labelAr: "التدخلات (تمرين، كهرباء، تثقيف...)", labelEn: "Modalities", multiline: true, rows: 4 },
        ],
      },
      {
        id: "barriers",
        titleAr: "العوائق والمعدات",
        titleEn: "Barriers & equipment",
        fields: [
          { key: "barriers", labelAr: "عوائق بيئية أو اجتماعية", labelEn: "Barriers", multiline: true, rows: 2 },
          { key: "equipment", labelAr: "أجهزة مساعدة / تعديل المنزل", labelEn: "Equipment / home mods", multiline: true, rows: 2 },
        ],
      },
      {
        id: "fu",
        titleAr: "المتابعة النصية",
        titleEn: "Follow-up notes",
        hint: "المواعيد بالتاريخ واليوم في القسم المنفصل أسفل الصفحة.",
        fields: [
          {
            key: "fu",
            labelAr: "معايير التقدم أو ملاحظات (اختياري)",
            labelEn: "Progress criteria / notes",
            optional: true,
            multiline: true,
            rows: 3,
          },
        ],
      },
    ],
  },
  SPORTS_MEDICINE: {
    accentBorder: "border-lime-200",
    accentBg: "bg-lime-50/30",
    printTitleAr: "ملخص الطب الرياضي",
    sections: [
      {
        id: "mech",
        titleAr: "الآلية والحدث",
        titleEn: "Mechanism & context",
        fields: [
          { key: "mech", labelAr: "آلية الإصابة والرياضة/الموقع", labelEn: "Mechanism", multiline: true, rows: 3 },
          { key: "onField", labelAr: "تقييم مبدئي (إن وُجد)", labelEn: "On-field assessment", multiline: true, rows: 2 },
        ],
      },
      {
        id: "exam",
        titleAr: "الفحص",
        titleEn: "Physical exam",
        fields: [
          { key: "exam", labelAr: "فحص مفصلي / وظيفي موجز", labelEn: "Focused exam", multiline: true, rows: 4 },
        ],
      },
      {
        id: "rtp",
        titleAr: "العودة للنشاط",
        titleEn: "Return to play / work",
        fields: [
          { key: "rtp", labelAr: "معايير RTP المأخوذة بعين الاعتبار", labelEn: "RTP criteria", multiline: true, rows: 3 },
          { key: "grad", labelAr: "خطة تدريجية (مراحل)", labelEn: "Graduated plan", multiline: true, rows: 3 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة",
        titleEn: "Plan",
        fields: [
          { key: "inv", labelAr: "تصوير / تحويل", labelEn: "Imaging / referral", multiline: true, rows: 2 },
          { key: "plan", labelAr: "علاج محافظ / جراحي / تثقيف", labelEn: "Management", multiline: true, rows: 3 },
        ],
      },
    ],
  },
  OCCUPATIONAL_MEDICINE: {
    accentBorder: "border-stone-200",
    accentBg: "bg-stone-50/50",
    printTitleAr: "ملخص الطب المهني",
    sections: [
      {
        id: "exposure",
        titleAr: "المهمة والتعرض",
        titleEn: "Job & exposure",
        fields: [
          { key: "job", labelAr: "المهمة، الوردية، الجهد البدني", labelEn: "Job demands", multiline: true, rows: 3 },
          { key: "exposure", labelAr: "عوامل خطر (كيميائية، ضوضاء، إجهاد...)", labelEn: "Exposures", multiline: true, rows: 3 },
        ],
      },
      {
        id: "fitness",
        titleAr: "اللياقة للعمل",
        titleEn: "Fitness for work",
        fields: [
          { key: "fitness", labelAr: "الرأي الطبي والقيود إن وجدت", labelEn: "Fitness opinion", multiline: true, rows: 4 },
        ],
      },
      {
        id: "prev",
        titleAr: "التكييف والوقاية",
        titleEn: "Accommodations & prevention",
        fields: [
          { key: "accom", labelAr: "تكييفات مقترحة في مكان العمل", labelEn: "Workplace accommodations", multiline: true, rows: 3 },
          { key: "prev", labelAr: "وقاية ثانوية / تدريب", labelEn: "Prevention", multiline: true, rows: 2 },
        ],
      },
    ],
  },
  GASTROENTEROLOGY: {
    accentBorder: "border-amber-200",
    accentBg: "bg-amber-50/35",
    printTitleAr: "ملخص الجهاز الهضمي والكبد",
    sections: [
      {
        id: "sym",
        titleAr: "الأعراض والعلامات الحمراء",
        titleEn: "Symptoms & red flags",
        fields: [
          { key: "sym", labelAr: "الأعراض (ألم، براز، قيء، وزن...)", labelEn: "Symptoms", multiline: true, rows: 4 },
          { key: "red", labelAr: "علامات تحذيرية", labelEn: "Red flags", multiline: true, rows: 2 },
        ],
      },
      {
        id: "pmh",
        titleAr: "التاريخ والأدوية",
        titleEn: "PMH & meds",
        fields: [
          { key: "pmh", labelAr: "أمراض سابقة ذات صلة", labelEn: "Relevant PMH", multiline: true, rows: 2 },
          { key: "meds", labelAr: "أدوية تؤثر على المعدة/الكبد", labelEn: "Relevant medications", multiline: true, rows: 2 },
        ],
      },
      {
        id: "inv",
        titleAr: "الفحوصات",
        titleEn: "Work-up",
        fields: [
          { key: "inv", labelAr: "مختبر / تصوير / منظار — مطلوب أو منجز", labelEn: "Investigations", multiline: true, rows: 4 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة والتغذية",
        titleEn: "Plan & nutrition",
        fields: [
          { key: "dx", labelAr: "التشخيص العامل", labelEn: "Working diagnosis", multiline: true, rows: 2 },
          { key: "nut", labelAr: "نصائح غذائية موجزة", labelEn: "Nutrition", multiline: true, rows: 2 },
          { key: "plan", labelAr: "علاج ومتابعة", labelEn: "Management", multiline: true, rows: 3 },
        ],
      },
    ],
  },
  ENDOCRINOLOGY: {
    accentBorder: "border-indigo-200",
    accentBg: "bg-indigo-50/35",
    printTitleAr: "ملخص الغدد الصماء",
    sections: [
      {
        id: "focus",
        titleAr: "التركيز السريري",
        titleEn: "Clinical focus",
        fields: [
          { key: "focus", labelAr: "الحالة (سكري، درقية، سمنة، غدد أخرى...)", labelEn: "Focus", multiline: true, rows: 3 },
          { key: "sym", labelAr: "الأعراض والقياسات المنزلية إن وُجدت", labelEn: "Symptoms / home metrics", multiline: true, rows: 3 },
        ],
      },
      {
        id: "labs",
        titleAr: "المختبر والأهداف",
        titleEn: "Labs & targets",
        fields: [
          { key: "labs", labelAr: "نتائج أو طلبات", labelEn: "Laboratory", multiline: true, rows: 3 },
          { key: "targets", labelAr: "أهداف علاجية (مثال: HbA1c، TSH)", labelEn: "Therapeutic targets", multiline: true, rows: 2 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة والتثقيف",
        titleEn: "Plan & education",
        fields: [
          { key: "meds", labelAr: "الدواء والجرعات", labelEn: "Pharmacotherapy", multiline: true, rows: 3 },
          { key: "edu", labelAr: "تثقيف المريض (نمط حياة)", labelEn: "Patient education", multiline: true, rows: 3 },
          {
            key: "fu",
            labelAr: "ملاحظات متابعة نصية (اختياري)",
            labelEn: "Follow-up notes",
            optional: true,
            multiline: true,
            rows: 2,
          },
        ],
      },
    ],
  },
  RHEUMATOLOGY: {
    accentBorder: "border-rose-200",
    accentBg: "bg-rose-50/30",
    printTitleAr: "ملخص الروماتيزم",
    sections: [
      {
        id: "joint",
        titleAr: "نمط المفاصل والأعراض الجهازية",
        titleEn: "Joint pattern & systemic features",
        fields: [
          { key: "joint", labelAr: "مفاصل متورمة/محدودة، صباحية، تماثل", labelEn: "Joint pattern", multiline: true, rows: 4 },
          { key: "extra", labelAr: "جلد، عين، رئتين، أمعاء — إن وُجد", labelEn: "Extra-articular", multiline: true, rows: 3 },
        ],
      },
      {
        id: "func",
        titleAr: "الوظيفة والنوبات",
        titleEn: "Function & flares",
        fields: [
          { key: "func", labelAr: "قيود يومية (HAQ مبسط نصياً)", labelEn: "Function", multiline: true, rows: 2 },
          { key: "flare", labelAr: "خطة التعامل مع النوبات", labelEn: "Flare plan", multiline: true, rows: 2 },
        ],
      },
      {
        id: "tx",
        titleAr: "العلاج والمراقبة",
        titleEn: "Treatment & monitoring",
        fields: [
          { key: "dmard", labelAr: "معدلات المرض / بيولوجي — ملخص", labelEn: "DMARD / biologic", multiline: true, rows: 4 },
          { key: "monitor", labelAr: "مراقبة المختبر/السمية", labelEn: "Monitoring", multiline: true, rows: 3 },
        ],
      },
    ],
  },
  NEPHROLOGY: {
    accentBorder: "border-blue-200",
    accentBg: "bg-blue-50/35",
    printTitleAr: "ملخص طب الكلى",
    sections: [
      {
        id: "ckd",
        titleAr: "المرحلة والبروتين",
        titleEn: "CKD stage & proteinuria",
        fields: [
          { key: "stage", labelAr: "مرحلة CKD / سبب مبدئي", labelEn: "CKD stage / etiology", multiline: true, rows: 3 },
          { key: "protein", labelAr: "بروتين البول / ألبومين", labelEn: "Proteinuria", multiline: true, rows: 2 },
        ],
      },
      {
        id: "bpVol",
        titleAr: "الضغط والسوائل",
        titleEn: "BP & volume",
        fields: [
          { key: "bp", labelAr: "ضغط الدم والأهداف", labelEn: "Blood pressure", multiline: true, rows: 2 },
          { key: "vol", labelAr: "التوازن السائل / الحمية", labelEn: "Volume / diet", multiline: true, rows: 3 },
        ],
      },
      {
        id: "meds",
        titleAr: "الدواء وتجنب السمية",
        titleEn: "Meds & nephrotoxins",
        fields: [
          { key: "meds", labelAr: "الأدوية (تعديل الجرعة حسب الكلى)", labelEn: "Medications", multiline: true, rows: 4 },
          { key: "avoid", labelAr: "تجنب السموم الكلوية", labelEn: "Avoid nephrotoxins", multiline: true, rows: 2 },
        ],
      },
      {
        id: "rrt",
        titleAr: "غسيل / زراعة",
        titleEn: "RRT / transplant",
        fields: [
          { key: "rrt", labelAr: "غسيل، وصول وعائي، قائمة انتظار — إن انطبق", labelEn: "Dialysis / access", multiline: true, rows: 3 },
        ],
      },
    ],
  },
  INFECTIOUS_DISEASE: {
    accentBorder: "border-orange-200",
    accentBg: "bg-orange-50/35",
    printTitleAr: "ملخص الأمراض المعدية",
    sections: [
      {
        id: "synd",
        titleAr: "الأعراض والتعرض",
        titleEn: "Syndrome & exposure",
        fields: [
          { key: "synd", labelAr: "المتلازمة السريرية", labelEn: "Clinical syndrome", multiline: true, rows: 3 },
          { key: "exp", labelAr: "سفر، اتصال، مستشفى، حيوانات", labelEn: "Exposure / travel", multiline: true, rows: 3 },
        ],
      },
      {
        id: "micro",
        titleAr: "المختبر والعلاج",
        titleEn: "Microbiology & therapy",
        fields: [
          { key: "micro", labelAr: "زرع / تصوير — نتائج", labelEn: "Diagnostics", multiline: true, rows: 3 },
          { key: "abx", labelAr: "مضاد حيوي، مدة، تخفيف عند التحسن", labelEn: "Antimicrobial stewardship", multiline: true, rows: 4 },
        ],
      },
      {
        id: "ipc",
        titleAr: "العزل والصحة العامة",
        titleEn: "Isolation & public health",
        fields: [
          { key: "iso", labelAr: "احتياطات عزل إن لزم", labelEn: "Isolation", multiline: true, rows: 2 },
          { key: "ph", labelAr: "إبلاغ أو تتبع مخالطين", labelEn: "Public health", multiline: true, rows: 2 },
        ],
      },
    ],
  },
  ONCOLOGY: {
    accentBorder: "border-purple-200",
    accentBg: "bg-purple-50/35",
    printTitleAr: "ملخص طب الأورام",
    sections: [
      {
        id: "dx",
        titleAr: "التشخيص والمرحلة",
        titleEn: "Diagnosis & stage",
        hint: "استخدم الأزرار أدناه: كل زر يضيف بنداً منفصلاً (يمكنك إضافة أكثر من بند من نفس النوع إن لزم).",
        fields: [
          {
            kind: "optionalButtons",
            groupKey: "oncoDx",
            maxRowsPerGroup: 36,
            blocks: [
              {
                blockId: "tumor",
                buttonLabelAr: "+ الورم",
                buttonLabelEn: "+ Tumor",
                rowLabelAr: "الورم",
                rowLabelEn: "Tumor",
                multiline: true,
                rows: 3,
                placeholderAr: "الموقع، النوع التشريحي، المصدر إن وُجد…",
                maxRows: 12,
              },
              {
                blockId: "subtype",
                buttonLabelAr: "+ النوع الفرعي",
                buttonLabelEn: "+ Subtype",
                rowLabelAr: "النوع الفرعي / الفحص المرضي",
                rowLabelEn: "Subtype / pathology",
                multiline: true,
                rows: 3,
                placeholderAr: "IHC، انسجة، درجة تمايز…",
                maxRows: 12,
              },
              {
                blockId: "stage",
                buttonLabelAr: "+ المرحلة / التجميع",
                buttonLabelEn: "+ Stage / grouping",
                rowLabelAr: "المرحلة / التجميع إن وُجد",
                rowLabelEn: "Stage / grouping",
                multiline: true,
                rows: 3,
                placeholderAr: "TNM، مرحلة، تصنيف…",
                maxRows: 12,
              },
            ],
          },
        ],
      },
      {
        id: "intent",
        titleAr: "نية العلاج والخط",
        titleEn: "Treatment intent & line",
        hint: "كل بند يُضاف بزر منفصل — مثلاً عدة أسطر لخط العلاج (كيمياء، إشعاع، مناعي…).",
        fields: [
          {
            kind: "optionalButtons",
            groupKey: "oncoTherapy",
            maxRowsPerGroup: 32,
            blocks: [
              {
                blockId: "intent",
                buttonLabelAr: "+ نية العلاج",
                buttonLabelEn: "+ Intent",
                rowLabelAr: "نية العلاج (علاجي / تلطيفي / مراقبة)",
                rowLabelEn: "Intent of therapy",
                multiline: true,
                rows: 2,
                placeholderAr: "صف النية السريرية…",
                maxRows: 8,
              },
              {
                blockId: "line",
                buttonLabelAr: "+ بند خط العلاج",
                buttonLabelEn: "+ Line item",
                rowLabelAr: "خط العلاج — بند",
                rowLabelEn: "Line of therapy",
                multiline: true,
                rows: 3,
                placeholderAr: "كيمياء، إشعاع، مناعي، استهدافي…",
                maxRows: 20,
              },
            ],
          },
        ],
      },
      {
        id: "support",
        titleAr: "الدعم وأهداف الرعاية",
        titleEn: "Supportive & goals of care",
        hint: "أضف بنود الدعم أو أهداف الرعاية واحداً تلو الآخر.",
        fields: [
          {
            kind: "optionalButtons",
            groupKey: "oncoSupport",
            maxRowsPerGroup: 28,
            blocks: [
              {
                blockId: "support",
                buttonLabelAr: "+ دعم علاجي",
                buttonLabelEn: "+ Supportive",
                rowLabelAr: "دعم علاجي (غثيان، ألم، تغذية، عدوى…)",
                rowLabelEn: "Supportive care",
                multiline: true,
                rows: 3,
                maxRows: 16,
              },
              {
                blockId: "goc",
                buttonLabelAr: "+ هدف رعاية",
                buttonLabelEn: "+ Goal of care",
                rowLabelAr: "حوار / هدف رعاية",
                rowLabelEn: "Goals of care",
                multiline: true,
                rows: 2,
                placeholderAr: "نقاط للمناقشة مع المريض/الأسرة…",
                maxRows: 12,
              },
            ],
          },
        ],
      },
    ],
  },
  HEMATOLOGY: {
    accentBorder: "border-red-200",
    accentBg: "bg-red-50/25",
    printTitleAr: "ملخص أمراض الدم",
    sections: [
      {
        id: "problem",
        titleAr: "المشكلة السريرية",
        titleEn: "Clinical problem",
        fields: [
          { key: "problem", labelAr: "فقر دم، نقص صفيحات، تخثر... ملخص", labelEn: "Problem summary", multiline: true, rows: 4 },
        ],
      },
      {
        id: "hx",
        titleAr: "التاريخ والعائلة",
        titleEn: "History",
        fields: [
          { key: "hx", labelAr: "نزف سابق، خثار، حمل، عائلي", labelEn: "Bleeding / thrombosis hx", multiline: true, rows: 3 },
        ],
      },
      {
        id: "inv",
        titleAr: "الفحوصات",
        titleEn: "Investigations",
        fields: [
          { key: "inv", labelAr: "CBC، لطف، حديد، تصوير...", labelEn: "Labs / imaging", multiline: true, rows: 3 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة",
        titleEn: "Plan",
        fields: [
          { key: "transfuse", labelAr: "نقل دم / مضادات تخثر — إن انطبق", labelEn: "Transfusion / anticoag", multiline: true, rows: 3 },
          { key: "plan", labelAr: "علاج ومتابعة", labelEn: "Management", multiline: true, rows: 3 },
        ],
      },
    ],
  },
  PULMONOLOGY: {
    accentBorder: "border-cyan-200",
    accentBg: "bg-cyan-50/30",
    printTitleAr: "ملخص الأمراض الصدرية",
    sections: [
      {
        id: "resp",
        titleAr: "الأعراض",
        titleEn: "Respiratory symptoms",
        fields: [
          { key: "resp", labelAr: "سعال، لهث، بلغم، دم، صفير", labelEn: "Symptoms", multiline: true, rows: 3 },
          { key: "o2", labelAr: "أكسجين منزلي / قياس تشبع إن وُجد", labelEn: "Oxygen / SpO₂", multiline: true, rows: 2 },
        ],
      },
      {
        id: "pft",
        titleAr: "وظائف الرئة والتثقيف",
        titleEn: "PFTs & education",
        fields: [
          { key: "pft", labelAr: "سبيرومترية أو ملخص وظيفي", labelEn: "PFT summary", multiline: true, rows: 2 },
          { key: "inh", labelAr: "تقنية الاستنشاق، خطة الربو/COPD", labelEn: "Inhaler technique / action plan", multiline: true, rows: 3 },
        ],
      },
      {
        id: "img",
        titleAr: "التصوير والتحويل",
        titleEn: "Imaging & referral",
        fields: [
          { key: "img", labelAr: "أشعة / CT — ملخص", labelEn: "Imaging", multiline: true, rows: 2 },
          { key: "ref", labelAr: "تحويل (منظار، نوم، جراحة)", labelEn: "Referrals", multiline: true, rows: 2 },
        ],
      },
      {
        id: "plan",
        titleAr: "الخطة",
        titleEn: "Plan",
        fields: [
          { key: "plan", labelAr: "دواء، تأهيل تنفسي، متابعة", labelEn: "Management & follow-up", multiline: true, rows: 4 },
        ],
      },
    ],
  },
};
