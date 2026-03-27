"use client";

import type { Dispatch, SetStateAction } from "react";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IntlFollowUpVisit } from "@/components/doctor-care-plans/clinical-intl-care-plan-config";
import {
  CARE_PLAN_FOLLOW_UP_VISITS_KEY,
  getFollowUpVisitsFromPlanData,
  weekdayArFromIso,
} from "@/lib/care-plan-follow-ups";

const MAX_FOLLOW_UP_ROWS = 16;

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type Props = {
  data: Record<string, unknown>;
  setData: Dispatch<SetStateAction<Record<string, unknown>>>;
  /** لقراءة المواعيد القديمة من intlClinical[نوع] عند الحاجة */
  carePlanType?: string;
};

export function CarePlanFollowUpsSection({ data, setData, carePlanType }: Props) {
  const visits = getFollowUpVisitsFromPlanData(data, carePlanType);

  const setVisits = (next: IntlFollowUpVisit[]) => {
    setData((d) => {
      const nextData = { ...d, [CARE_PLAN_FOLLOW_UP_VISITS_KEY]: next };
      return nextData;
    });
  };

  const add = () => {
    if (visits.length >= MAX_FOLLOW_UP_ROWS) return;
    setVisits([
      ...visits,
      { id: newId("fu"), date: "", time: "", slot: "", note: "" },
    ]);
  };

  const update = (id: string, patch: Partial<IntlFollowUpVisit>) => {
    setVisits(visits.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const remove = (id: string) => {
    setVisits(visits.filter((x) => x.id !== id));
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white/90 p-3 space-y-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <header className="space-y-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">مواعيد المتابعة</h4>
          <p className="text-[11px] text-gray-500 leading-snug max-w-xl dark:text-gray-400">
            تُحفظ مع خطة العلاج الخاصة بحسابك. إن زار المريض أكثر من طبيب، لا يرى كل طبيب مواعيد أو ملاحظات الطبيب الآخر.
          </p>
        </header>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 shrink-0"
          disabled={visits.length >= MAX_FOLLOW_UP_ROWS}
          onClick={add}
        >
          <IconPlus className="h-3.5 w-3.5" />
          إضافة موعد
        </Button>
      </div>

      {visits.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-gray-500 py-2">لا مواعيد مسجّلة — أضف موعداً عند الحاجة.</p>
      ) : (
        <div className="space-y-3">
          {visits.map((row) => (
            <div
              key={row.id}
              className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-end rounded-lg border border-gray-100 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div className="grid gap-1 min-w-[160px]">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">التاريخ</span>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => update(row.id, { date: e.target.value })}
                  className="h-9 rounded-lg border border-gray-300 px-2 text-sm bg-white dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="grid gap-1 min-w-[120px] flex-1">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">اليوم</span>
                <div className="h-9 flex items-center px-2 rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200">
                  {row.date ? weekdayArFromIso(row.date) : "—"}
                </div>
              </div>
              <div className="grid gap-1 min-w-[130px]">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">الساعة</span>
                <input
                  type="time"
                  value={row.time ?? ""}
                  onChange={(e) => update(row.id, { time: e.target.value })}
                  className="h-9 rounded-lg border border-gray-300 px-2 text-sm bg-white dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div className="grid gap-1 flex-1 min-w-[140px]">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">الدور / الفتحة</span>
                <Input
                  className="h-9 text-sm"
                  placeholder="حسب عيادتك (اختياري)"
                  value={row.slot ?? ""}
                  onChange={(e) => update(row.id, { slot: e.target.value })}
                />
              </div>
              <div className="grid gap-1 flex-1 min-w-[160px]">
                <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">ملاحظة</span>
                <Input
                  className="h-9 text-sm"
                  placeholder="اختياري"
                  value={row.note ?? ""}
                  onChange={(e) => update(row.id, { note: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-red-600 shrink-0 self-end"
                onClick={() => remove(row.id)}
                aria-label="حذف الموعد"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
