"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconFilter from "@/components/icon/icon-filter";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
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

export default function UpcomingAppointments({
  schedule,
  todayDay,
  currentMonth,
  currentYear,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<number>(todayDay);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const futureDays = allDays.filter((d) => d >= todayDay);

  const aptsByDay = useMemo(() => {
    const map = new Map<number, ScheduleApt[]>();
    for (const apt of schedule) {
      const d = new Date(apt.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(apt);
      }
    }
    return map;
  }, [schedule, currentMonth, currentYear]);

  const filteredApts = schedule.filter((apt) => {
    const d = new Date(apt.date);
    return (
      d.getDate() === selectedDay &&
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* ─── العنوان ─── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="font-heading font-bold text-slate-800 text-lg">
          المواعيد القادمة
        </h2>
        <div className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 select-none">
          <IconArrowForward className="h-3.5 w-3.5 cursor-pointer hover:text-blue-600 transition-colors" />
          <span className="text-xs font-semibold text-slate-600">
            {MONTHS_AR[currentMonth]} {currentYear}
          </span>
          <IconArrowLeft className="h-3.5 w-3.5 cursor-pointer hover:text-blue-600 transition-colors" />
        </div>
      </div>

      {/* ─── شريط الأيام ─── */}
      <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 scrollbar-hide">
        {futureDays.map((day) => {
          const isSelected = day === selectedDay;
          const isToday = day === todayDay;
          const dayApts = aptsByDay.get(day) ?? [];
          const hasPlatform = dayApts.some((a) => a.source === "platform");
          const hasClinic = dayApts.some((a) => a.source === "clinic");

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center min-w-[42px] py-2.5 px-1.5 rounded-xl border transition-all ${
                isSelected
                  ? "bg-blue-600 border-blue-600 shadow-md shadow-blue-600/30"
                  : isToday
                    ? "border-2 border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <span
                className={`text-sm font-bold leading-none ${
                  isSelected ? "text-white" : isToday ? "text-blue-600" : "text-slate-700"
                }`}
              >
                {day}
              </span>
              {/* نقاط المواعيد */}
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
        })}
      </div>

      {/* ─── قائمة الجدول ─── */}
      <div className="border-t border-slate-100 px-5 pt-4 pb-5">
        {filteredApts.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            لا توجد مواعيد في هذا اليوم
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-100">
                  <th className="pb-3 text-right font-medium pr-1">نوع الموعد</th>
                  <th className="pb-3 text-right font-medium">المريض</th>
                  <th className="pb-3 text-right font-medium">التاريخ والوقت</th>
                  <th className="pb-3 text-right font-medium">المصدر</th>
                  <th className="pb-3 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredApts.map((apt) => (
                  <tr
                    key={`${apt.source}-${apt.id}`}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* نوع الموعد */}
                    <td className="py-3 pr-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm">
                          🩺
                        </span>
                        <span className="text-xs text-slate-600 max-w-[90px] truncate">
                          {apt.specialtyName}
                        </span>
                      </div>
                    </td>
                    {/* المريض */}
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {apt.patientName.slice(0, 1)}
                        </div>
                        <span className="font-medium text-slate-800 truncate max-w-[120px]">
                          {apt.patientName}
                        </span>
                      </div>
                    </td>
                    {/* التاريخ والوقت */}
                    <td className="py-3">
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {format(new Date(apt.date), "d MMM", { locale: ar })}،{" "}
                        {apt.startTime}
                        {apt.endTime ? ` - ${apt.endTime}` : ""}
                      </span>
                    </td>
                    {/* المصدر */}
                    <td className="py-3">
                      <Badge
                        variant={apt.source === "platform" ? "default" : "secondary"}
                        className="text-[10px] px-2"
                      >
                        {apt.source === "platform" ? "منصة" : "عيادة"}
                      </Badge>
                    </td>
                    {/* الإجراءات */}
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
