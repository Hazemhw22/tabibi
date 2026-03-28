"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconClock from "@/components/icon/icon-clock";
import IconCreditCard from "@/components/icon/icon-credit-card";
import IconLoader from "@/components/icon/icon-loader";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconLogin from "@/components/icon/icon-login";
import { toast } from "sonner";
import { format, addDays, startOfToday, getDay } from "date-fns";

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicId: string | null;
  slotCapacity?: number;
};

type Doctor = {
  id: string;
  consultationFee: number;
  feeServiceType: "CONSULTATION" | "EXAMINATION";
  name: string;
  specialtyAr: string;
  slots: Slot[];
};

interface Props {
  centerId: string;
  doctor: Doctor;
  isLoggedIn: boolean;
  isPatient: boolean;
}

function generateDates(count = 21) {
  const today = startOfToday();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

const DAY_SHORTS = ["أح", "إث", "ث", "أر", "خ", "ج", "س"];

export default function CenterDoctorBooking({ centerId, doctor, isLoggedIn, isPatient }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotTurn, setSelectedSlotTurn] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookedData, setBookedData] = useState<{
    occupiedTurnsBySlot?: Record<string, number[]>;
  } | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const dates = generateDates(21);
  const visibleDates = dates.slice(dateOffset, dateOffset + 7);

  useEffect(() => {
    if (!selectedDate || !isLoggedIn || !isPatient) {
      setBookedData(null);
      return;
    }
    setSlotsLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/doctors/${doctor.id}/booked-slots?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        setBookedData({ occupiedTurnsBySlot: data.occupiedTurnsBySlot ?? {} });
      })
      .catch(() => setBookedData(null))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, doctor.id, isLoggedIn, isPatient]);

  const availableWithTurn = useMemo(() => {
    if (!selectedDate) return [] as { slot: Slot; turnNumber: number }[];
    const dayNum = getDay(selectedDate);
    const sorted = [...doctor.slots]
      .filter((s) => s.dayOfWeek === dayNum)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (sorted.length === 0) return [];
    const occupiedMap = bookedData?.occupiedTurnsBySlot ?? {};
    const out: { slot: Slot; turnNumber: number }[] = [];
    for (const slot of sorted) {
      const cap = Math.min(100, Math.max(1, slot.slotCapacity ?? 1));
      const taken = new Set(occupiedMap[slot.id] ?? []);
      for (let turn = 1; turn <= cap; turn++) {
        if (!taken.has(turn)) out.push({ slot, turnNumber: turn });
      }
    }
    return out;
  }, [selectedDate, doctor.slots, bookedData]);

  const turnsByTimeSlot = useMemo(() => {
    const map = new Map<string, { slot: Slot; turns: number[] }>();
    for (const { slot, turnNumber } of availableWithTurn) {
      if (!map.has(slot.id)) map.set(slot.id, { slot, turns: [] });
      map.get(slot.id)!.turns.push(turnNumber);
    }
    return Array.from(map.values());
  }, [availableWithTurn]);

  const selectedSlot = useMemo(
    () => doctor.slots.find((s) => s.id === selectedSlotId) ?? null,
    [doctor.slots, selectedSlotId]
  );

  const loginHref = `/login/patient?callbackUrl=${encodeURIComponent(`/medical-centers/${centerId}/doctors/${doctor.id}`)}`;

  const handleBooking = async () => {
    if (!isLoggedIn || !isPatient) {
      router.push(loginHref);
      return;
    }
    if (!selectedDate || !selectedSlot || selectedSlotTurn == null) {
      toast.error("اختر التاريخ والدور");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          clinicId: selectedSlot.clinicId || null,
          timeSlotId: selectedSlot.id,
          appointmentDate: selectedDate.toISOString(),
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          notes,
          fee: doctor.consultationFee,
          slotTurn: selectedSlotTurn,
          viaMedicalCenter: true,
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

  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 opacity-50 pointer-events-none select-none">
          {visibleDates.map((date) => (
            <div key={date.toISOString()} className="flex flex-col items-center py-2.5 rounded-xl bg-gray-100 text-xs">
              <span className="text-gray-500 font-medium text-[10px]">{DAY_SHORTS[getDay(date)]}</span>
              <span className="font-bold text-gray-700 mt-0.5 text-sm">{format(date, "d")}</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 text-center">
          <div className="text-3xl mb-2">🔐</div>
          <h4 className="font-bold text-blue-900 mb-1.5">سجّل الدخول للحجز</h4>
          <p className="text-blue-700 text-sm mb-4">يجب تسجيل الدخول أولاً لحجز موعد</p>
          <Link
            href={loginHref}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <IconLogin className="h-4 w-4" />
            تسجيل دخول المرضى
          </Link>
        </div>
      </div>
    );
  }

  if (!isPatient) {
    return (
      <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
        لتتمكن من الحجز، استخدم حساب مريض أو{" "}
        <Link href="/register/patient" className="text-blue-600 font-medium">
          أنشئ حساب مريض
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Picker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-900 text-sm">اختر اليوم</h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
              disabled={dateOffset === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30"
            >
              <IconArrowForward className="h-4 w-4 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => setDateOffset(dateOffset + 7)}
              disabled={dateOffset + 7 >= 21}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-30"
            >
              <IconArrowLeft className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {visibleDates.map((date) => {
            const hasSlots = doctor.slots.some((s) => s.dayOfWeek === getDay(date));
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            return (
              <button
                type="button"
                key={date.toISOString()}
                onClick={() => {
                  if (!hasSlots) return;
                  setSelectedDate(date);
                  setSelectedSlotId(null);
                  setSelectedSlotTurn(null);
                }}
                disabled={!hasSlots}
                className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-xs transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : hasSlots
                      ? "hover:bg-blue-50 text-gray-700 bg-gray-50 border border-gray-100"
                      : "text-gray-300 cursor-not-allowed bg-gray-50"
                }`}
              >
                <span className="font-medium text-[10px]">{DAY_SHORTS[getDay(date)]}</span>
                <span className={`font-bold mt-0.5 text-sm ${isSelected ? "text-white" : hasSlots ? "text-gray-900" : "text-gray-300"}`}>
                  {format(date, "d")}
                </span>
                {hasSlots && !isSelected && <span className="w-1 h-1 rounded-full bg-blue-400 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Turns */}
      <div>
        <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
          <IconClock className="h-4 w-4 text-blue-600" />
          {selectedDate ? `اختر الدور — ${format(selectedDate, "d/M")}` : "اختر الدور"}
        </h4>
        {!selectedDate ? (
          <div className="text-center py-5 text-gray-400 bg-gray-50 rounded-xl">
            <IconCalendar className="h-7 w-7 mx-auto mb-1.5 opacity-40" />
            <p className="text-sm">اختر يوماً أولاً</p>
          </div>
        ) : slotsLoading ? (
          <div className="flex items-center justify-center gap-2 py-5 text-gray-500">
            <IconLoader className="h-4 w-4 animate-spin" />
            <span className="text-sm">جاري التحميل...</span>
          </div>
        ) : availableWithTurn.length === 0 ? (
          <div className="text-center py-5 text-gray-400 bg-gray-50 rounded-xl">
            <p className="text-sm">لا توجد أدوار متاحة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {turnsByTimeSlot.map(({ slot, turns }) => (
              <div key={slot.id}>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                  <IconClock className="h-3 w-3" />
                  {slot.startTime} — {slot.endTime}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {turns.map((turnNumber) => (
                    <button
                      key={`${slot.id}-${turnNumber}`}
                      type="button"
                      onClick={() => {
                        setSelectedSlotId(slot.id);
                        setSelectedSlotTurn(turnNumber);
                      }}
                      className={`flex flex-col items-center py-3 rounded-xl border text-xs font-medium transition-all ${
                        selectedSlotId === slot.id && selectedSlotTurn === turnNumber
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                          : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 bg-gray-50"
                      }`}
                    >
                      <span className="font-bold text-sm">{turnNumber}</span>
                      <span className="text-[10px] mt-0.5 opacity-70">دور</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {selectedSlot && (
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">ملاحظات (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب أعراضك أو أي ملاحظات..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
          />
        </div>
      )}

      {/* Summary */}
      {selectedDate && selectedSlot && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-xs text-blue-800 space-y-1.5">
          <p className="font-bold text-blue-900 text-sm mb-2">ملخص الحجز</p>
          <p>📅 {format(selectedDate, "d/M/yyyy")}</p>
          <p>⏰ {selectedSlot.startTime} — {selectedSlot.endTime}</p>
          {selectedSlotTurn && <p>🔢 دور {selectedSlotTurn}</p>}
          <p className="font-bold text-base text-blue-900">₪{doctor.consultationFee}
            <span className="text-xs font-normal text-blue-600 mr-1">يُدفع في المركز</span>
          </p>
        </div>
      )}

      {/* Book Button */}
      <button
        onClick={handleBooking}
        disabled={!selectedDate || !selectedSlot || selectedSlotTurn == null || loading}
        className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <IconLoader className="h-5 w-5 animate-spin" />
            جاري إرسال الطلب...
          </>
        ) : !selectedDate ? (
          "اختر اليوم أولاً"
        ) : !selectedSlot ? (
          "اختر الدور المناسب"
        ) : (
          <>
            <IconCreditCard className="h-5 w-5" />
            إرسال طلب الحجز
          </>
        )}
      </button>
    </div>
  );
}
