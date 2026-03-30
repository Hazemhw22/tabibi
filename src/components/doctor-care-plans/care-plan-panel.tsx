"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import IconPrinter from "@/components/icon/icon-printer";
import { format, differenceInDays, addDays } from "date-fns";
import { ar } from "date-fns/locale";
import IconLoader from "@/components/icon/icon-loader";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconClipboardText from "@/components/icon/icon-clipboard-text";
import IconRefresh from "@/components/icon/icon-refresh";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CarePlanType } from "@/lib/specialty-plan-registry";
import {
  CARE_PLAN_LABELS,
  carePlanShowsDentalToothChart,
  carePlanUsesItemsCostGrid,
  isStructuredIntlCarePlan,
} from "@/lib/specialty-plan-registry";
import { DentalToothChartBlock } from "./dental-tooth-chart-block";
import { PregnancyWeekSvg } from "./pregnancy-week-svg";
import {
  PediatricsBodySvg,
  PEDIATRIC_ORGANS,
  type PediatricOrganId,
} from "./pediatrics-body-svg";
import { CardiologyHeartSvg, CARDIO_ZONES, type CardiologyZoneId } from "./cardiology-heart-svg";
import { OrthopedicsSkeletonSvg } from "./orthopedics-skeleton-svg";
import { FetalImagingCarePlanBlock } from "./fetal-imaging-care-plan-block";
import { ClinicalIntlCarePlanBlock } from "./clinical-intl-care-plan-block";
import { NutritionDermatologyCarePlanBlock } from "./nutrition-dermatology-care-plan-block";
import { CarePlanFollowUpsSection } from "./care-plan-follow-ups-section";
import { cn } from "@/lib/utils";
import { printHtmlDocument } from "@/lib/print-html";
import {
  buildCarePlanLetterheadHtml,
  type CarePlanLetterheadPatient,
} from "@/lib/care-plan-print-html";
import { getFollowUpVisitsFromPlanData } from "@/lib/care-plan-follow-ups";
import { serializeCarePlanSectionsForPrint } from "@/lib/care-plan-print-serialize";

function doctorDisplayNameAr(name: string | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "د. —";
  if (/^د\.?\s*/u.test(n) || /^د\s/u.test(n)) return n;
  return `د. ${n}`;
}

type Props = {
  carePlanType: CarePlanType;
  /** مريض عيادة: معرف ClinicPatient | مريض منصة: معرف User (المريض) */
  patientId: string;
  patientSource: "clinic" | "platform";
  patientName?: string;
  doctorDisplayName?: string;
  patientPrintDemographics?: {
    fileNumber?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    guardian?: string | null;
  };
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function carePlanApiUrl(patientId: string, source: "clinic" | "platform") {
  if (source === "clinic") return `/api/clinic/patients/${patientId}/care-plan`;
  return `/api/doctor/platform-patients/${patientId}/care-plan`;
}

export function CarePlanPanel({
  patientId,
  patientSource,
  carePlanType,
  patientName = "",
  doctorDisplayName = "",
  patientPrintDemographics,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(carePlanApiUrl(patientId, patientSource));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (j as { error?: string }).error ||
          (res.status === 500
            ? "خطأ في الخادم — غالباً لم تُنفَّذ ترحيلة قاعدة البيانات (جدول خطة العلاج). نفّذ: npx prisma db push"
            : "فشل التحميل");
        setLoadError(msg);
        toast.error(msg);
        return;
      }
      const plan = j.plan as {
        planType?: string;
        data?: Record<string, unknown>;
        doctorNotes?: string | null;
      } | null;
      if (plan) {
        setDoctorNotes(plan.doctorNotes ?? "");
        setData((plan.data as Record<string, unknown>) ?? {});
      } else {
        setDoctorNotes("");
        setData({});
      }
    } catch {
      const msg = "خطأ في الاتصال بالخادم";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [patientId, patientSource]);

  useEffect(() => {
    void load();
  }, [load]);

  const printPatient: CarePlanLetterheadPatient = useMemo(
    () => ({
      name: patientName || "—",
      recordId: patientId,
      fileNumber: patientPrintDemographics?.fileNumber,
      gender: patientPrintDemographics?.gender,
      dateOfBirth: patientPrintDemographics?.dateOfBirth,
      guardian: patientPrintDemographics?.guardian,
    }),
    [patientId, patientName, patientPrintDemographics],
  );

  const doctorAr = doctorDisplayNameAr(doctorDisplayName);

  const printBridge = useMemo(
    () => ({
      doctorDisplayNameAr: doctorAr,
      patient: printPatient,
      doctorNotes,
    }),
    [doctorAr, printPatient, doctorNotes],
  );

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(carePlanApiUrl(patientId, patientSource), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: carePlanType,
          data,
          doctorNotes: doctorNotes.trim() || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "فشل الحفظ");
        return;
      }
      toast.success("تم حفظ خطة العلاج");
      if (typeof j.carePlanSmsSent === "boolean") {
        if (j.carePlanSmsSent) {
          toast.message("أُرسلت رسالة تنبيه للمريض (SMS/واتساب إن وُجدت الإعدادات).");
        } else {
          toast.warning("تعذر إرسال رسالة للمريض — تحقق من رقم الهاتف وإعدادات SMS.");
        }
      }
      if (j.plan?.data) setData((j.plan.data as Record<string, unknown>) ?? {});
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400 gap-2">
        <IconLoader className="h-5 w-5 animate-spin" />
        جاري تحميل الخطة...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
        <p className="font-semibold">تعذّر تحميل خطة العلاج</p>
        <p className="text-amber-900/90 dark:text-amber-200/90 whitespace-pre-wrap">{loadError}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()} className="gap-2">
          <IconRefresh className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const title = CARE_PLAN_LABELS[carePlanType] ?? "خطة العلاج";

  const printStandardPlan = () => {
    if (typeof window === "undefined") return;
    if (carePlanType === "FETAL_IMAGING" || isStructuredIntlCarePlan(carePlanType)) return;
    const sections = serializeCarePlanSectionsForPrint(carePlanType, data);
    const html = buildCarePlanLetterheadHtml({
      origin: window.location.origin,
      documentTitleAr: title,
      issuedAtAr: new Date().toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }),
      doctor: { displayNameAr: doctorAr },
      patient: printPatient,
      sections,
      followUpVisits: getFollowUpVisitsFromPlanData(data, carePlanType),
      recommendationsText: doctorNotes,
    });
    printHtmlDocument(html, title);
  };

  const showStandardPrint =
    carePlanType !== "FETAL_IMAGING" && !isStructuredIntlCarePlan(carePlanType);

  return (
    <div className="space-y-6 min-h-[200px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <IconClipboardText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {showStandardPrint && (
            <Button type="button" size="sm" variant="outline" onClick={printStandardPlan} className="gap-2">
              <IconPrinter className="h-4 w-4" />
              طباعة / PDF
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => void save()} disabled={saving} className="gap-2">
            {saving ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconCircleCheck className="h-4 w-4" />}
            حفظ الخطة
          </Button>
        </div>
      </div>

      {carePlanType === "FETAL_IMAGING" && (
        <FetalImagingCarePlanBlock data={data} setData={setData} printBridge={printBridge} />
      )}
      {carePlanType === "OB_GYN" && (
        <ObGynBlock data={data} setData={setData} />
      )}
      {carePlanType === "PEDIATRICS" && (
        <PediatricsBlock data={data} setData={setData} />
      )}
      {carePlanType === "ORTHOPEDICS" && (
        <OrthopedicsBlock data={data} setData={setData} />
      )}
      {carePlanType === "UROLOGY_NEPHROLOGY" && (
        <UrologyBlock data={data} setData={setData} />
      )}
      {carePlanType === "CARDIOLOGY" && (
        <CardiologyBlock data={data} setData={setData} />
      )}
      {(carePlanType === "NUTRITION" ||
        carePlanType === "DERMATOLOGY_LASER" ||
        carePlanType === "DERMATOLOGY_HAIR_TRANSPLANT" ||
        carePlanType === "NUTRITION_DERMATOLOGY") && (
        <NutritionDermatologyCarePlanBlock variant={carePlanType} data={data} setData={setData} />
      )}
      {isStructuredIntlCarePlan(carePlanType) && (
        <ClinicalIntlCarePlanBlock
          carePlanType={carePlanType}
          data={data}
          setData={setData}
          printBridge={printBridge}
        />
      )}
      {carePlanShowsDentalToothChart(carePlanType) && (
        <DentalToothChartBlock
          clinicPatientId={patientId}
          patientSource={patientSource}
          heading="مخطط الأسنان"
        />
      )}
      {carePlanUsesItemsCostGrid(carePlanType) && (
        <GenericBlock data={data} setData={setData} />
      )}
      {/* احتياط: أي نوع غير معروف يعرض الخطة العامة */}
      {![
        "FETAL_IMAGING",
        "OB_GYN",
        "PEDIATRICS",
        "ORTHOPEDICS",
        "NEPHROLOGY",
        "UROLOGY_NEPHROLOGY",
        "CARDIOLOGY",
        "PSYCHIATRY",
        "OPHTHALMOLOGY",
        "ENT",
        "PHYSICAL_MEDICINE_REHAB",
        "SPORTS_MEDICINE",
        "OCCUPATIONAL_MEDICINE",
        "GASTROENTEROLOGY",
        "ENDOCRINOLOGY",
        "RHEUMATOLOGY",
        "INFECTIOUS_DISEASE",
        "ONCOLOGY",
        "HEMATOLOGY",
        "PULMONOLOGY",
        "GENERIC",
        "DENTAL",
        "DENTAL_IMPLANT_IMMEDIATE_SURGICAL",
        "DENTAL_IMPLANT_COSMETIC",
        "NUTRITION",
        "DERMATOLOGY_LASER",
        "DERMATOLOGY_HAIR_TRANSPLANT",
        "NUTRITION_DERMATOLOGY",
      ].includes(carePlanType) && <GenericBlock data={data} setData={setData} />}

      <CarePlanFollowUpsSection data={data} setData={setData} carePlanType={carePlanType} />

      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">ملاحظات الطبيب (عامة)</label>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            خاصة بحسابك فقط؛ أطباء آخرون لهم ملاحظاتهم المنفصلة على نفس المريض (منصة أو ملف عيادة مرتبط بهم).
          </p>
        </div>
        <textarea
          value={doctorNotes}
          onChange={(e) => setDoctorNotes(e.target.value)}
          rows={4}
          placeholder="أي توصيات أو ملاحظات إضافية تظهر للفريق أو في المراجعات القادمة..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500"
        />
      </div>

      <Button type="button" onClick={() => void save()} disabled={saving} className="gap-2">
        {saving ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconCircleCheck className="h-4 w-4" />}
        حفظ الخطة
      </Button>
    </div>
  );
}

/* ─── OB/GYN ─── */
function ObGynBlock({
  data,
  setData,
}: {
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const lmp = (data.lmpDate as string) || "";
  const reviewVisits = (data.reviewVisits as { id: string; date: string; note?: string }[]) || [];

  const pregnancy = useMemo(() => {
    if (!lmp) return null;
    const start = new Date(lmp + "T12:00:00");
    if (Number.isNaN(start.getTime())) return null;
    const today = new Date();
    const days = differenceInDays(today, start);
    if (days < 0) return { weeks: 0, daysR: 0, edd: addDays(start, 280), invalid: true as const };
    const weeks = Math.floor(days / 7);
    const daysR = days % 7;
    const edd = addDays(start, 280);
    return { weeks, daysR, edd, invalid: false as const };
  }, [lmp]);

  const displayWeek = pregnancy && !pregnancy.invalid ? Math.min(Math.max(pregnancy.weeks, 0), 42) : 12;

  return (
    <div className="space-y-4 rounded-xl border border-pink-100 bg-pink-50/40 p-4 dark:border-pink-900/40 dark:bg-pink-950/25">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
            أول يوم في آخر دورة (LMP)
          </label>
          <input
            type="date"
            value={lmp}
            onChange={(e) => setData((d) => ({ ...d, lmpDate: e.target.value }))}
            className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        {pregnancy && !pregnancy.invalid && (
          <div className="rounded-lg bg-white border border-pink-200 p-3 text-sm space-y-1 dark:bg-slate-900/60 dark:border-pink-800/50">
            <div>
              <span className="text-gray-600 dark:text-gray-400">عمر الحمل: </span>
              <strong className="text-pink-800 dark:text-pink-300">
                {pregnancy.weeks} أسبوعاً {pregnancy.daysR > 0 ? `و ${pregnancy.daysR} يوماً` : ""}
              </strong>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">التاريخ المتوقع للولادة: </span>
              <strong dir="ltr">{format(pregnancy.edd, "dd/MM/yyyy", { locale: ar })}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center [&>p]:hidden">
        <PregnancyWeekSvg week={displayWeek} />
       
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">مراجعات المتابعة (بدون تكلفة في الخطة)</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() =>
              setData((d) => ({
                ...d,
                reviewVisits: [
                  ...(Array.isArray(d.reviewVisits) ? (d.reviewVisits as typeof reviewVisits) : []),
                  { id: newId("rv"), date: format(new Date(), "yyyy-MM-dd"), note: "" },
                ],
              }))
            }
          >
            <IconPlus className="h-3.5 w-3.5" /> مراجعة
          </Button>
        </div>
        <div className="space-y-2">
          {reviewVisits.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">لا مراجعات بعد — أضف مواعيد المتابعة الدورية.</p>
          )}
          {reviewVisits.map((rv) => (
            <div key={rv.id} className="flex flex-wrap gap-2 items-end rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
              <input
                type="date"
                value={rv.date}
                onChange={(e) =>
                  setData((d) => {
                    const list = [...(d.reviewVisits as typeof reviewVisits)];
                    const i = list.findIndex((x) => x.id === rv.id);
                    if (i >= 0) list[i] = { ...list[i], date: e.target.value };
                    return { ...d, reviewVisits: list };
                  })
                }
                className="h-8 rounded border border-gray-200 px-2 text-xs dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              <Input
                className="h-8 flex-1 min-w-[120px] text-xs"
                placeholder="ملاحظات المراجعة"
                value={rv.note || ""}
                onChange={(e) =>
                  setData((d) => {
                    const list = [...(d.reviewVisits as typeof reviewVisits)];
                    const i = list.findIndex((x) => x.id === rv.id);
                    if (i >= 0) list[i] = { ...list[i], note: e.target.value };
                    return { ...d, reviewVisits: list };
                  })
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-500"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    reviewVisits: (d.reviewVisits as typeof reviewVisits).filter((x) => x.id !== rv.id),
                  }))
                }
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Pediatrics ─── */
type PedRow = { organId: PediatricOrganId; problem: string; cost: number };

function PediatricsBlock({
  data,
  setData,
}: {
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const rows = (data.organs as PedRow[]) || [];
  const [selected, setSelected] = useState<PediatricOrganId | null>("chest");

  const problemIds = useMemo(
    () => rows.filter((r) => r.problem?.trim() || (r.cost ?? 0) > 0).map((r) => r.organId),
    [rows],
  );
  const effectiveSelected = useMemo<PediatricOrganId | null>(() => {
    const explicit = selected;
    const withData = rows.find((r) => r.problem?.trim() || (r.cost ?? 0) > 0)?.organId ?? null;
    const fallback = rows[0]?.organId ?? null;
    return explicit ?? withData ?? fallback;
  }, [rows, selected]);

  const upsertRow = (organId: PediatricOrganId, patch: Partial<PedRow>) => {
    setData((d) => {
      const list = [...((d.organs as PedRow[]) || [])];
      const i = list.findIndex((x) => x.organId === organId);
      if (i < 0) list.push({ organId, problem: "", cost: 0, ...patch });
      else list[i] = { ...list[i], ...patch };
      return { ...d, organs: list };
    });
  };

  const rowFor = (id: PediatricOrganId) => rows.find((r) => r.organId === id);

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-4 space-y-4 dark:border-sky-900/40 dark:bg-sky-950/20">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        اختر عضواً من المخطط، ثم سجّل المشكلة والتكلفة المقترحة (اختياري).
      </p>
      <div className="flex flex-col md:flex-row gap-6">
        <PediatricsBodySvg
          selected={effectiveSelected}
          onSelect={(id) => setSelected(id)}
          highlightIds={problemIds}
        />
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-1">
            {PEDIATRIC_ORGANS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o.id)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-full border",
                  effectiveSelected === o.id
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {effectiveSelected && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                {PEDIATRIC_ORGANS.find((x) => x.id === effectiveSelected)?.label}
              </div>
              <Input
                placeholder="وصف المشكلة"
                value={rowFor(effectiveSelected)?.problem || ""}
                onChange={(e) => upsertRow(effectiveSelected, { problem: e.target.value })}
                className="text-sm"
              />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400 shrink-0">تكلفة تقريبية (₪)</span>
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-28 text-sm"
                  value={rowFor(effectiveSelected)?.cost ?? ""}
                  onChange={(e) =>
                    upsertRow(effectiveSelected, { cost: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Orthopedics ─── */
type OrthoRow = { id: string; injuryType: string; durationDays: number; cost: number };

function OrthopedicsBlock({
  data,
  setData,
}: {
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const injuries = (data.injuries as OrthoRow[]) || [];
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 space-y-4 dark:border-amber-900/40 dark:bg-amber-950/25">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <OrthopedicsSkeletonSvg className="shrink-0 lg:max-w-[200px]" />
        <div className="min-w-0 flex-1 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">الإصابات ومدة العلاج والتكلفة</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() =>
            setData((d) => ({
              ...d,
              injuries: [
                ...(Array.isArray(d.injuries) ? (d.injuries as OrthoRow[]) : []),
                { id: newId("or"), injuryType: "", durationDays: 0, cost: 0 },
              ],
            }))
          }
        >
          <IconPlus className="h-3.5 w-3.5" /> إصابة
        </Button>
      </div>
      {injuries.map((row) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_100px_100px_auto] items-end rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
          <Input
            placeholder="نوع الإصابة (مثال: التواء، كسر...)"
            value={row.injuryType}
            onChange={(e) =>
              setData((d) => {
                const list = (d.injuries as OrthoRow[]).map((x) =>
                  x.id === row.id ? { ...x, injuryType: e.target.value } : x,
                );
                return { ...d, injuries: list };
              })
            }
            className="text-sm"
          />
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400">المدة (يوم)</label>
            <Input
              type="number"
              min={0}
              value={row.durationDays || ""}
              onChange={(e) =>
                setData((d) => {
                  const list = (d.injuries as OrthoRow[]).map((x) =>
                    x.id === row.id ? { ...x, durationDays: Math.max(0, Number(e.target.value) || 0) } : x,
                  );
                  return { ...d, injuries: list };
                })
              }
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 dark:text-gray-400">تكلفة (₪)</label>
            <Input
              type="number"
              min={0}
              value={row.cost || ""}
              onChange={(e) =>
                setData((d) => {
                  const list = (d.injuries as OrthoRow[]).map((x) =>
                    x.id === row.id ? { ...x, cost: Math.max(0, Number(e.target.value) || 0) } : x,
                  );
                  return { ...d, injuries: list };
                })
              }
              className="text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() =>
              setData((d) => ({
                ...d,
                injuries: (d.injuries as OrthoRow[]).filter((x) => x.id !== row.id),
              }))
            }
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {injuries.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">لا إصابات مسجّلة.</p>}
        </div>
      </div>
    </div>
  );
}

/* ─── Urology ─── */
type UroRow = { id: string; problem: string; cost: number };

function UrologyBlock({
  data,
  setData,
}: {
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const issues = (data.issues as UroRow[]) || [];
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4 space-y-3 dark:border-violet-900/40 dark:bg-violet-950/20">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">المشكلة والتكلفة</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() =>
            setData((d) => ({
              ...d,
              issues: [...(Array.isArray(d.issues) ? (d.issues as UroRow[]) : []), { id: newId("ur"), problem: "", cost: 0 }],
            }))
          }
        >
          <IconPlus className="h-3.5 w-3.5" /> صف
        </Button>
      </div>
      {issues.map((row) => (
        <div key={row.id} className="flex flex-wrap gap-2 items-end rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
          <Input
            className="flex-1 min-w-[160px] text-sm"
            placeholder="وصف المشكلة (كلى، مسالك، التهاب...)"
            value={row.problem}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                issues: (d.issues as UroRow[]).map((x) => (x.id === row.id ? { ...x, problem: e.target.value } : x)),
              }))
            }
          />
          <Input
            type="number"
            min={0}
            className="w-28 text-sm"
            placeholder="₪"
            value={row.cost || ""}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                issues: (d.issues as UroRow[]).map((x) =>
                  x.id === row.id ? { ...x, cost: Math.max(0, Number(e.target.value) || 0) } : x,
                ),
              }))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() =>
              setData((d) => ({
                ...d,
                issues: (d.issues as UroRow[]).filter((x) => x.id !== row.id),
              }))
            }
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {issues.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">لا مشاكل مسجّلة.</p>}
    </div>
  );
}

/* ─── Cardiology ─── */
type CardioRow = { zoneId: CardiologyZoneId; problem: string; cost: number };

function CardiologyBlock({
  data,
  setData,
}: {
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const rows = (data.cardiac as CardioRow[]) || [];
  const [selected, setSelected] = useState<CardiologyZoneId | null>("heart");

  const problemIds = useMemo(
    () => rows.filter((r) => r.problem?.trim() || (r.cost ?? 0) > 0).map((r) => r.zoneId),
    [rows],
  );
  const effectiveSelected = useMemo<CardiologyZoneId | null>(() => {
    const explicit = selected;
    const withData = rows.find((r) => r.problem?.trim() || (r.cost ?? 0) > 0)?.zoneId ?? null;
    const fallback = rows[0]?.zoneId ?? null;
    return explicit ?? withData ?? fallback;
  }, [rows, selected]);

  const upsert = (zoneId: CardiologyZoneId, patch: Partial<CardioRow>) => {
    setData((d) => {
      const list = [...((d.cardiac as CardioRow[]) || [])];
      const i = list.findIndex((x) => x.zoneId === zoneId);
      if (i < 0) list.push({ zoneId, problem: "", cost: 0, ...patch });
      else list[i] = { ...list[i], ...patch };
      return { ...d, cardiac: list };
    });
  };

  const rowFor = (id: CardiologyZoneId) => rows.find((r) => r.zoneId === id);

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/20 p-4 space-y-4 dark:border-red-900/40 dark:bg-red-950/20">
      <p className="text-xs text-gray-600 dark:text-gray-400">اختر منطقة من الرسم ثم سجّل التشخيص والتكلفة التقديرية.</p>
      <div className="flex flex-col md:flex-row gap-6">
        <CardiologyHeartSvg
          selected={effectiveSelected}
          onSelect={(id) => setSelected(id)}
          problemIds={problemIds}
        />
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-1">
            {CARDIO_ZONES.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelected(z.id)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-full border",
                  effectiveSelected === z.id
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200",
                )}
              >
                {z.label}
              </button>
            ))}
          </div>
          {effectiveSelected && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2 dark:border-slate-700 dark:bg-slate-900/60">
              <Input
                placeholder="مشكلة / تشخيص"
                value={rowFor(effectiveSelected)?.problem || ""}
                onChange={(e) => upsert(effectiveSelected, { problem: e.target.value })}
                className="text-sm"
              />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">تكلفة (₪)</span>
                <Input
                  type="number"
                  min={0}
                  className="w-28 h-9 text-sm"
                  value={rowFor(effectiveSelected)?.cost ?? ""}
                  onChange={(e) =>
                    upsert(effectiveSelected, { cost: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </div>
          )}
          {rows.some((r) => r.problem?.trim() || (r.cost ?? 0) > 0) && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="mb-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400">المدخلات المحفوظة</p>
              <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                {rows
                  .filter((r) => r.problem?.trim() || (r.cost ?? 0) > 0)
                  .map((r) => (
                    <li key={r.zoneId} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 dark:bg-slate-950/80">
                      <span className="truncate">
                        {CARDIO_ZONES.find((z) => z.id === r.zoneId)?.label ?? r.zoneId} — {r.problem || "بدون وصف"}
                      </span>
                      <span className="shrink-0 font-semibold text-blue-700 dark:text-blue-400">₪{r.cost ?? 0}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Generic ─── */
type GenRow = { id: string; label: string; detail: string; cost: number };

function GenericBlock({
  data,
  setData,
}: {
  data: Record<string, unknown>;
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const items = (data.items as GenRow[]) || [];
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">بنود الخطة</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() =>
            setData((d) => ({
              ...d,
              items: [...(Array.isArray(d.items) ? (d.items as GenRow[]) : []), { id: newId("g"), label: "", detail: "", cost: 0 }],
            }))
          }
        >
          <IconPlus className="h-3.5 w-3.5" /> بند
        </Button>
      </div>
      {items.map((row) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[120px_1fr_100px_auto] items-end rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/60">
          <Input
            placeholder="عنوان"
            value={row.label}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                items: (d.items as GenRow[]).map((x) => (x.id === row.id ? { ...x, label: e.target.value } : x)),
              }))
            }
            className="text-sm"
          />
          <Input
            placeholder="تفاصيل"
            value={row.detail}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                items: (d.items as GenRow[]).map((x) => (x.id === row.id ? { ...x, detail: e.target.value } : x)),
              }))
            }
            className="text-sm"
          />
          <Input
            type="number"
            min={0}
            placeholder="₪"
            value={row.cost || ""}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                items: (d.items as GenRow[]).map((x) =>
                  x.id === row.id ? { ...x, cost: Math.max(0, Number(e.target.value) || 0) } : x,
                ),
              }))
            }
            className="text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-red-500"
            onClick={() =>
              setData((d) => ({
                ...d,
                items: (d.items as GenRow[]).filter((x) => x.id !== row.id),
              }))
            }
          >
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-gray-400 dark:text-gray-500">أضف بنوداً للخطة العلاجية.</p>}
    </div>
  );
}
