"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import IconBuilding from "@/components/icon/icon-building";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconSettings from "@/components/icon/icon-settings";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconClock from "@/components/icon/icon-clock";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DAYS_AR } from "@/lib/utils";
import { WEST_BANK_LOCATIONS } from "@/data/west-bank-locations";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import LoadingScreen from "@/components/ui/loading-screen";

const DAY_OPTIONS = DAYS_AR.map((d, idx) => ({ value: String(idx), label: d }));
const LOCATION_OPTIONS = [
  { value: "", label: "— اختر المنطقة —" },
  ...WEST_BANK_LOCATIONS.filter((l) => l.type !== "governorate").map((l) => ({
    value: l.id,
    label: `${l.governorateAr} — ${l.nameAr}`,
  })),
];

type HoursRow = { dayOfWeek: number; startTime: string; endTime: string };

export default function MedicalCenterSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [locationId, setLocationId] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hours, setHours] = useState<HoursRow[]>([{ dayOfWeek: 0, startTime: "08:00", endTime: "16:00" }]);

  useEffect(() => {
    fetch("/api/medical-center/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) {
          toast.error(j.error);
          return;
        }
        const c = j.center as {
          name?: string;
          nameAr?: string;
          address?: string;
          city?: string;
          phone?: string | null;
          description?: string | null;
          locationId?: string | null;
          imageUrl?: string | null;
          operatingHours?: HoursRow[];
        };
        setName(c.name ?? "");
        setNameAr(c.nameAr ?? "");
        setAddress(c.address ?? "");
        setCity(c.city ?? "");
        setPhone(c.phone ?? "");
        setDescription(c.description ?? "");
        setLocationId(c.locationId ?? "");
        setImageUrl(c.imageUrl ?? "");
        if (c.operatingHours?.length) setHours(c.operatingHours);
      })
      .catch(() => toast.error("تعذر التحميل"))
      .finally(() => setLoading(false));
  }, []);

  const addHourRow = () =>
    setHours((h) => [...h, { dayOfWeek: 1, startTime: "08:00", endTime: "16:00" }]);
  const removeHourRow = (i: number) => setHours((h) => h.filter((_, idx) => idx !== i));
  const updateHourRow = (i: number, patch: Partial<HoursRow>) =>
    setHours((h) => h.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      toast.error("الاسم والعنوان مطلوبان");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/medical-center/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          nameAr: nameAr.trim() || name.trim(),
          address: address.trim(),
          city: city.trim() || "الخليل",
          phone: phone.trim() || null,
          description: description.trim() || null,
          locationId: locationId || null,
          imageUrl: imageUrl || null,
          operatingHours: hours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime.slice(0, 5),
            endTime: h.endTime.slice(0, 5),
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

  const panelClass =
    "mb-4 rounded-xl border border-slate-200 bg-white shadow-sm p-4 md:p-5";

  const inputClass =
    "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500/30";

  if (loading) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto pb-24 bg-slate-50/80 min-h-full">
      <Link
        href="/dashboard/medical-center"
        className="text-sm text-blue-600 mb-4 inline-block font-medium"
      >
        ← الرئيسية
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <IconSettings className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">إعدادات المركز الطبي</h1>
          <p className="text-sm text-slate-600 mt-1">
            تعديل بيانات المركز، الموقع (مدينة/قرية)، وأوقات عمل المركز العامة.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4">
        <div className={panelClass}>
          <h2 className="mb-1 text-base font-semibold text-slate-900 flex items-center gap-2">
            <IconBuilding className="h-4 w-4 text-blue-600" />
            بيانات المركز
          </h2>
          <p className="text-xs text-slate-500 mb-4">الاسم والعنوان كما تظهر للمرضى.</p>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {imageUrl ? (
                <Image src={imageUrl} alt="صورة المركز" fill className="object-cover" unoptimized />
              ) : null}
            </div>
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
                  setUploadingImage(true);
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("/api/upload/avatar", { method: "POST", body: formData });
                  const data = await res.json();
                  if (!res.ok || !data.url) throw new Error(data.error || "فشل رفع الصورة");
                  setImageUrl(data.url);
                  toast.success("تم رفع صورة المركز، اضغط حفظ لتثبيتها");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
                } finally {
                  setUploadingImage(false);
                  if (input) input.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingImage ? "جاري الرفع..." : "رفع صورة المركز"}
            </Button>
            {imageUrl ? (
              <Button type="button" variant="ghost" onClick={() => setImageUrl("")}>
                إزالة
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-slate-700">الاسم (عربي)</Label>
              <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} className={inputClass} />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700">الاسم (إنجليزي / داخلي)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} dir="ltr" className={inputClass} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label className="text-slate-700">العنوان</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700">المدينة</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700">الهاتف</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className={inputClass} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label className="text-slate-700">وصف مختصر</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className={panelClass}>
          <h2 className="mb-1 text-base font-semibold text-slate-900 flex items-center gap-2">
            <IconMapPin className="h-4 w-4 text-emerald-600" />
            موقع المركز على الخريطة
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            اختر المدينة أو القرية من الضفة الغربية (لتظهر في البحث والفلترة).
          </p>
          <div className="w-full min-w-0">
            <DropdownSelect
              value={locationId}
              onChange={setLocationId}
              options={LOCATION_OPTIONS}
              placeholder="— اختر المنطقة —"
            />
          </div>
        </div>

        <div className={panelClass}>
          <h2 className="mb-1 text-base font-semibold text-slate-900 flex items-center gap-2">
            <IconClock className="h-4 w-4 text-amber-600" />
            أوقات عمل المركز (عامة)
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            تُستخدم للمرجعية والعرض؛ أوقات الحجز الفعلية تُحدَّد لكل طبيب ضمن عيادة المركز.
          </p>
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={addHourRow} className="gap-1 border-slate-200 text-slate-700">
                <IconPlus className="h-4 w-4" />
                إضافة يوم
              </Button>
            </div>
            {hours.map((row, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="w-full min-w-0 space-y-1">
                  <Label className="text-xs text-slate-600">اليوم</Label>
                  <DropdownSelect
                    value={String(row.dayOfWeek)}
                    onChange={(v) => updateHourRow(i, { dayOfWeek: Number(v) })}
                    options={DAY_OPTIONS}
                    placeholder="اختر اليوم"
                  />
                </div>
                <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label className="text-xs text-slate-600">من</Label>
                  <Input
                    type="time"
                    className={cn("mt-1 w-[130px]", inputClass)}
                    value={row.startTime}
                    onChange={(e) => updateHourRow(i, { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">إلى</Label>
                  <Input
                    type="time"
                    className={cn("mt-1 w-[130px]", inputClass)}
                    value={row.endTime}
                    onChange={(e) => updateHourRow(i, { endTime: e.target.value })}
                  />
                </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeHourRow(i)}
                    disabled={hours.length <= 1}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </form>
    </div>
  );
}
