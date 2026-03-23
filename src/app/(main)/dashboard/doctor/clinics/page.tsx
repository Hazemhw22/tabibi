"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconLoader from "@/components/icon/icon-loader";
import IconSave from "@/components/icon/icon-save";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconClock from "@/components/icon/icon-clock";
import IconStar from "@/components/icon/icon-star";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { DAYS_AR, cn } from "@/lib/utils";
import { EXTRA_CLINIC_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";
import { WEST_BANK_LOCATIONS, getLocationById } from "@/data/west-bank-locations";

interface Clinic {
  id?: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  isMain: boolean;
  locationId?: string | null;
}

interface TimeSlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  clinicId?: string | null;
}

export default function DoctorClinicsPage() {
  useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [doctorLocationId, setDoctorLocationId] = useState<string | null>(null);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  /** حسب الساعات = أوقات محددة | حسب الدور = عدد أدوار خلال فترة */
  const [scheduleMode, setScheduleMode] = useState<"hours" | "turns">("hours");
  const [turnForm, setTurnForm] = useState({ dayOfWeek: 0, fromTime: "09:00", toTime: "17:00", turnsCount: 10 });
  const [centerFlags, setCenterFlags] = useState<{
    medicalCenterId: string | null;
    canAddExtraClinics: boolean;
  }>({ medicalCenterId: null, canAddExtraClinics: false });
  const [requestingExtra, setRequestingExtra] = useState(false);

  useEffect(() => {
    fetch("/api/doctor/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.doctor) {
          setCenterFlags({
            medicalCenterId: data.doctor.medicalCenterId ?? null,
            canAddExtraClinics: Boolean(data.doctor.canAddExtraClinics),
          });
          setDoctorLocationId(data.doctor.locationId ?? null);
          if (Array.isArray(data.doctor.clinics) && data.doctor.clinics.length > 0) {
            const normalizedClinics = data.doctor.clinics.map((c: Clinic) => ({
              ...c,
              locationId: c.locationId ?? data.doctor.locationId ?? null,
            }));
            setClinics(normalizedClinics);
            const firstClinicId = normalizedClinics[0]?.id ?? "";
            setSelectedClinicId(firstClinicId);

            // ربط الأوقات القديمة تلقائياً بأول عيادة إن لم يكن لها عيادة محددة
            if (Array.isArray(data.doctor.timeSlots) && data.doctor.timeSlots.length > 0) {
              const normalizedSlots = data.doctor.timeSlots.map((s: TimeSlot) => ({
                ...s,
                clinicId: s.clinicId ?? (firstClinicId || null),
              }));
              setTimeSlots(normalizedSlots);
            }
          } else {
            const initialClinic: Clinic = {
              name: "",
              address: "",
              city: "الخليل",
              phone: "",
              isMain: true,
              locationId: data.doctor.locationId ?? null,
            };
            setClinics([initialClinic]);
            setSelectedClinicId("");

            if (Array.isArray(data.doctor.timeSlots) && data.doctor.timeSlots.length > 0) {
              const normalizedSlots = data.doctor.timeSlots.map((s: TimeSlot) => ({
                ...s,
                clinicId: null,
              }));
              setTimeSlots(normalizedSlots);
            }
          }
        }
      })
      .catch(() => {
        setClinics([
          { name: "", address: "", city: "الخليل", phone: "", isMain: true, locationId: null },
        ]);
      });
  }, []);

  const addClinic = () => {
    if (
      centerFlags.medicalCenterId &&
      !centerFlags.canAddExtraClinics &&
      clinics.length >= 1
    ) {
      toast.error(
        "أطباء المركز: عيادة واحدة مضمّنة في اشتراك المركز. لإضافة عيادة أخرى يجب موافقة إدارة المنصة (رسوم إضافية سنوية)."
      );
      return;
    }
    const newClinic: Clinic = {
      name: "",
      address: "",
      city: "الخليل",
      phone: "",
      isMain: clinics.length === 0,
      locationId: doctorLocationId,
    };
    const next = [
      ...clinics,
      newClinic,
    ];
    setClinics(next);
    if (!selectedClinicId && next[0]) {
      setSelectedClinicId(next[0].id ?? "");
    }
  };

  const removeClinic = (index: number) => {
    const clinic = clinics[index];
    const nextClinics = clinics.filter((_, i) => i !== index);
    setClinics(nextClinics);
    if (clinic?.id) {
      setTimeSlots(timeSlots.filter((s) => s.clinicId !== clinic.id));
    }
    if (selectedClinicId === clinic?.id) {
      setSelectedClinicId(nextClinics[0]?.id ?? "");
    }
  };

  const setMainClinic = (index: number) => {
    setClinics(clinics.map((c, i) => ({ ...c, isMain: i === index })));
  };

  const updateClinic = (index: number, field: keyof Clinic, value: string | boolean | null) => {
    const updated = [...clinics];
    updated[index] = { ...updated[index], [field]: value } as Clinic;
    setClinics(updated);
  };

  const addTimeSlot = () => {
    if (!selectedClinicId) {
      toast.error("يرجى اختيار عيادة أولاً لإضافة أوقات عمل لها");
      return;
    }
    setTimeSlots([
      ...timeSlots,
      { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", clinicId: selectedClinicId },
    ]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTimeSlots(updated);
  };

  /** توليد أوقات من عدد الأدوار: اليوم + من ساعة إلى ساعة + عدد الأدوار */
  const addTurnsAsSlots = () => {
    if (!selectedClinicId) {
      toast.error("يرجى اختيار عيادة أولاً");
      return;
    }
    const { dayOfWeek, fromTime, toTime, turnsCount } = turnForm;
    if (!turnsCount || turnsCount < 1 || turnsCount > 100) {
      toast.error("عدد الأدوار يجب أن يكون بين 1 و 100");
      return;
    }
    const [fromH, fromM] = fromTime.split(":").map(Number);
    const [toH, toM] = toTime.split(":").map(Number);
    const fromMins = fromH * 60 + fromM;
    const toMins = toH * 60 + toM;
    if (toMins <= fromMins) {
      toast.error("وقت انتهاء العمل يجب أن يكون بعد وقت البداية");
      return;
    }
    const totalMins = toMins - fromMins;
    const minsPerTurn = Math.floor(totalMins / turnsCount);
    if (minsPerTurn < 5) {
      toast.error("المدة الزمنية قصيرة جداً. قلّل عدد الأدوار أو وسّع الفترة.");
      return;
    }
    const newSlots: TimeSlot[] = [];
    for (let i = 0; i < turnsCount; i++) {
      const startMins = fromMins + i * minsPerTurn;
      const endMins = startMins + minsPerTurn;
      const sh = Math.floor(startMins / 60);
      const sm = startMins % 60;
      const eh = Math.floor(endMins / 60);
      const em = endMins % 60;
      newSlots.push({
        dayOfWeek,
        startTime: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
        endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
        clinicId: selectedClinicId,
      });
    }
    setTimeSlots([...timeSlots, ...newSlots]);
    toast.success(`تم إضافة ${turnsCount} دوراً لليوم ${DAYS_AR[dayOfWeek]}`);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const loc = doctorLocationId ? getLocationById(doctorLocationId) : null;
      const regionName = loc?.nameAr ?? "";
      const regionGov = loc?.governorateAr ?? "الخليل";

      const clinicsToSave = clinics
        .filter((c) => (c.name?.trim() ?? "") !== "")
        .map((c) => ({
          ...c,
          address: (c.address?.trim() ?? "") !== "" ? c.address.trim() : regionName,
          city: (c.city?.trim() ?? "") !== "" ? c.city : regionGov,
          locationId: c.locationId ?? doctorLocationId ?? null,
        }))
        .filter((c) => c.address !== "");

      const payload = {
        clinics: clinicsToSave,
        timeSlots,
      };

      const res = await fetch("/api/doctor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("تم حفظ العيادات والمواعيد بنجاح!");
        router.refresh();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  };

  const requestExtraClinicFromAdmin = async () => {
    setRequestingExtra(true);
    try {
      const res = await fetch("/api/doctor/request-extra-clinic", { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "فشل الإرسال");
        return;
      }
      toast.success(j.message || "تم إرسال الطلب");
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setRequestingExtra(false);
    }
  };

  const getLocationLabel = (locId: string | null | undefined) => {
    if (!locId) return "اختر المنطقة";
    const loc = getLocationById(locId);
    return loc ? `${loc.nameAr} — ${loc.governorateAr}` : "منطقة غير معروفة";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">العيادات والمواعيد</h1>
        <p className="text-gray-500 mt-1">
          إدارة عياداتك ومواعيد العمل لكل عيادة. يمكن أن يكون لكل عيادة موقع مختلف داخل الضفة
          الغربية.
        </p>
      </div>

      {centerFlags.medicalCenterId && !centerFlags.canAddExtraClinics && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">أنت مرتبط بمركز طبي</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            إضافة عيادة إضافية تتطلب موافقة مشرف المنصة لأنها تزيد الرسوم ({EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪
            سنوياً). لا يمكنك إضافة أكثر من عيادة من هنا حتى يفعّل المشرف الخيار من لوحة الإدارة.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-amber-300"
            disabled={requestingExtra}
            onClick={requestExtraClinicFromAdmin}
          >
            {requestingExtra ? "جاري الإرسال..." : "إرسال طلب لإدارة المنصة"}
          </Button>
        </div>
      )}

      <div className="space-y-8">
        {/* Clinics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IconMapPin className="h-4 w-4" />
              العيادات
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={addClinic}
              className="gap-1"
              disabled={
                Boolean(centerFlags.medicalCenterId) &&
                !centerFlags.canAddExtraClinics &&
                clinics.length >= 1
              }
            >
              <IconPlus className="h-3.5 w-3.5" />
              إضافة عيادة
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              أضف لكل عيادة اسمها، رقم هاتفها، عنوانها التفصيلي، واختر المنطقة (المدينة / القرية)
              التي تقع فيها.
            </p>
            {clinics.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                لا توجد عيادات. انقر &quot;إضافة عيادة&quot; لإضافة أول عيادة.
              </p>
            )}
            {clinics.map((clinic, i) => (
              <div key={clinic.id ?? i} className="p-4 border border-gray-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    عيادة {i + 1} {clinic.isMain && "(رئيسية)"}
                  </h4>
                  <div className="flex items-center gap-2">
                    {!clinic.isMain && (
                      <button
                        type="button"
                        onClick={() => setMainClinic(i)}
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
                        title="تعيين كعيادة رئيسية"
                      >
                        <IconStar className="h-3.5 w-3.5" />
                        رئيسية
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeClinic(i)}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="حذف العيادة"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="اسم العيادة"
                    value={clinic.name}
                    onChange={(e) => updateClinic(i, "name", e.target.value)}
                  />
                  <Input
                    placeholder="رقم الهاتف"
                    value={clinic.phone}
                    onChange={(e) => updateClinic(i, "phone", e.target.value)}
                    dir="ltr"
                  />
                </div>

                <Input
                  placeholder="العنوان التفصيلي (شارع، مبنى، طابق...)"
                  value={clinic.address}
                  onChange={(e) => updateClinic(i, "address", e.target.value)}
                />

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    المنطقة (مدينة / قرية في الضفة الغربية)
                  </label>
                  <select
                    value={clinic.locationId ?? ""}
                    onChange={(e) =>
                      updateClinic(i, "locationId", e.target.value ? e.target.value : null)
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="">
                      {clinic.locationId ? getLocationLabel(clinic.locationId) : "اختر المنطقة"}
                    </option>
                    {WEST_BANK_LOCATIONS.filter((l) => l.type !== "governorate").map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.nameAr} — {loc.governorateAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <IconClock className="h-4 w-4" />
              جدول المواعيد
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addTimeSlot} className="gap-1">
              <IconPlus className="h-3.5 w-3.5" />
              إضافة وقت
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                اختر العيادة لإدارة أوقات العمل الخاصة بها
              </label>
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-3"
              >
                <option value="">اختر العيادة</option>
                {clinics.map((clinic, idx) => (
                  <option key={clinic.id ?? `c${idx}`} value={clinic.id ?? `c${idx}`}>
                    {clinic.name || "عيادة بدون اسم"}
                  </option>
                ))}
              </select>
            </div>

            {selectedClinicId && (
              <div className="flex gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 mb-3">
                <button
                  type="button"
                  onClick={() => setScheduleMode("hours")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    scheduleMode === "hours"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  حسب الساعات
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode("turns")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    scheduleMode === "turns"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  حسب الدور
                </button>
              </div>
            )}

            {selectedClinicId && scheduleMode === "turns" && (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 mb-4">
                <p className="text-xs font-medium text-amber-800">
                  حدد اليوم، ساعات عمل العيادة، وعدد الأدوار (عدد المرضى)
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={turnForm.dayOfWeek}
                    onChange={(e) =>
                      setTurnForm((p) => ({ ...p, dayOfWeek: Number(e.target.value) }))
                    }
                    className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
                  >
                    {DAYS_AR.map((day, d) => (
                      <option key={d} value={d}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 text-sm">من</span>
                  <input
                    type="time"
                    value={turnForm.fromTime}
                    onChange={(e) => setTurnForm((p) => ({ ...p, fromTime: e.target.value }))}
                    className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 text-sm">إلى</span>
                  <input
                    type="time"
                    value={turnForm.toTime}
                    onChange={(e) => setTurnForm((p) => ({ ...p, toTime: e.target.value }))}
                    className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="عدد الأدوار"
                    value={turnForm.turnsCount || ""}
                    onChange={(e) =>
                      setTurnForm((p) => ({
                        ...p,
                        turnsCount: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)),
                      }))
                    }
                    className="w-24 h-10"
                  />
                  <Button size="sm" onClick={addTurnsAsSlots} className="gap-1">
                    <IconPlus className="h-3.5 w-3.5" />
                    إضافة الأدوار
                  </Button>
                </div>
              </div>
            )}

            {!selectedClinicId && (
              <p className="text-sm text-gray-500 text-center py-4">
                اختر عيادة من القائمة بالأعلى لإضافة أو تعديل أوقات عملها.
              </p>
            )}

            {selectedClinicId &&
              timeSlots.filter((s) => s.clinicId === selectedClinicId).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                لم تحدد أوقات عمل بعد. {scheduleMode === "hours" ? "انقر إضافة وقت" : "استخدم النموذج أعلاه لإضافة أدوار"} أو غيّر إلى &quot;حسب الساعات&quot; لإضافة أوقات يدوياً.
              </p>
            )}

            {selectedClinicId && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  جدول المواعيد المُضافة {timeSlots.filter((s) => s.clinicId === selectedClinicId).length > 0 && `(${timeSlots.filter((s) => s.clinicId === selectedClinicId).length})`}
                </p>
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => {
                if (slot.clinicId !== selectedClinicId) return null;
                return (
              <div key={slot.id ?? index} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateTimeSlot(index, "dayOfWeek", Number(e.target.value))}
                    className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
                  >
                    {DAYS_AR.map((day, d) => (
                      <option key={d} value={d}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateTimeSlot(index, "startTime", e.target.value)}
                  className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <span className="text-gray-400">-</span>

                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateTimeSlot(index, "endTime", e.target.value)}
                  className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={() => removeTimeSlot(index)}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <IconLoader className="h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <IconSave className="h-4 w-4" />
              حفظ التغييرات
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

