"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, CreditCard, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DAYS_AR, formatCurrency } from "@/lib/utils";
import { format, addDays, startOfToday, getDay } from "date-fns";

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
}

function generateDates(count = 14) {
  const today = startOfToday();
  return Array.from({ length: count }, (_, i) => addDays(today, i));
}

export default function BookingSection({ doctor, timeSlots, clinics, isLoggedIn }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<string>(clinics[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"date" | "slot" | "confirm">("date");
  const [dateOffset, setDateOffset] = useState(0);

  const dates = generateDates(21);
  const visibleDates = dates.slice(dateOffset, dateOffset + 7);

  const availableSlotsForDate = selectedDate
    ? timeSlots.filter((slot) => slot.dayOfWeek === getDay(selectedDate))
    : [];

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("slot");
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleBooking = async () => {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast.error("يرجى اختيار التاريخ والوقت");
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "حدث خطأ في الحجز");
      } else {
        toast.success("تم تأكيد الموعد. الدفع عند الوصول للعيادة.");
        router.push(`/appointments/${data.appointmentId}/success`);
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky top-20 space-y-4">
      <Card className="border-2 border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            احجز موعدك
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              اختر التاريخ
            </label>
            <div className="flex items-center gap-1 mb-2">
              <button
                onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
                disabled={dateOffset === 0}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {visibleDates.map((date) => {
                  const daySlots = timeSlots.filter((s) => s.dayOfWeek === getDay(date));
                  const hasSlots = daySlots.length > 0;
                  const isSelected =
                    selectedDate?.toDateString() === date.toDateString();

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => hasSlots && handleDateSelect(date)}
                      disabled={!hasSlots}
                      className={`flex flex-col items-center py-2 rounded-lg text-xs transition-all ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : hasSlots
                            ? "hover:bg-blue-50 text-gray-700 border border-gray-200"
                            : "text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      <span className="font-medium">
                        {["أح", "إث", "ث", "أر", "خ", "ج", "س"][getDay(date)]}
                      </span>
                      <span className={`mt-0.5 font-bold ${isSelected ? "" : "text-gray-900"}`}>
                        {format(date, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setDateOffset(dateOffset + 7)}
                disabled={dateOffset + 7 >= 21}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الأوقات المتاحة ليوم {format(selectedDate, "EEEE d/M", { locale: undefined })}
              </label>
              {availableSlotsForDate.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-3 bg-gray-50 rounded-lg">
                  لا توجد مواعيد متاحة
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableSlotsForDate.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                        selectedSlot?.id === slot.id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      {slot.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clinic Select */}
          {clinics.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العيادة
              </label>
              <select
                value={selectedClinic}
                onChange={(e) => setSelectedClinic(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name} - {clinic.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          {selectedSlot && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب أعراضك أو أي ملاحظات..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {/* Summary */}
          {selectedDate && selectedSlot && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-blue-800 text-sm">ملخص الحجز</h4>
              <div className="space-y-1.5 text-xs text-blue-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(selectedDate, "d/M/yyyy")} - {DAYS_AR[getDay(selectedDate)]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{selectedSlot.startTime} - {selectedSlot.endTime}</span>
                </div>
                {selectedClinic && clinics.find((c) => c.id === selectedClinic) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{clinics.find((c) => c.id === selectedClinic)?.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="font-bold">₪{doctor.consultationFee}</span>
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          <Button
            onClick={handleBooking}
            className="w-full"
            size="lg"
            disabled={!selectedDate || !selectedSlot || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : !isLoggedIn ? (
              "سجّل دخولك للحجز"
            ) : !selectedDate ? (
              "اختر التاريخ أولاً"
            ) : !selectedSlot ? (
              "اختر الوقت المناسب"
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                تأكيد الحجز والدفع
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-green-50 border-green-100">
        <CardContent className="p-4">
          <h4 className="font-semibold text-green-800 text-sm mb-2">✅ سياسة الحجز</h4>
          <ul className="text-xs text-green-700 space-y-1">
            <li>• الدفع الإلكتروني مطلوب لتأكيد الموعد</li>
            <li>• يمكن الإلغاء قبل 24 ساعة</li>
            <li>• ستصلك تأكيدات عبر البريد الإلكتروني</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
