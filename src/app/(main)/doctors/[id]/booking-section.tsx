"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconClock from "@/components/icon/icon-clock";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconCreditCard from "@/components/icon/icon-credit-card";
import IconLoader from "@/components/icon/icon-loader";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconLogin from "@/components/icon/icon-login";
import { toast } from "sonner";
import { DAYS_AR } from "@/lib/utils";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { format, addDays, startOfToday, getDay } from "date-fns";

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicId?: string | null;
  slotCapacity?: number;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
}

interface Doctor {
  id: string;
  consultationFee: number;
  user: { name: string | null };
  specialty: { nameAr: string };
}

interface Props {
  doctor: Doctor;
  timeSlots: TimeSlot[];
  clinics: Clinic[];
  isLoggedIn: boolean;
  callbackUrl?: string;
}

function generateDates(count = 21) {
  const today = startOfToday();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

const DAY_SHORTS = ["أح", "إث", "ث", "أر", "خ", "ج", "س"];

export default function BookingSection({ doctor, timeSlots, clinics, isLoggedIn, callbackUrl }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedSlotTurn, setSelectedSlotTurn] = useState<number | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string>(clinics[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookedData, setBookedData] = useState<{
    bookedTimeSlotIds: string[];
    bookedStartTimes: string[];
    bookedCounts?: Record<string, number>;
    occupiedTurnsBySlot?: Record<string, number[]>;
  } | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const dates = generateDates(21);
  const visibleDates = dates.slice(dateOffset, dateOffset + 7);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!selectedDate || !isLoggedIn) {
        setBookedData(null);
        return;
      }
      setSlotsLoading(true);
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      fetch(`/api/doctors/${doctor.id}/booked-slots?date=${dateStr}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          if (data.bookedTimeSlotIds !== undefined) {
            setBookedData({
              bookedTimeSlotIds: data.bookedTimeSlotIds ?? [],
              bookedStartTimes: data.bookedStartTimes ?? [],
              bookedCounts: data.bookedCounts ?? {},
              occupiedTurnsBySlot: data.occupiedTurnsBySlot ?? {},
            });
          } else {
            setBookedData(null);
          }
        })
        .catch(() => { if (!cancelled) setBookedData(null); })
        .finally(() => { if (!cancelled) setSlotsLoading(false); });
    });
    return () => { cancelled = true; };
  }, [selectedDate, doctor.id, isLoggedIn]);

  const clinicOptions = useMemo(
    () => clinics.map((c) => ({ value: c.id, label: `${c.name} — ${c.address}` })),
    [clinics]
  );

  /** نطاق وقت العمل لليوم المختار: من أول slot إلى آخره */
  const dayTimeRange = useMemo(() => {
    if (!selectedDate) return null;
    const dayNum = getDay(selectedDate);
    const slots = timeSlots
      .filter(
        (s) =>
          s.dayOfWeek === dayNum &&
          (!selectedClinic || !s.clinicId || s.clinicId === selectedClinic)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (slots.length === 0) return null;
    return { from: slots[0].startTime, to: slots[slots.length - 1].endTime };
  }, [selectedDate, selectedClinic, timeSlots]);

  /**
   * قائمة موحدة بجميع الأدوار لهذا اليوم مرتبة تسلسلياً من 1 إلى N
   * الترقيم مستمر عبر كل الـ time slots دون إعادة بدء
   * available = لم يُحجز بعد
   */
  const allDayTurns = useMemo(() => {
    if (!selectedDate) return [] as { slot: TimeSlot; localTurn: number; globalTurn: number; available: boolean }[];
    const dayNum = getDay(selectedDate);
    const sorted = [...timeSlots]
      .filter(
        (s) =>
          s.dayOfWeek === dayNum &&
          (!selectedClinic || !s.clinicId || s.clinicId === selectedClinic)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (sorted.length === 0) return [];

    const occupiedMap = bookedData?.occupiedTurnsBySlot ?? {};
    const result: { slot: TimeSlot; localTurn: number; globalTurn: number; available: boolean }[] = [];
    let g = 0;
    for (const slot of sorted) {
      const cap = Math.min(100, Math.max(1, slot.slotCapacity ?? 1));
      const taken = new Set(occupiedMap[slot.id] ?? []);
      for (let t = 1; t <= cap; t++) {
        g++;
        result.push({ slot, localTurn: t, globalTurn: g, available: !taken.has(t) });
      }
    }
    return result;
  }, [selectedDate, selectedClinic, timeSlots, bookedData]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSelectedSlotTurn(null);
  };

  const handleSlotSelect = (slot: TimeSlot, localTurn: number) => {
    setSelectedSlot(slot);
    setSelectedSlotTurn(localTurn);
  };

  const handleBooking = async () => {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!selectedDate || !selectedSlot || selectedSlotTurn == null) {
      toast.error("يرجى اختيار التاريخ والدور");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          clinicId: selectedClinic || null,
          timeSlotId: selectedSlot.id,
          appointmentDate: selectedDate.toISOString(),
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          notes,
          fee: doctor.consultationFee,
          slotTurn: selectedSlotTurn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حدث خطأ في الحجز");
      } else {
        toast.success(
          typeof data.message === "string"
            ? data.message
            : "تم إرسال طلب الحجز، وبانتظار موافقة الطبيب."
        );
        router.push(`/appointments/${data.appointmentId}/success`);
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  };

  const loginHref = callbackUrl
    ? `/login/patient?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login/patient";

  /* ---- Date grid (shared between logged-in and guest) ---- */
  const DateGrid = ({ disabled }: { disabled?: boolean }) => (
    <div className={disabled ? "opacity-50 pointer-events-none select-none" : ""}>
      <div className="flex items-center justify-between mb-3 px-5 pt-5">
        <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm">اختر التاريخ</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
            disabled={dateOffset === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <IconArrowForward className="h-4 w-4 text-gray-500 dark:text-slate-400" />
          </button>
          <button type="button" onClick={() => setDateOffset(dateOffset + 7)}
            disabled={dateOffset + 7 >= 21}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <IconArrowLeft className="h-4 w-4 text-gray-500 dark:text-slate-400" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 px-4 pb-4">
        {visibleDates.map((date) => {
          const daySlots = timeSlots.filter(
            (s) => s.dayOfWeek === getDay(date) && (!selectedClinic || !s.clinicId || s.clinicId === selectedClinic)
          );
          const hasSlots = daySlots.length > 0;
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          return (
            <button type="button" key={date.toISOString()}
              onClick={() => hasSlots && handleDateSelect(date)}
              disabled={!hasSlots}
              className={`flex flex-col items-center py-3 px-1 rounded-2xl text-xs transition-all ${
                isSelected
                  ? "bg-blue-600 text-white shadow-md shadow-blue-300"
                  : hasSlots
                    ? "bg-gray-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-700 dark:text-slate-300 hover:text-blue-600"
                    : "bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              <span className="font-medium text-[9px] uppercase">{DAY_SHORTS[getDay(date)]}</span>
              <span className={`font-extrabold text-base mt-0.5 ${isSelected ? "text-white" : hasSlots ? "text-gray-900 dark:text-slate-100" : "text-gray-300 dark:text-slate-600"}`}>
                {format(date, "d")}
              </span>
              {hasSlots && !isSelected && <span className="w-1 h-1 rounded-full bg-blue-400 mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div>
        <DateGrid disabled />
        <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-5 text-center">
          <div className="text-3xl mb-2">🔐</div>
          <h4 className="font-bold text-gray-900 dark:text-slate-100 mb-1">سجّل الدخول للحجز</h4>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">يجب تسجيل الدخول أولاً لحجز موعد</p>
          <Link href={loginHref}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors text-sm">
            <IconLogin className="h-4 w-4" />
            تسجيل دخول المرضى
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Clinic selector */}
      {clinics.length > 1 && (
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <label className="block text-sm font-bold text-gray-800 mb-2">اختر العيادة</label>
          <DropdownSelect
            value={selectedClinic}
            onChange={(v) => { setSelectedClinic(v); setSelectedDate(null); setSelectedSlot(null); setSelectedSlotTurn(null); }}
            options={clinicOptions}
            placeholder="اختر العيادة"
            buttonClassName="h-10 border-gray-200 rounded-xl"
          />
        </div>
      )}
      {clinics.length === 1 && (
        <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-50">
          <IconMapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-xs text-gray-600">{clinics[0].name} — {clinics[0].address}</span>
        </div>
      )}

      {/* Date picker */}
      <DateGrid />

      {/* Divider */}
      <div className="border-t border-gray-100 mx-4" />

      {/* Turns */}
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm">
              {selectedDate ? `اختر الدور — ${format(selectedDate, "d/M")}` : "اختر الدور"}
            </h3>
            {dayTimeRange && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                <IconClock className="h-3 w-3 shrink-0" />
                من {dayTimeRange.from} إلى {dayTimeRange.to}
              </p>
            )}
          </div>
          {allDayTurns.length > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0 mt-0.5">
              {allDayTurns.filter((t) => t.available).length} متاح
            </span>
          )}
        </div>

        {!selectedDate ? (
          <div className="text-center py-8 text-gray-400 dark:text-slate-500">
            <IconCalendar className="h-9 w-9 mx-auto mb-2 opacity-30" />
            <p className="text-sm">اختر تاريخاً أولاً</p>
          </div>
        ) : slotsLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
            <IconLoader className="h-5 w-5 animate-spin" />
            <span className="text-sm">جاري التحميل...</span>
          </div>
        ) : allDayTurns.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-slate-500">
            <p className="text-sm">لا توجد أدوار متاحة في هذا اليوم</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {allDayTurns.map(({ slot, localTurn, globalTurn, available }) => {
              const isSelected = selectedSlot?.id === slot.id && selectedSlotTurn === localTurn;
              return (
                <button
                  key={globalTurn}
                  type="button"
                  disabled={!available}
                  onClick={() => available && handleSlotSelect(slot, localTurn)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : available
                        ? "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400"
                        : "bg-gray-50 dark:bg-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed line-through"
                  }`}
                >
                  {globalTurn}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {selectedSlot && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-2">ملاحظات (اختياري)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب أعراضك أو أي ملاحظات..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
          />
        </div>
      )}

      {/* Summary */}
      {selectedDate && selectedSlot && selectedSlotTurn != null && (
        <div className="mx-5 mb-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 border border-blue-100 dark:border-blue-800">
          <div className="flex flex-wrap gap-3 text-xs text-blue-800 dark:text-blue-300">
            <span className="flex items-center gap-1">
              <IconCalendar className="h-3 w-3" />
              {format(selectedDate, "d/M/yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <IconClock className="h-3 w-3" />
              {selectedSlot.startTime} — {selectedSlot.endTime}
            </span>
            <span className="flex items-center gap-1 font-bold">
              دور {allDayTurns.find((t) => t.slot.id === selectedSlot.id && t.localTurn === selectedSlotTurn)?.globalTurn ?? selectedSlotTurn}
            </span>
            <span className="flex items-center gap-1 font-bold text-blue-900 dark:text-blue-200">
              <IconCreditCard className="h-3 w-3" />₪{doctor.consultationFee}
            </span>
          </div>
        </div>
      )}

      {/* Book Button */}
      <div className="px-5 pb-5">
        <button onClick={handleBooking}
          disabled={!selectedDate || !selectedSlot || selectedSlotTurn == null || loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-base hover:bg-blue-700 active:scale-[.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
        >
          {loading ? (
            <><IconLoader className="h-5 w-5 animate-spin" /> جاري إرسال الطلب...</>
          ) : (
            "إرسال طلب الحجز"
          )}
        </button>
      </div>
    </div>
  );
}
