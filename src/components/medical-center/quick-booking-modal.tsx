"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDay } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Dropdown, { type DropdownHandle } from "@/components/ui/dropdown";
import { DAYS_AR, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicId?: string | null;
  isActive?: boolean;
  slotCapacity?: number;
};

type Doc = {
  id: string;
  consultationFee?: number;
  /** مستحقات الطبيب من العيادة (للحسابات) */
  doctorClinicFee?: number;
  user?: { name?: string };
  specialty?: { nameAr?: string };
  timeSlots?: Slot[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
};

export default function QuickBookingModal({ open, onOpenChange, onBooked }: Props) {
  const [doctors, setDoctors] = useState<Doc[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [slotId, setSlotId] = useState("");
  const [fee, setFee] = useState("");
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState<{
    bookedTimeSlotIds: string[];
    bookedStartTimes: string[];
    bookedCounts?: Record<string, number>;
  } | null>(null);
  const [loadingBooked, setLoadingBooked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const docDdRef = useRef<DropdownHandle>(null);
  const slotDdRef = useRef<DropdownHandle>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/medical-center/doctors")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setDoctors(j.doctors ?? []);
      })
      .catch(() => toast.error("تعذر تحميل الأطباء"));
  }, [open]);

  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  useEffect(() => {
    if (selectedDoctor?.consultationFee != null) {
      setFee(String(selectedDoctor.consultationFee));
    }
  }, [selectedDoctor?.id, selectedDoctor?.consultationFee]);

  const daySlots = useMemo(() => {
    if (!dateStr || !selectedDoctor?.timeSlots?.length) return [];
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return [];
    const localDate = new Date(y, m - 1, d);
    const dayNum = getDay(localDate);
    return (selectedDoctor.timeSlots ?? []).filter(
      (s) => s.dayOfWeek === dayNum && s.isActive !== false
    );
  }, [dateStr, selectedDoctor]);

  useEffect(() => {
    setSlotId("");
    if (!dateStr || !doctorId) {
      setBooked(null);
      return;
    }
    setLoadingBooked(true);
    fetch(`/api/doctors/${doctorId}/booked-slots?date=${encodeURIComponent(dateStr)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bookedTimeSlotIds !== undefined) {
          setBooked({
            bookedTimeSlotIds: data.bookedTimeSlotIds ?? [],
            bookedStartTimes: data.bookedStartTimes ?? [],
            bookedCounts: data.bookedCounts ?? {},
          });
        } else setBooked(null);
      })
      .catch(() => setBooked(null))
      .finally(() => setLoadingBooked(false));
  }, [dateStr, doctorId]);

  const availableSlots = useMemo(() => {
    if (!daySlots.length) return [];
    const counts = booked?.bookedCounts ?? {};
    const sorted = [...daySlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    return sorted.filter((s) => {
      const cap = s.slotCapacity ?? 1;
      const used = counts[s.id] ?? 0;
      return used < cap;
    });
  }, [daySlots, booked]);

  const selectedSlot = availableSlots.find((s) => s.id === slotId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || patientPhone.replace(/\D/g, "").length < 9) {
      toast.error("أدخل اسم المريض ورقماً صحيحاً");
      return;
    }
    if (!doctorId || !dateStr || !slotId || !selectedSlot) {
      toast.error("اختر الطبيب والتاريخ والدور");
      return;
    }
    const feeNum = Number(fee);
    if (Number.isNaN(feeNum) || feeNum <= 0) {
      toast.error("أدخل سعراً صحيحاً");
      return;
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const appointmentDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();

    setSubmitting(true);
    try {
      const res = await fetch("/api/medical-center/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patientName.trim(),
          patientPhone,
          doctorId,
          appointmentDate,
          timeSlotId: slotId,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          fee: feeNum,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الحجز");
        return;
      }
      toast.success(data.message || "تم تسجيل الحجز");
      onBooked();
      onOpenChange(false);
      setPatientName("");
      setPatientPhone("");
      setDoctorId("");
      setDateStr("");
      setSlotId("");
      setNotes("");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة حجز سريع</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="qb-name">اسم المريض</Label>
            <Input id="qb-name" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qb-phone">الهاتف</Label>
            <Input id="qb-phone" dir="ltr" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} required />
          </div>

          <div className="grid gap-2">
            <Label>الطبيب</Label>
            <Dropdown
              ref={docDdRef}
              placement="bottom-start"
              btnClassName={cn(
                "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
              )}
              button={
                <span className="text-right w-full truncate">
                  {selectedDoctor
                    ? `د. ${selectedDoctor.user?.name ?? ""} — ${selectedDoctor.specialty?.nameAr ?? ""}`
                    : "اختر طبيباً"}
                </span>
              }
            >
              <div className="min-w-[300px] max-h-56 overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    className="block w-full px-3 py-2 text-right text-sm hover:bg-gray-100"
                    onClick={() => {
                      setDoctorId(doc.id);
                      docDdRef.current?.close();
                    }}
                  >
                    د. {doc.user?.name} — {doc.specialty?.nameAr}
                  </button>
                ))}
                {doctors.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">لا يوجد أطباء مرتبطون بالمركز</p>
                )}
              </div>
            </Dropdown>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qb-date">التاريخ</Label>
            <Input id="qb-date" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>الدور / الوقت المتاح</Label>
            <Dropdown
              ref={slotDdRef}
              placement="bottom-start"
              disabled={!dateStr || !doctorId || loadingBooked}
              btnClassName={cn(
                "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
                (!dateStr || !doctorId) && "opacity-60"
              )}
              button={
                <span className="text-right w-full">
                  {loadingBooked
                    ? "جاري التحقق..."
                    : selectedSlot
                      ? `الدور ${availableSlots.findIndex((s) => s.id === slotId) + 1} — ${selectedSlot.startTime} – ${selectedSlot.endTime} (${DAYS_AR[selectedSlot.dayOfWeek]})`
                      : "اختر الوقت"}
                </span>
              }
            >
              <div className="min-w-[300px] max-h-56 overflow-y-auto rounded-lg border bg-white py-1 shadow-lg">
                {availableSlots.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className="block w-full px-3 py-2 text-right text-sm hover:bg-gray-100"
                    onClick={() => {
                      setSlotId(s.id);
                      slotDdRef.current?.close();
                    }}
                  >
                    الدور {idx + 1} — {s.startTime} – {s.endTime}
                  </button>
                ))}
                {!loadingBooked && dateStr && doctorId && availableSlots.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    لا توجد أدوار متاحة لهذا اليوم أو كلها محجوزة.
                  </p>
                )}
              </div>
            </Dropdown>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qb-fee">المبلغ المدفوع للمركز (₪)</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              المريض يدفع للمركز. مستحقات الطبيب من العيادة لهذا الطبيب:{" "}
              <span className="font-semibold tabular-nums">
                ₪{formatNumber(selectedDoctor?.doctorClinicFee ?? 0, { maximumFractionDigits: 0 })}
              </span>{" "}
              (يُسجَّل تلقائياً في الحسابات).
            </p>
            <Input id="qb-fee" type="number" min={1} step={1} value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="qb-notes">ملاحظات (اختياري)</Label>
            <Input id="qb-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || doctors.length === 0}>
            {submitting ? "جاري الحفظ..." : "تأكيد الحجز"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
