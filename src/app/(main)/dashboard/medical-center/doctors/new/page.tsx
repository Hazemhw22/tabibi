"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stethoscope, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import LoadingScreen from "@/components/ui/loading-screen";
import { DAYS_AR } from "@/lib/utils";

type Specialty = { id: string; nameAr: string };

type SlotRow = { dayOfWeek: number; startTime: string; endTime: string; slotCapacity: number };

const DAY_OPTIONS = DAYS_AR.map((d, idx) => ({ value: String(idx), label: d }));

export default function NewCenterDoctorPage() {
  const router = useRouter();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [consultationFee, setConsultationFee] = useState("150");
  /** مستحقات الطبيب من العيادة (حساب الطبيب) */
  const [doctorClinicFee, setDoctorClinicFee] = useState("0");
  /** يظهر للمريض بجانب السعر في صفحة المركز */
  const [patientFeeServiceType, setPatientFeeServiceType] = useState<"CONSULTATION" | "EXAMINATION">(
    "CONSULTATION"
  );
  const [slots, setSlots] = useState<SlotRow[]>([
    { dayOfWeek: 0, startTime: "09:00", endTime: "15:00", slotCapacity: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [specsLoading, setSpecsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSpecialties(data);
      })
      .catch(() => toast.error("تعذر تحميل التخصصات"))
      .finally(() => setSpecsLoading(false));
  }, []);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(consultationFee);
    const docClinic = Number(doctorClinicFee);
    if (!specialtyId || !name.trim() || !email.trim() || password.length < 6) {
      toast.error("أكمل الحقول المطلوبة");
      return;
    }
    if (Number.isNaN(fee) || fee < 0) {
      toast.error("أدخل رسوماً صحيحة للمريض للمركز");
      return;
    }
    if (Number.isNaN(docClinic) || docClinic < 0) {
      toast.error("أدخل مستحقات الطبيب من العيادة بشكل صحيح");
      return;
    }
    if (slots.length === 0) {
      toast.error("أضف يوم عمل واحداً على الأقل");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/medical-center/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone,
          specialtyId,
          consultationFee: fee,
          doctorClinicFee: docClinic,
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
        toast.error(data.error || "فشل الإضافة");
        return;
      }
      toast.success(data.message || "تم إضافة الطبيب");
      router.push(`/dashboard/medical-center/doctors/${data.doctorId}`);
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (specsLoading) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <Link href="/dashboard/medical-center/doctors" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        ← أطباء المركز
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-blue-600" />
        إضافة طبيب للمركز
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الطبيب وأوقات العمل</CardTitle>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            يُنشأ تلقائياً سجل <strong>عيادة</strong> للطبيب مرتبطاً بمركزك، وتُربط أوقات العمل بهذه العيادة حتى
            يظهر الحجز للمرضى بشكل صحيح. حقل <strong>عدد الأدوار</strong> يحدّ كم مريضاً يمكنهم الحجز في نفس
            فترة الوقت (مثلاً 2 = دوران في نفس الساعة).
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني (لتسجيل الدخول)</Label>
              <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">الهاتف</Label>
              <Input id="phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} required />
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

            <div className="grid gap-2">
              <Label htmlFor="fee">رسوم المريض للمركز (₪)</Label>
              <p className="text-xs text-gray-500 leading-relaxed">
                المبلغ الذي يدفعه المريض للمركز عند الحجز (إيراد المركز المعروض للمريض).
              </p>
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
              <p className="text-xs text-gray-500 leading-relaxed">
                يظهر بجانب السعر في صفحة المركز العامة (استشارة طبية أو كشفية).
              </p>
              <DropdownSelect
                value={patientFeeServiceType}
                onChange={(v) => setPatientFeeServiceType(v as "CONSULTATION" | "EXAMINATION")}
                options={feeTypeOptions}
                placeholder="اختر النوع"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="docClinicFee">مستحقات الطبيب من العيادة (₪)</Label>
              <p className="text-xs text-gray-500 leading-relaxed">
                المبلغ الذي يستحقه الطبيب من المركز (ليس من المريض مباشرة) — يُسجَّل في حسابات الطبيب والحجوزات.
              </p>
              <Input
                id="docClinicFee"
                type="number"
                min={0}
                step={1}
                value={doctorClinicFee}
                onChange={(e) => setDoctorClinicFee(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>أوقات العمل (عيادة المركز)</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addSlot}>
                  <Plus className="h-4 w-4" />
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
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ وإضافة الطبيب"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
