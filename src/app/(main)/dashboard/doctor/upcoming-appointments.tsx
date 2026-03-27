"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DoctorActions from "./doctor-actions";

export type ScheduleApt = {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  patientName: string;
  specialtyName: string;
  source: "platform" | "clinic";
  fee?: number;
};

type Props = {
  schedule: ScheduleApt[];
  todayDay: number;
  currentMonth: number;
  currentYear: number;
};

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** YYYY-MM-DD أو ISO — بدون إزاحة UTC */
function parseLocalYmd(s: string): Date {
  const part = s.split("T")[0] ?? s;
  const [y, m, d] = part.split("-").map(Number);
  if (!y || !m || !d) return new Date(s);
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getFutureDaysInMonth(year: number, month: number, today: Date): number[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();
  const isFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());
  if (isFutureMonth) return allDays;
  if (isCurrentMonth) return allDays.filter((day) => day >= today.getDate());
  return [];
}

export default function UpcomingAppointments({
  schedule,
  todayDay,
  currentMonth,
  currentYear,
}: Props) {
  const [viewDate, setViewDate] = useState(() => new Date(currentYear, currentMonth, 1));

  useEffect(() => {
    setViewDate(new Date(currentYear, currentMonth, 1));
  }, [currentYear, currentMonth]);

  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const canGoPrev = useMemo(() => {
    const t = new Date();
    return startOfMonth(viewDate) > startOfMonth(t);
  }, [viewDate]);

  const canGoNext = useMemo(() => {
    const t = new Date();
    return startOfMonth(viewDate) < new Date(t.getFullYear(), t.getMonth() + 6, 1);
  }, [viewDate]);

  const goPrevMonth = () => {
    if (!canGoPrev) return;
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const futureDays = useMemo(() => {
    const t = new Date();
    return getFutureDaysInMonth(viewYear, viewMonth, t);
  }, [viewYear, viewMonth]);

  const [selectedDay, setSelectedDay] = useState<number>(todayDay);

  useEffect(() => {
    const t = new Date();
    const days = getFutureDaysInMonth(viewYear, viewMonth, t);
    if (days.length === 0) return;
    setSelectedDay((prev) => (days.includes(prev) ? prev : days[0]));
  }, [viewMonth, viewYear]);

  const aptsByDay = useMemo(() => {
    const map = new Map<number, ScheduleApt[]>();
    for (const apt of schedule) {
      const d = parseLocalYmd(apt.date);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(apt);
      }
    }
    return map;
  }, [schedule, viewMonth, viewYear]);

  const filteredApts = schedule.filter((apt) => {
    const d = parseLocalYmd(apt.date);
    return (
      d.getDate() === selectedDay &&
      d.getMonth() === viewMonth &&
      d.getFullYear() === viewYear
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* ─── العنوان + تنقّل الشهر ─── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 gap-3">
        <h2 className="font-heading font-bold text-slate-800 dark:text-slate-100 text-lg">
          المواعيد القادمة
        </h2>
        <div
          dir="rtl"
          className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-1.5 shrink-0"
        >
          <button
            type="button"
            onClick={goNextMonth}
            disabled={!canGoNext}
            className="p-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="الشهر التالي"
            aria-label="الشهر التالي"
          >
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden />
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-200 min-w-[7.5rem] text-center tabular-nums">
            {MONTHS_AR[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            className="p-1 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="الشهر السابق"
            aria-label="الشهر السابق"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden />
          </button>
        </div>
      </div>

      {/* ─── شريط الأيام ─── */}
      <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 scrollbar-hide">
        {futureDays.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">لا أيام متاحة في هذا الشهر</p>
        ) : (
          futureDays.map((day) => {
            const isSelected = day === selectedDay;
            const now = new Date();
            const isToday =
              day === now.getDate() &&
              viewMonth === now.getMonth() &&
              viewYear === now.getFullYear();
            const dayApts = aptsByDay.get(day) ?? [];
            const hasPlatform = dayApts.some((a) => a.source === "platform");
            const hasClinic = dayApts.some((a) => a.source === "clinic");

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center min-w-[42px] py-2.5 px-1.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-600/30"
                    : isToday
                      ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-slate-700/80"
                }`}
              >
                <span
                  className={`text-sm font-bold leading-none ${
                    isSelected ? "text-white" : isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {day}
                </span>
                <div className="flex gap-0.5 mt-1.5 min-h-[6px]">
                  {hasPlatform && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                  {hasClinic && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  )}
                  {!hasPlatform && !hasClinic && (
                    <span className="w-1.5 h-1.5 rounded-full bg-transparent" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ─── قائمة الجدول ─── */}
      <div className="border-t border-slate-100 dark:border-slate-700 px-5 pt-4 pb-5">
        {filteredApts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            لا توجد مواعيد في هذا اليوم
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500 text-xs border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-3 text-right font-medium pr-1">نوع الموعد</th>
                  <th className="pb-3 text-right font-medium">المريض</th>
                  <th className="pb-3 text-right font-medium">التاريخ والوقت</th>
                  <th className="pb-3 text-right font-medium">المصدر</th>
                  <th className="pb-3 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredApts.map((apt) => (
                  <tr
                    key={`${apt.source}-${apt.id}`}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 pr-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-sm">
                          🩺
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[90px] truncate">
                          {apt.specialtyName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-200 shrink-0">
                          {apt.patientName.slice(0, 1)}
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                          {apt.patientName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {format(parseLocalYmd(apt.date), "d MMM", { locale: ar })}،{" "}
                        {apt.startTime}
                        {apt.endTime ? ` - ${apt.endTime}` : ""}
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={apt.source === "platform" ? "default" : "secondary"}
                        className="text-[10px] px-2"
                      >
                        {apt.source === "platform" ? "منصة" : "عيادة"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {apt.source === "platform" && apt.status === "DRAFT" ? (
                        <DoctorActions appointmentId={apt.id} mode="approval" />
                      ) : apt.source === "platform" && apt.status === "CONFIRMED" ? (
                        <DoctorActions appointmentId={apt.id} mode="visit" />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
