"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Save, MapPin, Clock, Stethoscope, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DAYS_AR } from "@/lib/utils";
import { WEST_BANK_LOCATIONS, getLocationById } from "@/data/west-bank-locations";

function getDateForDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = (dayOfWeek - currentDay + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() + (diff === 0 ? 0 : diff));
  return d;
}

function formatDateAr(d: Date): string {
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
}

interface Clinic {
  id?: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  isMain: boolean;
}

interface TimeSlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Specialty {
  id: string;
  name: string;
  nameAr: string;
}

export default function DoctorSettingsPage() {
  useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [visibleToPatients, setVisibleToPatients] = useState(true);
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [consultationFee, setConsultationFee] = useState(0);
  const [locationId, setLocationId] = useState<string>("");
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");
  const [newSpecialtyName, setNewSpecialtyName] = useState("");
  const [clinics, setClinics] = useState<Clinic[]>([
    { name: "", address: "", city: "الخليل", phone: "", isMain: true },
  ]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    fetch("/api/doctor/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.doctor) {
          setVisibleToPatients(data.doctor.visibleToPatients !== false);
          setBio(data.doctor.bio || "");
          setExperienceYears(data.doctor.experienceYears || 0);
          setConsultationFee(data.doctor.consultationFee || 0);
          if (data.doctor.locationId) setLocationId(data.doctor.locationId);
          if (data.doctor.specialty?.id) {
            setSelectedSpecialtyId(data.doctor.specialty.id);
          }
          if (data.doctor.clinics?.length > 0) {
            setClinics(data.doctor.clinics);
          }
          if (data.doctor.timeSlots?.length > 0) {
            setTimeSlots(data.doctor.timeSlots);
          }
        }
      });

    // تحميل قائمة التخصصات لاختيار / إضافة تخصص جديد
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSpecialties(data);
          if (!selectedSpecialtyId && data.length > 0) {
            setSelectedSpecialtyId(data[0].id);
          }
        }
      })
      .catch(() => setSpecialties([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only; selectedSpecialtyId set from response
  }, []);

  const addClinic = () => {
    setClinics([...clinics, { name: "", address: "", city: "الخليل", phone: "", isMain: false }]);
  };

  const removeClinic = (index: number) => {
    setClinics(clinics.filter((_, i) => i !== index));
  };

  const setMainClinic = (index: number) => {
    setClinics(
      clinics.map((c, i) => ({ ...c, isMain: i === index }))
    );
  };

  const updateClinic = (index: number, field: keyof Clinic, value: string | boolean) => {
    const updated = [...clinics];
    updated[index] = { ...updated[index], [field]: value };
    setClinics(updated);
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { dayOfWeek: 0, startTime: "09:00", endTime: "17:00" }]);
  };

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTimeSlots(updated);
  };

  const fetchProfile = () => {
    return fetch("/api/doctor/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.doctor) {
          setVisibleToPatients(data.doctor.visibleToPatients !== false);
          setBio(data.doctor.bio || "");
          setExperienceYears(data.doctor.experienceYears || 0);
          setConsultationFee(data.doctor.consultationFee || 0);
          if (data.doctor.locationId) setLocationId(data.doctor.locationId);
          if (data.doctor.specialty?.id) setSelectedSpecialtyId(data.doctor.specialty.id);
          setClinics(Array.isArray(data.doctor.clinics) && data.doctor.clinics.length > 0 ? data.doctor.clinics : [{ name: "", address: "", city: "الخليل", phone: "", isMain: true }]);
          setTimeSlots(Array.isArray(data.doctor.timeSlots) && data.doctor.timeSlots.length > 0 ? data.doctor.timeSlots : []);
        }
      });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const trimmedNewSpec = newSpecialtyName.trim();
      const loc = locationId ? getLocationById(locationId) : null;
      const regionName = loc?.nameAr ?? "";
      const regionGov = loc?.governorateAr ?? "الخليل";
      const clinicsToSave = clinics
        .filter((c) => (c.name?.trim() ?? "") !== "")
        .map((c) => ({
          ...c,
          address: (c.address?.trim() ?? "") !== "" ? c.address.trim() : regionName,
          city: (c.city?.trim() ?? "") !== "" ? c.city : regionGov,
        }))
        .filter((c) => c.address !== "");
      const payload = {
        visibleToPatients,
        bio,
        experienceYears,
        consultationFee,
        locationId: locationId || null,
        clinics: clinicsToSave,
        timeSlots,
        specialtyId: trimmedNewSpec ? undefined : selectedSpecialtyId || undefined,
        newSpecialtyName: trimmedNewSpec || undefined,
      };
      const res = await fetch("/api/doctor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("تم حفظ البيانات بنجاح!");
        await fetchProfile();
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الملف الطبي</h1>
        <p className="text-gray-500 mt-1">أضف معلوماتك وعيادتك وجدول عملك</p>
      </div>

      <div className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* التخصص */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التخصص
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-blue-500" />
                  <select
                    value={selectedSpecialtyId}
                    onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                    className="flex-1 h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500">
                  يمكنك ترك التخصص كما هو، أو إضافة تخصص جديد في الحقل التالي.
                </p>
                <Input
                  placeholder="إضافة تخصص جديد (اختياري)"
                  value={newSpecialtyName}
                  onChange={(e) => setNewSpecialtyName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الظهور للمرضى
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleToPatients(true)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    visibleToPatients
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  عرض للمرضى
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleToPatients(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    !visibleToPatients
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  عدم العرض
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                عند اختيار &quot;عدم العرض&quot; لن يظهر كارتك للمرضى ولن يستطيعوا الحجز عبر المنصة. فقط مرضى عيادتك يمكنهم الوصول إليك ويتلقون الرسائل على الهاتف.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نبذة تعريفية
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب نبذة عن تخصصك وخبرتك..."
                rows={4}
                className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سنوات الخبرة
                </label>
                <input
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  min={0}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رسوم الاستشارة (₪)
                </label>
                <input
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                  min={0}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* منطقة العمل */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-violet-600" />
              منطقتك (مكان العمل)
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              اختر المدينة أو المحافظة في الضفة الغربية. سيُستخدم لعرضك للمرضى عند البحث حسب المنطقة. عنوان كل عيادة يُدخل تفصيلياً أدناه.
            </p>
          </CardHeader>
          <CardContent>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            >
              <option value="">اختر المدينة أو المحافظة</option>
              {WEST_BANK_LOCATIONS.filter((l) => l.type !== "governorate").map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nameAr} — {loc.governorateAr}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Clinics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              العيادات
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addClinic} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              إضافة
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              اسم العيادة، رقم الهاتف والعنوان التفصيلي حتى يعرف المريض مكان العيادة.
            </p>
            {clinics.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                لا توجد عيادات. انقر &quot;إضافة&quot; لإضافة عيادة.
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
                        <Star className="h-3.5 w-3.5" />
                        رئيسية
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => document.getElementById(`clinic-name-${i}`)?.focus()}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="تعديل البيانات"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeClinic(i)}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="حذف العيادة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id={`clinic-name-${i}`}
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
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              جدول المواعيد
            </CardTitle>
            <Button size="sm" variant="outline" onClick={addTimeSlot} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              إضافة وقت
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeSlots.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                لم تحدد أوقات عمل بعد. انقر &quot;إضافة وقت&quot; لإضافة جدولك.
              </p>
            )}
            {timeSlots.map((slot, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateTimeSlot(i, "dayOfWeek", Number(e.target.value))}
                    className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
                  >
                    {DAYS_AR.map((day, d) => (
                      <option key={d} value={d}>{day}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    ({formatDateAr(getDateForDayOfWeek(slot.dayOfWeek))})
                  </span>
                </div>

                <input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateTimeSlot(i, "startTime", e.target.value)}
                  className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <span className="text-gray-400">-</span>

                <input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateTimeSlot(i, "endTime", e.target.value)}
                  className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={() => removeTimeSlot(i)}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              حفظ التغييرات
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
