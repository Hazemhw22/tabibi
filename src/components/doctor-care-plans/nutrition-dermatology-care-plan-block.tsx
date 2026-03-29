"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseNum(v: string): number | null {
  const n = parseFloat(v.replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

function computeBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (heightCm == null || weightKg == null || heightCm <= 0 || weightKg <= 0) return null;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

type Anthropometrics = {
  heightCm?: number | null;
  weightKg?: number | null;
  measuredAt?: string | null;
  /** سجل يُحدَّث عند تغيير الوزن/الطول أو عند المتابعة */
  history?: { id: string; date: string; weightKg?: number | null; heightCm?: number | null; note?: string }[];
};

type NutritionSlice = {
  dietPattern?: string;
  caloriesTarget?: number | null;
  proteinG?: number | null;
  carbG?: number | null;
  fatG?: number | null;
  fluidsLiters?: number | null;
  restrictions?: string;
  supplements?: string;
  goals?: string;
  mealIdeas?: string;
};

type LaserSession = {
  id: string;
  date: string;
  area?: string;
  deviceSettings?: string;
  note?: string;
};

type DermatologySlice = {
  skinPhototype?: string;
  chiefComplaints?: string;
  laserSessions?: LaserSession[];
  topicalProtocol?: string;
  sunProtection?: string;
  contraindications?: string;
  /** صور نصية — جلسات ليزر، تقشير، إلخ */
  otherProcedures?: string;
};

export type NutritionDermatologyVariant = "NUTRITION" | "DERMATOLOGY_LASER" | "NUTRITION_DERMATOLOGY";

/** للتخصص المدمج: خطة تغذية أو خطة بشرة/ليزر — لا يُعرضان معاً */
type CombinedPlanFocus = "nutrition" | "dermatology";

type Props = {
  variant: NutritionDermatologyVariant;
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
};

/** كتلة خطة التغذية والبشرة/الليزر — data.planFocus: nutrition | dermatology (قديم: both) */
export function NutritionDermatologyCarePlanBlock({ variant, data, setData }: Props) {
  const anth = (data.anthropometrics as Anthropometrics) || {};
  const nutrition = (data.nutritionPlan as NutritionSlice) || {};
  const derm = (data.dermatologyPlan as DermatologySlice) || {};
  const rawPlanFocus = data.planFocus as string | undefined;

  const combinedFocus: CombinedPlanFocus | null = useMemo(() => {
    if (variant !== "NUTRITION_DERMATOLOGY") return null;
    if (rawPlanFocus === "nutrition" || rawPlanFocus === "dermatology") return rawPlanFocus;
    return null;
  }, [variant, rawPlanFocus]);

  const heightCm = anth.heightCm ?? null;
  const weightKg = anth.weightKg ?? null;
  const bmi = useMemo(() => computeBmi(heightCm, weightKg), [heightCm, weightKg]);

  const showNutrition =
    variant === "NUTRITION" || (variant === "NUTRITION_DERMATOLOGY" && combinedFocus === "nutrition");
  const showDerm =
    variant === "DERMATOLOGY_LASER" ||
    (variant === "NUTRITION_DERMATOLOGY" && combinedFocus === "dermatology");
  /** تخصص البشرة والليزر فقط — بدون قياسات وزن/طول أو خطة غذائية */
  const showAnthropometrics =
    variant === "NUTRITION" || (variant === "NUTRITION_DERMATOLOGY" && combinedFocus === "nutrition");

  const showCombinedPicker = variant === "NUTRITION_DERMATOLOGY";
  const combinedNeedsChoice = showCombinedPicker && combinedFocus === null;

  const setAnth = (patch: Partial<Anthropometrics>) =>
    setData((d) => ({
      ...d,
      anthropometrics: { ...(typeof d.anthropometrics === "object" ? (d.anthropometrics as object) : {}), ...anth, ...patch },
    }));

  const setNutrition = (patch: Partial<NutritionSlice>) =>
    setData((d) => ({
      ...d,
      nutritionPlan: { ...nutrition, ...patch },
    }));

  const setDerm = (patch: Partial<DermatologySlice>) =>
    setData((d) => ({
      ...d,
      dermatologyPlan: { ...derm, ...patch },
    }));

  const pushMeasurement = () => {
    const h = heightCm;
    const w = weightKg;
    if (w == null && h == null) return;
    const id = newId("m");
    const date = format(new Date(), "yyyy-MM-dd");
    const history = [...(anth.history || [])];
    history.unshift({
      id,
      date,
      weightKg: w,
      heightCm: h,
      note: "قياس يدوي",
    });
    setAnth({ history, measuredAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      {showCombinedPicker && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
          <Label className="text-sm font-semibold text-violet-900 dark:text-violet-200">
            نوع الخطة لهذا المريض
          </Label>
          <p className="text-xs text-violet-800/90 dark:text-violet-300/90 mt-1 mb-4">
            اختر إحدى الخطتين في البداية؛ تُعرض الحقول أسفل الزر المختار فقط. يمكنك التبديل بينهما لاحقاً إن احتجت.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setData((d) => ({ ...d, planFocus: "nutrition" as CombinedPlanFocus }))}
              className={cn(
                "rounded-xl border-2 p-4 text-right transition-all",
                combinedFocus === "nutrition"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-md dark:border-emerald-500 dark:bg-emerald-600"
                  : "border-emerald-200 bg-white text-emerald-950 hover:border-emerald-400 hover:bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-slate-900 dark:text-emerald-100 dark:hover:bg-emerald-950/40",
              )}
            >
              <span className="block text-sm font-bold">خطة التغذية العلاجية</span>
              <span
                className={cn(
                  "mt-1 block text-xs",
                  combinedFocus === "nutrition" ? "text-emerald-50" : "text-emerald-800/85 dark:text-emerald-300/90",
                )}
              >
                قياسات الطول والوزن، حمية، سعرات، وأهداف غذائية
              </span>
            </button>
            <button
              type="button"
              onClick={() => setData((d) => ({ ...d, planFocus: "dermatology" as CombinedPlanFocus }))}
              className={cn(
                "rounded-xl border-2 p-4 text-right transition-all",
                combinedFocus === "dermatology"
                  ? "border-sky-600 bg-sky-600 text-white shadow-md dark:border-sky-500 dark:bg-sky-600"
                  : "border-sky-200 bg-white text-sky-950 hover:border-sky-400 hover:bg-sky-50/80 dark:border-sky-900/50 dark:bg-slate-900 dark:text-sky-100 dark:hover:bg-sky-950/40",
              )}
            >
              <span className="block text-sm font-bold">خطة البشرة والليزر</span>
              <span
                className={cn(
                  "mt-1 block text-xs",
                  combinedFocus === "dermatology" ? "text-sky-50" : "text-sky-800/85 dark:text-sky-300/90",
                )}
              >
                تقييم، جلسات ليزر، بروتوكول موضعي، واقي شمس
              </span>
            </button>
          </div>
          {combinedNeedsChoice && (
            <p className="mt-4 text-center text-sm text-violet-800/90 dark:text-violet-300/85">
              اضغط أحد الخيارين أعلاه لعرض الخطة.
            </p>
          )}
          {rawPlanFocus === "both" && combinedNeedsChoice && (
            <p className="mt-2 text-center text-xs text-amber-800/90 dark:text-amber-300/85">
              كان محفوظاً سابقاً كخطة مدمجة — اختر الآن «تغذية» أو «بشرة وليزر» لعرض البيانات.
            </p>
          )}
        </div>
      )}

      {showAnthropometrics && (
      <section className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-4 dark:border-emerald-900/40 dark:bg-emerald-950/25">
        <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
          الطول والوزن (BMI)
        </h4>
        <p className="text-[11px] text-emerald-800/85 dark:text-emerald-300/80">
          يُفضّل تحديث الوزن والطول عند كل موعد متابعة؛ يمكن إضافة سطر في السجل أدناه بعد كل زيارة.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">الطول (سم)</Label>
            <Input
              type="number"
              min={40}
              max={250}
              step={0.1}
              className="mt-1"
              value={heightCm != null ? String(heightCm) : ""}
              onChange={(e) => {
                const n = parseNum(e.target.value);
                setAnth({ heightCm: n });
              }}
              placeholder="مثال: 170"
            />
          </div>
          <div>
            <Label className="text-xs">الوزن (كغ)</Label>
            <Input
              type="number"
              min={2}
              max={400}
              step={0.1}
              className="mt-1"
              value={weightKg != null ? String(weightKg) : ""}
              onChange={(e) => {
                const n = parseNum(e.target.value);
                setAnth({ weightKg: n });
              }}
              placeholder="مثال: 72"
            />
          </div>
          <div>
            <Label className="text-xs">مؤشر كتلة الجسم (BMI)</Label>
            <div className="mt-1 h-10 flex items-center rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold tabular-nums dark:border-emerald-800 dark:bg-slate-900">
              {bmi != null ? bmi : "—"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={pushMeasurement}>
            <IconPlus className="h-3.5 w-3.5 ml-1" />
            تسجيل القياس الحالي في السجل
          </Button>
          {anth.measuredAt && (
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
              آخر تحديث للبيانات: {format(new Date(anth.measuredAt), "dd/MM/yyyy HH:mm", { locale: ar })}
            </span>
          )}
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">سجل القياسات</span>
          {(anth.history || []).length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">لا سجلات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {(anth.history || []).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-100 bg-white/90 px-3 py-2 text-xs dark:border-emerald-900/50 dark:bg-slate-900/60"
                >
                  <span dir="ltr">{row.date}</span>
                  {row.weightKg != null && <span>وزن: {row.weightKg} كغ</span>}
                  {row.heightCm != null && <span>طول: {row.heightCm} سم</span>}
                  {row.note && <span className="text-gray-600 dark:text-gray-400">{row.note}</span>}
                  <button
                    type="button"
                    className="mr-auto text-red-600 hover:text-red-700 p-1"
                    aria-label="حذف"
                    onClick={() =>
                      setAnth({
                        history: (anth.history || []).filter((x) => x.id !== row.id),
                      })
                    }
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      )}

      {showNutrition && (
        <section className="rounded-xl border border-amber-200/90 bg-amber-50/35 p-4 space-y-3 dark:border-amber-900/45 dark:bg-amber-950/20">
          <h4 className="text-sm font-semibold text-amber-950 dark:text-amber-100">الخطة الغذائية والحمية</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">نوع النظام / النمط الغذائي</Label>
              <Input
                className="mt-1"
                value={nutrition.dietPattern || ""}
                onChange={(e) => setNutrition({ dietPattern: e.target.value })}
                placeholder="مثال: منخفض الكرب، متوسطي، قليل الدسم، صيام متقطع، علاجي لمريض السكري…"
              />
            </div>
            <div>
              <Label className="text-xs">هدف السعرات (كيلو سعرة/يوم)</Label>
              <Input
                type="number"
                className="mt-1"
                value={nutrition.caloriesTarget != null ? String(nutrition.caloriesTarget) : ""}
                onChange={(e) => setNutrition({ caloriesTarget: parseNum(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">سوائل تقريبية (لتر/يوم)</Label>
              <Input
                type="number"
                step={0.1}
                className="mt-1"
                value={nutrition.fluidsLiters != null ? String(nutrition.fluidsLiters) : ""}
                onChange={(e) => setNutrition({ fluidsLiters: parseNum(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">بروتين (غ/يوم)</Label>
              <Input
                type="number"
                className="mt-1"
                value={nutrition.proteinG != null ? String(nutrition.proteinG) : ""}
                onChange={(e) => setNutrition({ proteinG: parseNum(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">كربوهيدرات (غ/يوم)</Label>
              <Input
                type="number"
                className="mt-1"
                value={nutrition.carbG != null ? String(nutrition.carbG) : ""}
                onChange={(e) => setNutrition({ carbG: parseNum(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">دهون (غ/يوم)</Label>
              <Input
                type="number"
                className="mt-1"
                value={nutrition.fatG != null ? String(nutrition.fatG) : ""}
                onChange={(e) => setNutrition({ fatG: parseNum(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">قيود وممنوعات غذائية</Label>
            <textarea
              className="mt-1 w-full min-h-[72px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={nutrition.restrictions || ""}
              onChange={(e) => setNutrition({ restrictions: e.target.value })}
              placeholder="حساسية، غلوتين، لبن، ملح…"
            />
          </div>
          <div>
            <Label className="text-xs">مكملات غذائية موصوفة</Label>
            <textarea
              className="mt-1 w-full min-h-[56px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={nutrition.supplements || ""}
              onChange={(e) => setNutrition({ supplements: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">أهداف العلاج الغذائي</Label>
            <textarea
              className="mt-1 w-full min-h-[56px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={nutrition.goals || ""}
              onChange={(e) => setNutrition({ goals: e.target.value })}
              placeholder="مثال: خسارة 5 كغ خلال 3 أشهر، تحسين الهضم…"
            />
          </div>
          <div>
            <Label className="text-xs">أفكار وجبات / ملاحظات وجبات</Label>
            <textarea
              className="mt-1 w-full min-h-[56px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={nutrition.mealIdeas || ""}
              onChange={(e) => setNutrition({ mealIdeas: e.target.value })}
            />
          </div>
        </section>
      )}

      {showDerm && (
        <section className="rounded-xl border border-sky-200/90 bg-sky-50/35 p-4 space-y-3 dark:border-sky-900/45 dark:bg-sky-950/20">
          <h4 className="text-sm font-semibold text-sky-950 dark:text-sky-100">البشرة والليزر</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">فوتوتايب البشرة (اختياري)</Label>
              <Input
                className="mt-1"
                value={derm.skinPhototype || ""}
                onChange={(e) => setDerm({ skinPhototype: e.target.value })}
                placeholder="مثال: I–VI"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">الشكوى / التشخيص المبدئي</Label>
              <textarea
                className="mt-1 w-full min-h-[64px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                value={derm.chiefComplaints || ""}
                onChange={(e) => setDerm({ chiefComplaints: e.target.value })}
                placeholder="حب شباب، تصبغ، وشم، إزالة شعر، إزالة وشم…"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">جلسات الليزر / الإجراءات</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() =>
                  setDerm({
                    laserSessions: [
                      ...(derm.laserSessions || []),
                      { id: newId("ls"), date: format(new Date(), "yyyy-MM-dd"), area: "", deviceSettings: "", note: "" },
                    ],
                  })
                }
              >
                <IconPlus className="h-3.5 w-3.5 ml-1" />
                جلسة
              </Button>
            </div>
            <div className="space-y-2">
              {(derm.laserSessions || []).length === 0 && (
                <p className="text-xs text-gray-500">لا جلسات مسجّلة — تُربط مواعيد المتابعة أسفل الخطة مع المواعيد العامة.</p>
              )}
              {(derm.laserSessions || []).map((s) => (
                <div
                  key={s.id}
                  className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] rounded-lg border border-sky-100 bg-white p-2 dark:border-sky-900/50 dark:bg-slate-900/60"
                >
                  <Input
                    type="date"
                    className="h-9 text-xs"
                    value={s.date}
                    onChange={(e) =>
                      setDerm({
                        laserSessions: (derm.laserSessions || []).map((x) =>
                          x.id === s.id ? { ...x, date: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Input
                    placeholder="المنطقة"
                    className="h-9 text-xs"
                    value={s.area || ""}
                    onChange={(e) =>
                      setDerm({
                        laserSessions: (derm.laserSessions || []).map((x) =>
                          x.id === s.id ? { ...x, area: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Input
                    placeholder="إعدادات الجهاز / الطاقة"
                    className="h-9 text-xs"
                    value={s.deviceSettings || ""}
                    onChange={(e) =>
                      setDerm({
                        laserSessions: (derm.laserSessions || []).map((x) =>
                          x.id === s.id ? { ...x, deviceSettings: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="text-red-600 p-1"
                    aria-label="حذف"
                    onClick={() =>
                      setDerm({
                        laserSessions: (derm.laserSessions || []).filter((x) => x.id !== s.id),
                      })
                    }
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                  <textarea
                    className="sm:col-span-3 min-h-[40px] rounded border px-2 py-1 text-xs dark:bg-slate-950"
                    placeholder="ملاحظات الجلسة"
                    value={s.note || ""}
                    onChange={(e) =>
                      setDerm({
                        laserSessions: (derm.laserSessions || []).map((x) =>
                          x.id === s.id ? { ...x, note: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">بروتوكول موضعي (كريمات، أحماض…)</Label>
            <textarea
              className="mt-1 w-full min-h-[64px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={derm.topicalProtocol || ""}
              onChange={(e) => setDerm({ topicalProtocol: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">واقي شمسي وعناية منزلية</Label>
            <textarea
              className="mt-1 w-full min-h-[48px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={derm.sunProtection || ""}
              onChange={(e) => setDerm({ sunProtection: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">موانع / احتياطات (الحمل، أدوية فوتوسنسية…)</Label>
            <textarea
              className="mt-1 w-full min-h-[48px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={derm.contraindications || ""}
              onChange={(e) => setDerm({ contraindications: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">إجراءات أخرى (تقشير كيميائي، ميزو…)</Label>
            <textarea
              className="mt-1 w-full min-h-[48px] rounded-lg border border-gray-300 p-2 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              value={derm.otherProcedures || ""}
              onChange={(e) => setDerm({ otherProcedures: e.target.value })}
            />
          </div>
        </section>
      )}
    </div>
  );
}
