"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import IconLoader from "@/components/icon/icon-loader";
import IconHeart from "@/components/icon/icon-heart";
import IconPlus from "@/components/icon/icon-plus";
import IconUpload from "@/components/icon/icon-upload";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import IconMapPin from "@/components/icon/icon-map-pin";
import { WEST_BANK_LOCATIONS } from "@/data/west-bank-locations";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Specialty {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
}

export default function DoctorSetupPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role && isDoctorStaffRole(session.user.role)) {
      router.replace("/dashboard/doctor/appointments");
    }
  }, [session?.user?.role, status, router]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("");
  const [newSpecialtyName, setNewSpecialtyName] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/specialties")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSpecialties(data);
          if (data.length > 0 && !selectedSpecialtyId) setSelectedSpecialtyId(data[0].id);
        }
      })
      .catch(() => setSpecialties([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") return;

    setSubmitting(true);
    setError(null);

    try {
      let finalImageUrl: string | null = null;

      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const upRes = await fetch("/api/upload/avatar", { method: "POST", body: form });
        if (upRes.ok) {
          const { url } = await upRes.json();
          finalImageUrl = url;
        }
      }

      const body: Record<string, string | undefined> = {
        imageUrl: finalImageUrl ?? undefined,
      };
      if (newSpecialtyName.trim()) {
        body.newSpecialtyName = newSpecialtyName.trim();
      } else if (selectedSpecialtyId) {
        body.specialtyId = selectedSpecialtyId;
      }
      if (locationId) body.locationId = locationId;

      const res = await fetch("/api/doctor/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        router.replace("/dashboard/doctor");
        return;
      }
      setError(data.error || "حدث خطأ أثناء الإعداد");
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IconLoader className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-2">
            <IconHeart className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-xl">إعداد حساب الطبيب</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            اختر تخصصك ومنطقتك وأضف صورة شخصية لملفك
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* صورة الملف الشخصي */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                صورة الملف الشخصي (اختياري)
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <Image src={imageUrl} alt="Preview" width={96} height={96} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <IconUpload className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("avatar-upload")?.click()}>
                    اختر صورة
                  </Button>
                </div>
              </div>
            </div>

            {/* المنطقة - الضفة الغربية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IconMapPin className="inline h-4 w-4 ml-1" />
                المنطقة (الضفة الغربية)
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">اختر المدينة أو القرية</option>
                {WEST_BANK_LOCATIONS.filter((l) => l.type !== "governorate").map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.nameAr} - {loc.governorateAr}
                  </option>
                ))}
              </select>
            </div>

            {/* التخصص */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التخصص
              </label>
              <div className="space-y-2 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {specialties.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="specialty"
                      value={s.id}
                      checked={selectedSpecialtyId === s.id && !newSpecialtyName.trim()}
                      onChange={() => { setSelectedSpecialtyId(s.id); setNewSpecialtyName(""); }}
                      className="text-blue-600"
                    />
                    <span className="text-sm">{s.icon} {s.nameAr}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* إضافة تخصص جديد */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <IconPlus className="h-4 w-4" />
                أو أضف تخصصاً جديداً
              </label>
              <input
                type="text"
                value={newSpecialtyName}
                onChange={(e) => setNewSpecialtyName(e.target.value)}
                placeholder="مثال: طب العيون"
                className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <IconInfoCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting || loading}>
              {submitting ? (
                <>
                  <IconLoader className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "إنهاء الإعداد"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
