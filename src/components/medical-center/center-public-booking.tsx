"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  Stethoscope,
  LogIn,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, startOfToday, getDay } from "date-fns";

export type CenterDoctorSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicId: string | null;
  /** سعة الدور (افتراضي 1 إن لم تُحمَّل من قاعدة البيانات) */
  slotCapacity?: number;
};

export type CenterDoctorPublic = {
  id: string;
  consultationFee: number;
  /** استشارة طبية أو كشفية — يظهر بجانب السعر */
  feeServiceType: "CONSULTATION" | "EXAMINATION";
  name: string;
  specialtyAr: string;
  slots: CenterDoctorSlot[];
};

type Props = {
  centerId: string;
  doctors: CenterDoctorPublic[];
  /** تخصصات اختيارية لتصفية قائمة الأطباء */
  specialtyOptions: string[];
  isLoggedIn: boolean;
  isPatient: boolean;
};

function feeServiceLabel(t: "CONSULTATION" | "EXAMINATION"): string {
  return t === "EXAMINATION" ? "كشفية" : "استشارة طبية";
}

function generateDates(count = 21) {
  const today = startOfToday();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

export default function CenterPublicBooking({
  centerId,
  doctors,
  specialtyOptions,
  isLoggedIn,
  isPatient,
}: Props) {
  const router = useRouter();
  /** null = كل التخصصات */
  const [specialtyFilter, setSpecialtyFilter] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotTurn, setSelectedSlotTurn] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookedData, setBookedData] = useState<{
    bookedTimeSlotIds: string[];
    bookedCounts?: Record<string, number>;
    occupiedTurnsBySlot?: Record<string, number[]>;
  } | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) ?? null;

  const filteredDoctors = useMemo(() => {
    if (!specialtyFilter) return doctors;
    return doctors.filter((d) => d.specialtyAr === specialtyFilter);
  }, [doctors, specialtyFilter]);

  useEffect(() => {
    if (!selectedDoctorId || !specialtyFilter) return;
    const stillVisible = filteredDoctors.some((d) => d.id === selectedDoctorId);
    if (!stillVisible) {
      setSelectedDoctorId(null);
      setSelectedDate(null);
      setSelectedSlotId(null);
      setSelectedSlotTurn(null);
      setNotes("");
    }
  }, [specialtyFilter, filteredDoctors, selectedDoctorId]);

  const dates = generateDates(21);
  const visibleDates = dates.slice(dateOffset, dateOffset + 7);

  useEffect(() => {
    if (!selectedDoctorId || !selectedDate || !isLoggedIn || !isPatient) {
      setBookedData(null);
      return;
    }
    setSlotsLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/doctors/${selectedDoctorId}/booked-slots?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookedTimeSlotIds !== undefined) {
          setBookedData({
            bookedTimeSlotIds: data.bookedTimeSlotIds ?? [],
            bookedCounts: data.bookedCounts ?? {},
            occupiedTurnsBySlot: data.occupiedTurnsBySlot ?? {},
          });
        } else setBookedData(null);
      })
      .catch(() => setBookedData(null))
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctorId, selectedDate, isLoggedIn, isPatient]);

  const availableWithTurn = useMemo(() => {
    if (!selectedDoctor || !selectedDate) return [] as { slot: CenterDoctorSlot; turnNumber: number }[];
    const dayNum = getDay(selectedDate);
    const sorted = [...selectedDoctor.slots]
      .filter((s) => s.dayOfWeek === dayNum)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (sorted.length === 0) return [];

    const occupiedMap = bookedData?.occupiedTurnsBySlot ?? {};
    const out: { slot: CenterDoctorSlot; turnNumber: number }[] = [];
    for (const slot of sorted) {
      const cap = Math.min(100, Math.max(1, slot.slotCapacity ?? 1));
      const taken = new Set(occupiedMap[slot.id] ?? []);
      for (let turn = 1; turn <= cap; turn++) {
        if (!taken.has(turn)) {
          out.push({ slot, turnNumber: turn });
        }
      }
    }
    return out;
  }, [selectedDoctor, selectedDate, bookedData]);

  const turnsByTimeSlot = useMemo(() => {
    const map = new Map<string, { slot: CenterDoctorSlot; turns: number[] }>();
    for (const { slot, turnNumber } of availableWithTurn) {
      if (!map.has(slot.id)) {
        map.set(slot.id, { slot, turns: [] });
      }
      map.get(slot.id)!.turns.push(turnNumber);
    }
    return Array.from(map.values());
  }, [availableWithTurn]);

  const selectedSlot = useMemo(() => {
    if (!selectedSlotId || selectedSlotTurn == null) return null;
    return selectedDoctor?.slots.find((s) => s.id === selectedSlotId) ?? null;
  }, [selectedDoctor, selectedSlotId, selectedSlotTurn]);

  const handlePickDoctor = (id: string) => {
    setSelectedDoctorId(id);
    setSelectedDate(null);
    setSelectedSlotId(null);
    setSelectedSlotTurn(null);
    setNotes("");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotId(null);
    setSelectedSlotTurn(null);
  };

  const loginHref = `/login/patient?callbackUrl=${encodeURIComponent(`/medical-centers/${centerId}`)}`;

  const handleBooking = async () => {
    if (!isLoggedIn || !isPatient) {
      router.push(loginHref);
      return;
    }
    if (!selectedDoctor || !selectedDate || !selectedSlot || selectedSlotTurn == null) {
      toast.error("اختر الطبيب والتاريخ والدور");
      return;
    }
   const clinicId = selectedSlot.clinicId || null;
    setLoading(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          clinicId,
          timeSlotId: selectedSlot.id,
          appointmentDate: selectedDate.toISOString(),
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          notes,
          fee: selectedDoctor.consultationFee,
          slotTurn: selectedSlotTurn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حدث خطأ في الحجز");
        return;
      }
      toast.success("تم تأكيد الموعد");
      router.push(`/appointments/${data.appointmentId}/success`);
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (doctors.length === 0) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          أطباء المركز
        </h2>

        {specialtyOptions.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              تصفية حسب التخصص <span className="text-gray-400 font-normal">(اختياري)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSpecialtyFilter(null)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  specialtyFilter === null
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-blue-300"
                }`}
              >
                الكل
              </button>
              {specialtyOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecialtyFilter(s)}
                  className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                    specialtyFilter === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:border-blue-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredDoctors.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400 py-6 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-600">
            لا يوجد أطباء بهذا التخصص. اختر «الكل» أو تخصصاً آخر.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map((d) => {
              const active = selectedDoctorId === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handlePickDoctor(d.id)}
                  className={`text-right rounded-xl border p-4 transition-all hover:shadow-md ${
                    active
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 bg-blue-50/50 dark:bg-slate-800"
                      : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800/60 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {d.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">د. {d.name}</div>
                      <Badge variant="secondary" className="mt-1">
                        {d.specialtyAr}
                      </Badge>
                      <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-3 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>₪{d.consultationFee}</span>
                        <span className="text-xs font-normal text-gray-600 dark:text-slate-400">
                          · {feeServiceLabel(d.feeServiceType)}
                        </span>
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDoctor && (
        <Card className="border-blue-100 dark:border-slate-600 dark:bg-slate-800/80">
          <CardContent className="p-4 sm:p-6 space-y-5">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              حجز مع د. {selectedDoctor.name}
            </h3>

            {!isLoggedIn && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-900 dark:text-amber-100">
                <p className="mb-3">سجّل دخولك كمريض لإكمال الحجز.</p>
                <Button asChild size="sm" className="gap-2">
                  <Link href={loginHref}>
                    <LogIn className="h-4 w-4" />
                    تسجيل دخول المرضى
                  </Link>
                </Button>
              </div>
            )}

            {isLoggedIn && !isPatient && (
              <p className="text-sm text-gray-600 dark:text-slate-400">
                لتتمكن من الحجز، استخدم حساب مريض أو{" "}
                <Link href="/register/patient" className="text-blue-600 hover:underline">
                  أنشئ حساب مريض
                </Link>
                .
              </p>
            )}

            {isLoggedIn && isPatient && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">اختر التاريخ</label>
                  <div className="flex items-center gap-0.5 sm:gap-1 mb-2">
                    <button
                      type="button"
                      onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
                      disabled={dateOffset === 0}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="flex-1 grid grid-cols-7 gap-0.5 sm:gap-1 min-w-0">
                      {visibleDates.map((date) => {
                        const daySlots = selectedDoctor.slots.filter((s) => s.dayOfWeek === getDay(date));
                        const hasSlots = daySlots.length > 0;
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        return (
                          <button
                            type="button"
                            key={date.toISOString()}
                            onClick={() => hasSlots && handleDateSelect(date)}
                            disabled={!hasSlots}
                            className={`flex flex-col items-center py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs transition-all ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : hasSlots
                                  ? "hover:bg-blue-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600"
                                  : "text-gray-300 dark:text-slate-600 cursor-not-allowed"
                            }`}
                          >
                            <span className="font-medium">
                              {["أح", "إث", "ث", "أر", "خ", "ج", "س"][getDay(date)]}
                            </span>
                            <span className={`mt-0.5 font-bold ${isSelected ? "" : "text-gray-900 dark:text-white"}`}>
                              {format(date, "d")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDateOffset(dateOffset + 7)}
                      disabled={dateOffset + 7 >= 21}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                      الأدوار المتاحة
                    </label>
                    {slotsLoading ? (
                      <p className="text-sm text-gray-500 flex items-center justify-center gap-2 py-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري التحميل...
                      </p>
                    ) : availableWithTurn.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                        لا توجد أدوار متاحة لهذا اليوم
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {turnsByTimeSlot.map(({ slot, turns }) => (
                          <div key={slot.id}>
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 mb-2">
                              من الساعة {slot.startTime} إلى الساعة {slot.endTime}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {turns.map((turnNumber) => (
                                <button
                                  key={`${slot.id}-${turnNumber}`}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSlotId(slot.id);
                                    setSelectedSlotTurn(turnNumber);
                                  }}
                                  className={`flex items-center justify-center py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                                    selectedSlotId === slot.id && selectedSlotTurn === turnNumber
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-blue-300"
                                  }`}
                                >
                                  دور {turnNumber}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">ملاحظات (اختياري)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 dark:border-slate-600 dark:bg-slate-900 rounded-lg p-3 text-sm"
                    />
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  disabled={!selectedDate || !selectedSlot || selectedSlotTurn == null || loading}
                  onClick={handleBooking}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التأكيد...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      تأكيد الحجز
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
