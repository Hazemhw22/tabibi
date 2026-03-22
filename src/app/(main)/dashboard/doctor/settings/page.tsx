"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Save, MapPin, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DAYS_AR, formatDateLong } from "@/lib/utils";
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
  return formatDateLong(d);
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
        }
      });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const trimmedNewSpec = newSpecialtyName.trim();
      const payload = {
        visibleToPatients,
        bio,
        experienceYears,
        consultationFee,
        locationId: locationId || null,
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
        <p className="text-gray-500 mt-1">أضف معلوماتك الأساسية التي تظهر للمرضى</p>
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
              اختر المدينة أو المحافظة في الضفة الغربية. سيُستخدم لعرضك للمرضى عند البحث حسب المنطقة.
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
