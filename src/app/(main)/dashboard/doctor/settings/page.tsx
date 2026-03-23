"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import IconLoader from "@/components/icon/icon-loader";
import IconSave from "@/components/icon/icon-save";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconHeart from "@/components/icon/icon-heart";
import { DOCTOR_AVATAR_MALE, DOCTOR_AVATAR_FEMALE } from "@/lib/avatar";
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
  const { data: session } = useSession();
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          if (data.doctor.gender) setGender(data.doctor.gender as "MALE" | "FEMALE");
          // تحميل صورة الطبيب من قاعدة البيانات أولاً، ثم من الـ session
          const dbImage = data.doctor.user?.image ?? data.doctor.User?.image ?? null;
          setAvatarUrl(dbImage || session?.user?.image || null);
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
  }, [session?.user?.image]);

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
          if (data.doctor.gender) setGender(data.doctor.gender as "MALE" | "FEMALE");
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
        imageUrl: avatarUrl || undefined,
        gender,
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الصورة الشخصية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Preview */}
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-gray-200 bg-gray-100 shrink-0">
                <Image
                  src={avatarUrl || (gender === "FEMALE" ? DOCTOR_AVATAR_FEMALE : DOCTOR_AVATAR_MALE)}
                  alt="صورة الطبيب"
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    const input = e.currentTarget;
                    if (!file) return;
                    try {
                      setUploadingAvatar(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/upload/avatar", { method: "POST", body: formData });
                      const data = await res.json();
                      if (!res.ok || !data.url) throw new Error(data.error || "فشل رفع الصورة");
                      setAvatarUrl(data.url);
                      toast.success("تم رفع الصورة، اضغط حفظ لتثبيتها");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
                    } finally {
                      setUploadingAvatar(false);
                      if (input) input.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAvatar ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
                  {uploadingAvatar ? "جاري الرفع..." : "رفع صورة مخصصة"}
                </Button>
                {avatarUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarUrl(null)} className="text-red-500">
                    إزالة الصورة المخصصة
                  </Button>
                )}
              </div>
            </div>

            {/* Gender selection for default avatar */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                أو اختر صورة افتراضية حسب الجنس:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setGender("MALE"); setAvatarUrl(null); }}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all h-36 ${
                    gender === "MALE" && !avatarUrl
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Image src={DOCTOR_AVATAR_MALE} alt="ذكر" fill className="object-cover object-top" unoptimized />
                  <div className={`absolute inset-x-0 bottom-0 py-1.5 text-xs font-bold text-center transition-colors ${
                    gender === "MALE" && !avatarUrl ? "bg-blue-600 text-white" : "bg-white/80 text-gray-700"
                  }`}>
                    ذكر
                  </div>
                  {gender === "MALE" && !avatarUrl && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setGender("FEMALE"); setAvatarUrl(null); }}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all h-36 ${
                    gender === "FEMALE" && !avatarUrl
                      ? "border-pink-500 ring-2 ring-pink-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Image src={DOCTOR_AVATAR_FEMALE} alt="أنثى" fill className="object-cover object-top" unoptimized />
                  <div className={`absolute inset-x-0 bottom-0 py-1.5 text-xs font-bold text-center transition-colors ${
                    gender === "FEMALE" && !avatarUrl ? "bg-pink-500 text-white" : "bg-white/80 text-gray-700"
                  }`}>
                    أنثى
                  </div>
                  {gender === "FEMALE" && !avatarUrl && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <IconHeart className="h-4 w-4 text-blue-500" />
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
              <IconMapPin className="h-4 w-4 text-violet-600" />
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
