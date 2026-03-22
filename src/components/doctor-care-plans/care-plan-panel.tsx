"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2, Plus, Trash2, CheckCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CarePlanType } from "@/lib/specialty-plan-registry";
import { CARE_PLAN_LABELS } from "@/lib/specialty-plan-registry";
import { PregnancyWeekSvg } from "./pregnancy-week-svg";
import {
  PediatricsBodySvg,
  PEDIATRIC_ORGANS,
  type PediatricOrganId,
} from "./pediatrics-body-svg";
import { CardiologyHeartSvg, CARDIO_ZONES, type CardiologyZoneId } from "./cardiology-heart-svg";
import { cn } from "@/lib/utils";

type Props = {
  clinicPatientId: string;
  carePlanType: CarePlanType;
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CarePlanPanel({ clinicPatientId, carePlanType }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clinic/patients/${clinicPatientId}/care-plan`);
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "فشل التحميل");
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
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [clinicPatientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clinic/patients/${clinicPatientId}/care-plan`, {
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
      if (j.plan?.data) setData((j.plan.data as Record<string, unknown>) ?? {});
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        جاري تحميل الخطة...
      </div>
    );
  }

  const title = CARE_PLAN_LABELS[carePlanType] ?? "خطة العلاج";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            البيانات مرتبطة بهذا المريض وحسب تخصصك. المراجعات في قسم النساء والتوليد لا تُسجّل كتكلفة في الخطة.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          حفظ الخطة
        </Button>
      </div>

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
      {(carePlanType === "GENERIC" || carePlanType === "DENTAL") && (
        <GenericBlock data={data} setData={setData} />
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-2">
        <label className="text-xs font-semibold text-gray-700">ملاحظات الطبيب (عامة)</label>
        <textarea
          value={doctorNotes}
          onChange={(e) => setDoctorNotes(e.target.value)}
          rows={4}
          placeholder="أي توصيات أو ملاحظات إضافية تظهر للفريق أو في المراجعات القادمة..."
          className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
        />
      </div>

      <Button type="button" onClick={() => void save()} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
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
    <div className="space-y-4 rounded-xl border border-pink-100 bg-pink-50/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            أول يوم في آخر دورة (LMP)
          </label>
          <input
            type="date"
            value={lmp}
            onChange={(e) => setData((d) => ({ ...d, lmpDate: e.target.value }))}
            className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
        </div>
        {pregnancy && !pregnancy.invalid && (
          <div className="rounded-lg bg-white border border-pink-200 p-3 text-sm space-y-1">
            <div>
              <span className="text-gray-600">عمر الحمل: </span>
              <strong className="text-pink-800">
                {pregnancy.weeks} أسبوعاً {pregnancy.daysR > 0 ? `و ${pregnancy.daysR} يوماً` : ""}
              </strong>
            </div>
            <div>
              <span className="text-gray-600">التاريخ المتوقع للولادة: </span>
              <strong dir="ltr">{format(pregnancy.edd, "dd/MM/yyyy", { locale: ar })}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <PregnancyWeekSvg week={displayWeek} />
        <p className="text-xs text-gray-600 flex-1">
          الرسم توضيحي تقريبي حسب الأسبوع. يمكن لاحقاً ربط صور تفصيلية لكل أسبوع من مجلد ثابت.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-800">مراجعات المتابعة (بدون تكلفة في الخطة)</span>
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
            <Plus className="h-3.5 w-3.5" /> مراجعة
          </Button>
        </div>
        <div className="space-y-2">
          {reviewVisits.length === 0 && (
            <p className="text-xs text-gray-400">لا مراجعات بعد — أضف مواعيد المتابعة الدورية.</p>
          )}
          {reviewVisits.map((rv) => (
            <div key={rv.id} className="flex flex-wrap gap-2 items-end rounded-lg border border-white bg-white p-2">
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
                className="h-8 rounded border border-gray-200 px-2 text-xs"
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
                <Trash2 className="h-4 w-4" />
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

  const problemIds = useMemo(() => rows.filter((r) => r.problem?.trim()).map((r) => r.organId), [rows]);

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
    <div className="rounded-xl border border-sky-100 bg-sky-50/30 p-4 space-y-4">
      <p className="text-xs text-gray-600">
        اختر عضواً من المخطط، ثم سجّل المشكلة والتكلفة المقترحة (اختياري).
      </p>
      <div className="flex flex-col md:flex-row gap-6">
        <PediatricsBodySvg selected={selected} onSelect={(id) => setSelected(id)} highlightIds={problemIds} />
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-1">
            {PEDIATRIC_ORGANS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o.id)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-full border",
                  selected === o.id ? "bg-sky-600 text-white border-sky-600" : "bg-white border-gray-200",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {selected && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-800">
                {PEDIATRIC_ORGANS.find((x) => x.id === selected)?.label}
              </div>
              <Input
                placeholder="وصف المشكلة"
                value={rowFor(selected)?.problem || ""}
                onChange={(e) => upsertRow(selected, { problem: e.target.value })}
                className="text-sm"
              />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-600 shrink-0">تكلفة تقريبية (₪)</span>
                <Input
                  type="number"
                  min={0}
                  className="h-9 w-28 text-sm"
                  value={rowFor(selected)?.cost ?? ""}
                  onChange={(e) =>
                    upsertRow(selected, { cost: Math.max(0, Number(e.target.value) || 0) })
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
    <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-800">الإصابات ومدة العلاج والتكلفة</span>
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
          <Plus className="h-3.5 w-3.5" /> إصابة
        </Button>
      </div>
      {injuries.map((row) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_100px_100px_auto] items-end rounded-lg border bg-white p-2">
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
            <label className="text-[10px] text-gray-500">المدة (يوم)</label>
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
            <label className="text-[10px] text-gray-500">تكلفة (₪)</label>
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {injuries.length === 0 && <p className="text-xs text-gray-400">لا إصابات مسجّلة.</p>}
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
    <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-800">المشكلة والتكلفة</span>
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
          <Plus className="h-3.5 w-3.5" /> صف
        </Button>
      </div>
      {issues.map((row) => (
        <div key={row.id} className="flex flex-wrap gap-2 items-end rounded-lg border bg-white p-2">
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {issues.length === 0 && <p className="text-xs text-gray-400">لا مشاكل مسجّلة.</p>}
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

  const problemIds = useMemo(() => rows.filter((r) => r.problem?.trim()).map((r) => r.zoneId), [rows]);

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
    <div className="rounded-xl border border-red-100 bg-red-50/20 p-4 space-y-4">
      <p className="text-xs text-gray-600">اختر منطقة من الرسم ثم سجّل التشخيص والتكلفة التقديرية.</p>
      <div className="flex flex-col md:flex-row gap-6">
        <CardiologyHeartSvg selected={selected} onSelect={(id) => setSelected(id)} problemIds={problemIds} />
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-1">
            {CARDIO_ZONES.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelected(z.id)}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-full border",
                  selected === z.id ? "bg-red-600 text-white border-red-600" : "bg-white border-gray-200",
                )}
              >
                {z.label}
              </button>
            ))}
          </div>
          {selected && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
              <Input
                placeholder="مشكلة / تشخيص"
                value={rowFor(selected)?.problem || ""}
                onChange={(e) => upsert(selected, { problem: e.target.value })}
                className="text-sm"
              />
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-600">تكلفة (₪)</span>
                <Input
                  type="number"
                  min={0}
                  className="w-28 h-9 text-sm"
                  value={rowFor(selected)?.cost ?? ""}
                  onChange={(e) => upsert(selected, { cost: Math.max(0, Number(e.target.value) || 0) })}
                />
              </div>
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
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-800">بنود الخطة</span>
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
          <Plus className="h-3.5 w-3.5" /> بند
        </Button>
      </div>
      {items.map((row) => (
        <div key={row.id} className="grid gap-2 sm:grid-cols-[120px_1fr_100px_auto] items-end rounded-lg border bg-white p-2">
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-gray-400">أضف بنوداً للخطة العلاجية.</p>}
    </div>
  );
}
