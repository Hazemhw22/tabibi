"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import IconLoader from "@/components/icon/icon-loader";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconHeart from "@/components/icon/icon-heart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const DENTAL_PROBLEMS: { id: string; label: string; color: string }[] = [
  { id: "FILLING", label: "حشوة", color: "bg-green-500" },
  { id: "RCT", label: "عصب", color: "bg-red-500" },
  { id: "CROWN", label: "تاج", color: "bg-purple-500" },
  { id: "IMPLANT", label: "زرعة", color: "bg-orange-500" },
  { id: "EXTRACTION", label: "خلع", color: "bg-rose-500" },
  { id: "ORTHO", label: "تقويم", color: "bg-blue-500" },
  { id: "BLEACHING", label: "تبييض", color: "bg-cyan-500" },
  { id: "SCALING", label: "تنظيف", color: "bg-teal-500" },
  { id: "OTHER", label: "أخرى", color: "bg-yellow-500" },
];

const TOOTH_ICON_PATH =
  "m328.179 0c-24.301 0-48.562 5.537-72.166 16.464-23.604-10.927-47.865-16.464-72.166-16.464-29.214 0-61.277 7.795-85.958 27.465-3.239 2.582-3.772 7.301-1.191 10.54 2.583 3.24 7.3 3.772 10.54 1.19 31.705-25.27 87.139-34.248 141.276-9.669v3.223c0 4.143 3.358 7.5 7.5 7.5s7.5-3.357 7.5-7.5v-3.223c21.235-9.641 42.968-14.526 64.665-14.526 121.121 0 157.052 139.411 88.845 231.763-8.882 11.845-10.82 46.142-12.09 64.017-3.276 46.125-10.624 115.807-33.228 156.168-11.212 20.02-24.335 29.85-40.021 30.053-23.798 0-41.207-46.824-45.424-71.976-11.587-69.101-10.841-64.882-11.075-65.633-2.662-8.581-10.188-14.125-19.173-14.125h-21.924c-4.142 0-7.5 3.357-7.5 7.5s3.358 7.5 7.5 7.5h2.543c-.007.036-.019.07-.025.106-11.282 67.278-12.088 83.621-25.835 109.293-9.848 18.393-19.802 27.334-30.333 27.335-56.745-.733-69.361-130.144-73.346-186.223-2.057-28.947-4.387-53.744-12.056-63.971-45.677-61.846-43.077-140.02-7.303-187.478 2.494-3.308 1.833-8.01-1.474-10.504-3.309-2.493-8.011-1.835-10.503 1.475-40.329 53.498-41.894 138.926 7.247 205.463 5.68 7.573 8.008 40.334 9.127 56.078 4.915 69.17 18.85 199.266 88.211 200.158 33.799 0 54.643-51.251 60.218-84.495l10.742-64.059c1.623-4.259 7.802-4.259 9.425 0l10.742 64.059c5.591 33.341 26.433 84.496 60.314 84.494 69.186-.893 83.216-131.189 88.115-200.156.725-10.198 3.036-47.959 9.16-56.123 75.374-102.059 33.234-255.719-100.879-255.719z";

const TOOTH_BOUNDS: Record<"incisor" | "canine" | "premolar" | "molar", { w: number; h: number; tx: number; ty: number }> = {
  incisor: { w: 512, h: 512, tx: -256, ty: -256 },
  canine: { w: 512, h: 512, tx: -256, ty: -256 },
  premolar: { w: 512, h: 512, tx: -256, ty: -256 },
  molar: { w: 512, h: 512, tx: -256, ty: -256 },
};

function getToothType(n: number): "incisor" | "canine" | "premolar" | "molar" {
  if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(n)) return "molar";
  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(n)) return "premolar";
  if ([6, 11, 22, 27].includes(n)) return "canine";
  return "incisor";
}

const DENTAL_VIEW = { w: 800, h: 400 };
const DENTAL_CHART_LAYOUT: { num: number; cx: number; cy: number; w: number; h: number; type: "incisor" | "canine" | "premolar" | "molar" }[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num, i) => {
    const cx = 80 + (i * 640) / 15;
    const cy = 95;
    const w = [42, 40, 38, 30, 30, 26, 22, 22, 22, 22, 26, 30, 30, 38, 40, 42][i];
    const h = 48;
    return { num, cx, cy, w, h, type: getToothType(num) };
  }),
  ...[17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map((num, i) => {
    const cx = 80 + (i * 640) / 15;
    const cy = 298;
    const w = [42, 40, 38, 30, 30, 26, 22, 22, 22, 22, 26, 30, 30, 38, 40, 42][i];
    const h = 48;
    return { num, cx, cy, w, h, type: getToothType(num) };
  }),
];

export type DentalToothChartBlockProps = {
  clinicPatientId: string;
  patientSource: "clinic" | "platform";
  /** عنوان القسم — يُستخدم في تبويب «خطة علاج الأسنان» للطبيب العام */
  heading?: string;
};

export function DentalToothChartBlock({
  clinicPatientId,
  patientSource,
  heading = "مخطط الأسنان وخطة العلاج",
}: DentalToothChartBlockProps) {
  const router = useRouter();
  const filterId = `dentalSoftShadow-${useId().replace(/:/g, "")}`;

  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [toothProblems, setToothProblems] = useState<Record<string, string | null>>({});
  const [toothNotes, setToothNotes] = useState<Record<string, string>>({});
  const [toothPrices, setToothPrices] = useState<Record<string, number>>({});
  const [toothCharged, setToothCharged] = useState<Record<string, boolean>>({});
  const [toothDone, setToothDone] = useState<Record<string, boolean>>({});
  const [dentalSaving, setDentalSaving] = useState(false);
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [otherModalName, setOtherModalName] = useState("");
  const [otherModalPrice, setOtherModalPrice] = useState("");

  const loadFromServer = useCallback(async () => {
    if (patientSource !== "clinic" || !clinicPatientId) return;
    const res = await fetch(`/api/clinic/patients/${clinicPatientId}/dental-plan`);
    const data = await res.json().catch(() => ({ items: [] }));
    const items = data.items ?? [];
    const problems: Record<string, string | null> = {};
    const notes: Record<string, string> = {};
    const prices: Record<string, number> = {};
    const charged: Record<string, boolean> = {};
    const done: Record<string, boolean> = {};
    for (const it of items) {
      const id = String(it.toothNumber);
      problems[id] = it.problemType;
      notes[id] = it.note ?? "";
      prices[id] = Number(it.price) || 0;
      charged[id] = !!(it as { chargedToBalance?: boolean }).chargedToBalance;
      done[id] = it.isDone ?? false;
    }
    setToothProblems(problems);
    setToothNotes(notes);
    setToothPrices(prices);
    setToothCharged(charged);
    setToothDone(done);
  }, [clinicPatientId, patientSource]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  const handleToothClick = (id: string) => {
    setSelectedTeeth((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [id]));
  };

  const getToothColors = (id: string) => {
    const problem = toothProblems[id];
    const isSelected = selectedTeeth.includes(id);
    let fill = "#ffffff";
    let stroke = "#4A4A4A";
    switch (problem) {
      case "FILLING":
        fill = "#4ade80";
        stroke = "#16a34a";
        break;
      case "RCT":
        fill = "#f87171";
        stroke = "#dc2626";
        break;
      case "CROWN":
        fill = "#c084fc";
        stroke = "#9333ea";
        break;
      case "IMPLANT":
        fill = "#fb923c";
        stroke = "#ea580c";
        break;
      case "EXTRACTION":
        fill = "#fda4af";
        stroke = "#e11d48";
        break;
      case "ORTHO":
        fill = "#60a5fa";
        stroke = "#2563eb";
        break;
      case "BLEACHING":
        fill = "#67e8f9";
        stroke = "#0891b2";
        break;
      case "SCALING":
        fill = "#5eead4";
        stroke = "#0d9488";
        break;
      default:
        if (problem?.startsWith("OTHER:")) {
          fill = "#facc15";
          stroke = "#ca8a04";
          break;
        }
        if (toothNotes[id]) {
          fill = "#60a5fa";
          stroke = "#2563eb";
        }
    }
    if (isSelected) {
      stroke = "#1d4ed8";
      if (!problem && !toothNotes[id]) fill = "#93c5fd";
    }
    return { fill, stroke };
  };

  const applyProblemToSelected = (problemId: string) => {
    if (selectedTeeth.length === 0) {
      toast.error("اختر سناً واحدة على الأقل من المخطط أولاً");
      return;
    }
    if (problemId === "OTHER") {
      setOtherModalName("");
      setOtherModalPrice("");
      setOtherModalOpen(true);
      return;
    }
    setToothProblems((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = problemId;
      });
      return next;
    });
  };

  const confirmOtherModal = () => {
    const name = otherModalName.trim();
    if (!name) {
      toast.error("أدخل اسم المشكلة");
      return;
    }
    const problemType = `OTHER:${name}`;
    setToothProblems((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = problemType;
      });
      return next;
    });
    const price = parseFloat(otherModalPrice) || 0;
    if (price > 0) {
      setToothPrices((prev) => {
        const next = { ...prev };
        selectedTeeth.forEach((id) => {
          next[id] = price;
        });
        return next;
      });
    }
    setToothNotes((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = name;
      });
      return next;
    });
    setOtherModalOpen(false);
  };

  const toggleToothDone = () => {
    if (selectedTeeth.length === 0) {
      toast.error("اختر سنّاً من المخطط أولاً");
      return;
    }
    setToothDone((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = !prev[id];
      });
      return next;
    });
  };

  const saveDentalPlan = async () => {
    if (patientSource !== "clinic") return;
    setDentalSaving(true);
    try {
      const items = Object.entries(toothProblems)
        .filter(([, problem]) => problem)
        .map(([id, problem]) => {
          const toothNum = parseInt(id, 10);
          if (Number.isNaN(toothNum) || toothNum < 1 || toothNum > 32) return null;
          return {
            toothNumber: toothNum,
            problemType: problem as string,
            note: toothNotes[id] ?? "",
            isDone: toothDone[id] ?? false,
            price: toothPrices[id] ?? 0,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null);

      const res = await fetch(`/api/clinic/patients/${clinicPatientId}/dental-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, chargeToBalance: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "فشل حفظ مخطط الأسنان");
        toast.error(msg);
      } else {
        toast.success("تم حفظ مخطط الأسنان لهذا المريض ✓");
        if (data.dentalSmsNotifyAttempted === true) {
          if (data.dentalSmsSent === true) {
            toast.message("أُرسلت للمريض رسالة SMS/واتساب بالبنود والتكاليف الجديدة (إن وُجدت الإعدادات).");
          } else {
            toast.warning("لم تُرسل رسالة للمريض. تحقق من الرقم وإعدادات SMS/واتساب.");
          }
        }
        router.refresh();
        const res2 = await fetch(`/api/clinic/patients/${clinicPatientId}/dental-plan`);
        const data2 = await res2.json().catch(() => ({ items: [] }));
        const items2 = data2.items ?? [];
        const charged: Record<string, boolean> = {};
        for (const it of items2) {
          const tid = String(it.toothNumber);
          charged[tid] = !!(it as { chargedToBalance?: boolean }).chargedToBalance;
        }
        setToothCharged((prev) => ({ ...prev, ...charged }));
      }
    } catch {
      toast.error("خطأ في الاتصال أثناء حفظ مخطط الأسنان");
    } finally {
      setDentalSaving(false);
    }
  };

  if (patientSource !== "clinic") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        مخطط الأسنان التفاعلي وحفظه على الملف متاحان لمريض العيادة فقط. عند ربط المريض بملف عيادة يمكن استخدام المخطط هناك.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <IconHeart className="h-4 w-4 text-blue-600" />
        {heading}
      </h3>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4 dark:border-slate-700 dark:bg-slate-950/40">
        <p className="text-xs text-gray-600 dark:text-slate-400">
          اضغط على السن المطلوبة من المخطط لتحديدها (يمكن اختيار أكثر من سن)، ثم اكتب المشكلة أو خطة العلاج لكل سن في الأسفل.
        </p>

        <div className="space-y-3">
          <div className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white dark:border-slate-600">
            <svg viewBox={`0 0 ${DENTAL_VIEW.w} ${DENTAL_VIEW.h}`} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                  <feOffset dx="1" dy="1" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.15" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width={DENTAL_VIEW.w} height={DENTAL_VIEW.h} fill="#ffffff" />
              <text x="400" y="28" textAnchor="middle" fontSize="14" fontWeight="600" fill="#374151">
                الفك العلوي
              </text>
              <text x="400" y="378" textAnchor="middle" fontSize="14" fontWeight="600" fill="#374151">
                الفك السفلي
              </text>
              <g id="upper-jaw">
                {DENTAL_CHART_LAYOUT.filter((t) => t.num <= 16).map((t) => {
                  const id = String(t.num);
                  const { fill, stroke } = getToothColors(id);
                  const b = TOOTH_BOUNDS[t.type];
                  const sx = t.w / b.w;
                  const sy = t.h / b.h;
                  return (
                    <g
                      key={`tooth-${t.num}`}
                      id={`tooth-${t.num}`}
                      onClick={() => handleToothClick(id)}
                      className="cursor-pointer"
                      style={{ transition: "fill 0.3s ease" }}
                    >
                      <path
                        d={TOOTH_ICON_PATH}
                        fill={fill}
                        fillOpacity={1}
                        fillRule="nonzero"
                        stroke={stroke}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        filter={`url(#${filterId})`}
                        transform={`translate(${t.cx},${t.cy}) scale(${sx},${-sy}) translate(${b.tx},${b.ty})`}
                      />
                      <text
                        x={t.cx}
                        y={t.cy + (t.num <= 16 ? t.h / 2 + 18 : -t.h / 2 - 6)}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#374151"
                      >
                        {t.num}
                      </text>
                      {toothDone[id] && (
                        <text
                          x={t.cx}
                          y={t.cy + (t.num <= 16 ? t.h / 2 + 8 : -t.h / 2 - 16)}
                          textAnchor="middle"
                          fontSize="14"
                          fill="#16a34a"
                          fontWeight="bold"
                        >
                          ✓
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
              <g id="lower-jaw">
                {DENTAL_CHART_LAYOUT.filter((t) => t.num >= 17).map((t) => {
                  const id = String(t.num);
                  const { fill, stroke } = getToothColors(id);
                  const b = TOOTH_BOUNDS[t.type];
                  const sx = t.w / b.w;
                  const sy = t.h / b.h;
                  return (
                    <g
                      key={`tooth-${t.num}`}
                      id={`tooth-${t.num}`}
                      onClick={() => handleToothClick(id)}
                      className="cursor-pointer"
                      style={{ transition: "fill 0.3s ease" }}
                    >
                      <path
                        d={TOOTH_ICON_PATH}
                        fill={fill}
                        fillOpacity={1}
                        fillRule="nonzero"
                        stroke={stroke}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        filter={`url(#${filterId})`}
                        transform={`translate(${t.cx},${t.cy}) scale(${sx},${sy}) translate(${b.tx},${b.ty})`}
                      />
                      <text x={t.cx} y={t.cy - t.h / 2 - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151">
                        {t.num}
                      </text>
                      {toothDone[id] && (
                        <text
                          x={t.cx}
                          y={t.cy - t.h / 2 - 16}
                          textAnchor="middle"
                          fontSize="14"
                          fill="#16a34a"
                          fontWeight="bold"
                        >
                          ✓
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-gray-200 mt-2 dark:border-slate-600">
          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
            السن المحددة:{" "}
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {selectedTeeth.length ? selectedTeeth.join(", ") : "لم يتم اختيار سن بعد"}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {DENTAL_PROBLEMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyProblemToSelected(p.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium",
                  "border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200",
                )}
              >
                <span className={cn("h-3 w-3 rounded-full", p.color)} />
                {p.label}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={toggleToothDone} disabled={selectedTeeth.length === 0} className="gap-1.5">
            <IconCircleCheck className="h-3.5 w-3.5" />
            {selectedTeeth.some((id) => toothDone[id]) ? "إزالة إشارة الإنجاز" : "تم ✓ إنجاز العلاج"}
          </Button>
          {Object.keys(toothProblems).filter((id) => toothProblems[id]).length > 0 && (
            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2 max-h-48 overflow-auto dark:border-slate-600 dark:bg-slate-900/50">
              <p className="text-[11px] font-semibold text-gray-600 dark:text-slate-400 mb-1">
                الأسنان المعالجة — السعر (يُضاف للرصيد تلقائياً عند الحفظ)
              </p>
              {Object.entries(toothProblems)
                .filter(([, p]) => p)
                .map(([id]) => {
                  const p = DENTAL_PROBLEMS.find(
                    (x) => x.id === toothProblems[id] || x.id === (toothProblems[id]?.startsWith("OTHER:") ? "OTHER" : ""),
                  );
                  const label = toothProblems[id]?.startsWith("OTHER:")
                    ? toothNotes[id] || toothProblems[id]?.replace("OTHER:", "")
                    : p?.label ?? toothProblems[id];
                  return (
                    <div key={id} className="flex items-center gap-2 text-[11px]">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] shrink-0">
                        {id}
                      </span>
                      <span className="flex-1 text-gray-700 dark:text-slate-200">{label}</span>
                      <span className="text-gray-500 dark:text-slate-500">₪</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        value={toothPrices[id] || ""}
                        disabled={toothCharged[id]}
                        onChange={(e) => {
                          if (toothCharged[id]) return;
                          const v = parseFloat(e.target.value) || 0;
                          setToothPrices((prev) => ({ ...prev, [id]: v }));
                        }}
                        className={cn("w-20 h-7 text-xs", toothCharged[id] && "bg-gray-100 cursor-not-allowed dark:bg-slate-800")}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant={toothDone[id] ? "default" : "outline"}
                        className={cn("h-7 px-2 text-[10px] gap-0.5 shrink-0", toothDone[id] && "bg-green-600 hover:bg-green-700")}
                        onClick={() => setToothDone((prev) => ({ ...prev, [id]: !prev[id] }))}
                      >
                        <IconCircleCheck className="h-3 w-3" />
                        {toothDone[id] ? "تم" : "إنجاز"}
                      </Button>
                    </div>
                  );
                })}
            </div>
          )}
          <div className="pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void saveDentalPlan()}
              disabled={dentalSaving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {dentalSaving ? (
                <>
                  <IconLoader className="h-3.5 w-3.5 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <IconCircleCheck className="h-3.5 w-3.5" />
                  حفظ مخطط الأسنان للمريض
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={otherModalOpen} onOpenChange={setOtherModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>مشكلة أخرى — سن {selectedTeeth.join(", ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">اسم المشكلة</label>
              <Input
                placeholder="مثال: تحنيط، سحب عصب مؤقت..."
                value={otherModalName}
                onChange={(e) => setOtherModalName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">السعر (₪)</label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={otherModalPrice}
                onChange={(e) => setOtherModalPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOtherModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={confirmOtherModal}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
