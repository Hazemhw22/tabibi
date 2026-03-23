"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import IconHeart from "@/components/icon/icon-heart";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconLink from "@/components/icon/icon-link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import LoadingScreen from "@/components/ui/loading-screen";
import { DAYS_AR } from "@/lib/utils";

const DAY_OPTIONS = DAYS_AR.map((d, idx) => ({ value: String(idx), label: d }));

type Specialty = { id: string; nameAr: string };

type SlotRow = { dayOfWeek: number; startTime: string; endTime: string; slotCapacity: number };

type Doc = {
  id: string;
  consultationFee?: number;
  doctorClinicFee?: number;
  patientFeeServiceType?: string | null;
  user?: { name?: string; phone?: string; email?: string };
  specialty?: { id?: string; nameAr?: string };
  clinics?: { id: string; name?: string; isMain?: boolean }[];
  timeSlots?: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    clinicId?: string | null;
    slotCapacity?: number;
  }[];
};

export default function CenterDoctorDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [doctor, setDoctor] = useState<Doc | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [consultationFee, setConsultationFee] = useState("");
  const [doctorClinicFee, setDoctorClinicFee] = useState("");
  const [patientFeeServiceType, setPatientFeeServiceType] = useState<"CONSULTATION" | "EXAMINATION">(
    "CONSULTATION"
  );
  const [specialtyId, setSpecialtyId] = useState("");
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSpecialties(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/medical-center/doctors/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          toast.error(j.error);
          setDoctor(null);
        } else {
          const d = j.doctor as Doc;
          setDoctor(d);
          setConsultationFee(String(d.consultationFee ?? 0));
          setDoctorClinicFee(String(d.doctorClinicFee ?? 0));
          setSpecialtyId(d.specialty?.id ?? "");
          const mainClinic = (d.clinics ?? []).find((c) => c.isMain) ?? (d.clinics ?? [])[0];
          const centerSlots = (d.timeSlots ?? []).filter(
            (s) => !s.clinicId || (mainClinic?.id && s.clinicId === mainClinic.id)
          );
          setSlots(
            centerSlots.length
              ? centerSlots.map((s) => ({
                  dayOfWeek: s.dayOfWeek,
                  startTime: s.startTime.slice(0, 5),
                  endTime: s.endTime.slice(0, 5),
                  slotCapacity: s.slotCapacity ?? 1,
                }))
              : [{ dayOfWeek: 0, startTime: "09:00", endTime: "15:00", slotCapacity: 1 }]
          );
        }
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  }, [id]);

  const specialtyOptions = specialties.map((s) => ({ value: s.id, label: s.nameAr }));

  const feeTypeOptions = [
    { value: "CONSULTATION", label: "استشارة طبية" },
    { value: "EXAMINATION", label: "كشفية" },
  ];

  const addSlot = () => {
    setSlots((s) => [...s, { dayOfWeek: 1, startTime: "09:00", endTime: "15:00", slotCapacity: 1 }]);
  };

  const removeSlot = (index: number) => {
    setSlots((s) => s.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, patch: Partial<SlotRow>) => {
    setSlots((s) => s.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(consultationFee);
    const docClinic = Number(doctorClinicFee);
    if (!specialtyId || Number.isNaN(fee) || fee < 0) {
      toast.error("تحقق من رسوم المريض للمركز والتخصص");
      return;
    }
    if (Number.isNaN(docClinic) || docClinic < 0) {
      toast.error("تحقق من مستحقات الطبيب من العيادة");
      return;
    }
    if (slots.length === 0) {
      toast.error("أضف يوم عمل واحداً على الأقل");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/medical-center/doctors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationFee: fee,
          doctorClinicFee: docClinic,
          specialtyId,
          patientFeeServiceType,
          timeSlots: slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime.length === 5 ? s.startTime : s.startTime.slice(0, 5),
            endTime: s.endTime.length === 5 ? s.endTime : s.endTime.slice(0, 5),
            slotCapacity: Math.min(50, Math.max(1, s.slotCapacity || 1)),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الحفظ");
        return;
      }
      toast.success(data.message || "تم الحفظ");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  if (!doctor) {
    return (
      <div className="p-8">
        <Link href="/dashboard/medical-center/doctors" className="text-blue-600 hover:underline">
          ← العودة للقائمة
        </Link>
        <p className="mt-4 text-gray-600">لم يُعثر على الطبيب.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <Link href="/dashboard/medical-center/doctors" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← أطباء المركز
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <IconHeart className="h-6 w-6 text-blue-600" />
        د. {doctor.user?.name ?? "—"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">{doctor.user?.email}</p>

      <div className="mb-6">
        <a
          href={`/doctors/${doctor.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          صفحة الحجز العامة للمريض
          <IconLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تعديل الرسوم والتخصص وأوقات العمل</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            الأوقات مرتبطة بعيادة المركز الرئيسية. <strong>عدد الأدوار</strong> = عدد المرضى المسموح بهم في
            نفس فترة الحجز. المريض يدفع للمركز؛ مستحقات الطبيب من العيادة تُسجَّل لحساب الطبيب.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="fee">رسوم المريض للمركز (₪)</Label>
              <p className="text-xs text-gray-500">ما يدفعه المريض للمركز عند الحجز.</p>
              <Input
                id="fee"
                type="number"
                min={0}
                step={1}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
              />
            </div>

            <div className="grid gap-2 w-full min-w-0">
              <Label>نوع الرسوم للمريض</Label>
              <p className="text-xs text-gray-500">يظهر بجانب السعر في صفحة المركز العامة.</p>
              <DropdownSelect
                value={patientFeeServiceType}
                onChange={(v) => setPatientFeeServiceType(v as "CONSULTATION" | "EXAMINATION")}
                options={feeTypeOptions}
                placeholder="اختر النوع"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="docClinicFee">مستحقات الطبيب من العيادة (₪)</Label>
              <p className="text-xs text-gray-500">ما يستحقه الطبيب من المركز (ليس من المريض مباشرة).</p>
              <Input
                id="docClinicFee"
                type="number"
                min={0}
                step={1}
                value={doctorClinicFee}
                onChange={(e) => setDoctorClinicFee(e.target.value)}
              />
            </div>

            <div className="grid gap-2 w-full min-w-0">
              <Label>التخصص</Label>
              <DropdownSelect
                value={specialtyId}
                onChange={setSpecialtyId}
                options={specialtyOptions}
                placeholder="اختر التخصص"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>أوقات العمل (عيادة المركز)</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addSlot}>
                  <IconPlus className="h-4 w-4" />
                  يوم آخر
                </Button>
              </div>
              {slots.map((row, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-3 bg-gray-50/80">
                  <div className="w-full min-w-0 space-y-1">
                    <Label className="text-xs">اليوم</Label>
                    <DropdownSelect
                      value={String(row.dayOfWeek)}
                      onChange={(v) => updateSlot(i, { dayOfWeek: Number(v) })}
                      options={DAY_OPTIONS}
                      placeholder="اختر اليوم"
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <Label className="text-xs">من</Label>
                      <Input
                        type="time"
                        className="mt-1 w-[130px]"
                        value={row.startTime}
                        onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">إلى</Label>
                      <Input
                        type="time"
                        className="mt-1 w-[130px]"
                        value={row.endTime}
                        onChange={(e) => updateSlot(i, { endTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">عدد الأدوار</Label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        className="mt-1 w-[88px]"
                        value={row.slotCapacity}
                        onChange={(e) =>
                          updateSlot(i, { slotCapacity: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-5 shrink-0 text-red-600"
                      onClick={() => removeSlot(i)}
                      disabled={slots.length <= 1}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
