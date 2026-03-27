"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import IconHeart from "@/components/icon/icon-heart";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconUser from "@/components/icon/icon-user";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import LoadingScreen from "@/components/ui/loading-screen";
import { DAYS_AR, cn } from "@/lib/utils";
import { CENTER_ROLE_ADMIN } from "@/lib/medical-center-roles";

type Specialty = { id: string; nameAr: string };

type SlotRow = { dayOfWeek: number; startTime: string; endTime: string; slotCapacity: number };

type PlatformDoctorMatch = { id: string; name: string; email: string; phone: string; specialtyAr: string };

const DAY_OPTIONS = DAYS_AR.map((d, idx) => ({ value: String(idx), label: d }));

function isPlausibleLookupEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 3 || !t.includes("@")) return false;
  const parts = t.split("@");
  if (parts.length !== 2) return false;
  return Boolean(parts[0]?.length && parts[1]?.length);
}

export default function NewCenterDoctorPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [consultationFee, setConsultationFee] = useState("150");
  const [doctorClinicFee, setDoctorClinicFee] = useState("0");
  const [patientFeeServiceType, setPatientFeeServiceType] = useState<"CONSULTATION" | "EXAMINATION">(
    "CONSULTATION"
  );
  const [slots, setSlots] = useState<SlotRow[]>([
    { dayOfWeek: 0, startTime: "09:00", endTime: "15:00", slotCapacity: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [specsLoading, setSpecsLoading] = useState(true);

  /** طبيب مسجّل في المنصة — طلب موافقة بدل إنشاء حساب (البحث بالبريد) */
  const [lookupEmail, setLookupEmail] = useState("");
  const [linkedDoctor, setLinkedDoctor] = useState<PlatformDoctorMatch | null>(null);
  const [platformMatches, setPlatformMatches] = useState<PlatformDoctorMatch[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (session?.user?.role !== CENTER_ROLE_ADMIN) {
      router.replace("/dashboard/medical-center");
    }
  }, [session?.user?.role, sessionStatus, router]);

  useEffect(() => {
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSpecialties(data);
      })
      .catch(() => toast.error("تعذر تحميل التخصصات"))
      .finally(() => setSpecsLoading(false));
  }, []);

  useEffect(() => {
    if (linkedDoctor) {
      setPlatformMatches([]);
      return;
    }
    if (!isPlausibleLookupEmail(lookupEmail)) {
      setPlatformMatches([]);
      return;
    }
    const t = setTimeout(() => {
      setLookupLoading(true);
      fetch(`/api/medical-center/doctors/lookup-by-email?email=${encodeURIComponent(lookupEmail.trim())}`)
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) {
            toast.error(typeof j.error === "string" ? j.error : "تعذر البحث عن الطبيب");
            setPlatformMatches([]);
            return;
          }
          if (j.doctors && Array.isArray(j.doctors)) setPlatformMatches(j.doctors);
          else setPlatformMatches([]);
        })
        .catch(() => {
          setPlatformMatches([]);
          toast.error("تعذر الاتصال بالخادم للبحث");
        })
        .finally(() => setLookupLoading(false));
    }, 450);
    return () => clearTimeout(t);
  }, [lookupEmail, linkedDoctor]);

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

  const timePayload = () =>
    slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime.length === 5 ? s.startTime : s.startTime.slice(0, 5),
      endTime: s.endTime.length === 5 ? s.endTime : s.endTime.slice(0, 5),
      slotCapacity: Math.min(50, Math.max(1, s.slotCapacity || 1)),
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(consultationFee);
    const docClinic = Number(doctorClinicFee);
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

    if (linkedDoctor) {
      setLoading(true);
      try {
        const res = await fetch("/api/medical-center/doctors/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: linkedDoctor.id,
            consultationFee: fee,
            doctorClinicFee: docClinic,
            patientFeeServiceType,
            timeSlots: timePayload(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "فشل إرسال الطلب");
          return;
        }
        toast.success(data.message || "تم إرسال الطلب", {
          description: "سيصل تنبيه للطبيب للموافقة أو الرفض. ستُضاف العيادة تلقائياً عند قبوله.",
          duration: 6000,
        });
        router.push("/dashboard/medical-center/doctors");
      } catch {
        toast.error("حدث خطأ");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!specialtyId || !name.trim() || !email.trim() || password.length < 6) {
      toast.error("أكمل الحقول المطلوبة");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      toast.error("أدخل رقم هاتف صالحاً للطبيب الجديد");
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
          timeSlots: timePayload(),
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

  if (sessionStatus === "loading" || session?.user?.role !== CENTER_ROLE_ADMIN) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  if (specsLoading) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <Link href="/dashboard/medical-center/doctors" className="text-sm text-blue-600 mb-4 inline-block">
        ← أطباء المركز
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <IconHeart className="h-6 w-6 text-blue-600" />
        إضافة طبيب للمركز
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات الطبيب وأوقات العمل</CardTitle>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            إن كان الطبيب <strong>مسجّلاً في المنصة</strong>، أدخل <strong>البريد الإلكتروني المسجّل لدينا</strong> واختر
            اسمه من القائمة — يُرسل له <strong>طلب انضمام</strong> ويُخفى إنشاء بريد وكلمة مرور. عند موافقته تُضاف
            عيادة المركز تلقائياً مع الأوقات التي تضعها هنا. إن لم يكن مسجّلاً، املأ البيانات الكاملة لإنشاء حساب
            جديد.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="lookupEmail">البريد للبحث عن طبيب مسجّل</Label>
              <Input
                id="lookupEmail"
                type="email"
                dir="ltr"
                autoComplete="off"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="نفس البريد المستخدم في تسجيل الدخول للمنصة"
              />
              <p className="text-xs text-gray-500">
                اكتب البريد الكامل؛ يتم البحث تلقائياً. لإضافة طبيب جديد بالكامل تجاهل هذا الحقل واملأ القسم أدناه.
              </p>
            </div>

            {lookupLoading && !linkedDoctor ? (
              <p className="text-xs text-blue-600 flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500" />
                جاري البحث في المنصة...
              </p>
            ) : null}

            {!linkedDoctor && platformMatches.length > 0 ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                  <IconUser className="h-3.5 w-3.5" />
                  طبيب مسجّل — اختر للطلب بالموافقة
                </p>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {platformMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setLinkedDoctor(m)}
                      className={cn(
                        "text-right rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        "border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50"
                      )}
                    >
                      <span className="font-bold text-gray-900">د. {m.name}</span>
                      <span className="block text-xs text-blue-700 mt-0.5">{m.specialtyAr || "—"}</span>
                      {m.email ? (
                        <span className="block text-[11px] text-slate-500 mt-1 dir-ltr text-right">{m.email}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {linkedDoctor ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">طبيب مسجّل — طلب انضمام</p>
                    <p className="font-bold text-gray-900 mt-1">د. {linkedDoctor.name}</p>
                    <p className="text-sm text-emerald-900">{linkedDoctor.specialtyAr || "—"}</p>
                    {linkedDoctor.email ? (
                      <p className="text-xs text-slate-600 mt-1 dir-ltr">{linkedDoctor.email}</p>
                    ) : null}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLinkedDoctor(null)}>
                    تغيير
                  </Button>
                </div>
                <p className="text-xs text-emerald-900/90 leading-relaxed">
                  لن يُنشأ حساب جديد. بعد «إرسال الطلب» ستنتظر موافقة الطبيب من لوحته. عند القبول تُضاف عيادة
                  مركزك إلى عياداته مع الأوقات أدناه.
                </p>
              </div>
            ) : null}

            {!linkedDoctor ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="name">الاسم الكامل</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required={!linkedDoctor} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">البريد الإلكتروني (لتسجيل الدخول)</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!linkedDoctor}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!linkedDoctor}
                    minLength={6}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">الهاتف</Label>
                  <Input
                    id="phone"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0599123456"
                    required={!linkedDoctor}
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
              </>
            ) : null}

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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "جاري الحفظ..."
                : linkedDoctor
                  ? "إرسال طلب انضمام للطبيب"
                  : "حفظ وإضافة الطبيب"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
