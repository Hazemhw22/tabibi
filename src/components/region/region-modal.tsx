"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconLoader from "@/components/icon/icon-loader";
import IconLogin from "@/components/icon/icon-login";
import IconUserPlus from "@/components/icon/icon-user-plus";
import { Button } from "@/components/ui/button";
import { WEST_BANK_LOCATIONS, suggestLocationIdFromPlaceName } from "@/data/west-bank-locations";
import { getStoredUserRole } from "./role-choice-modal";
import { DropdownSelect } from "@/components/ui/dropdown-select";

const REGION_OPTIONS = [
  { value: "", label: "اختر المدينة أو المحافظة" },
  ...WEST_BANK_LOCATIONS.map((loc) => ({
    value: loc.id,
    label:
      loc.type === "governorate"
        ? `محافظة ${loc.nameAr}`
        : `${loc.nameAr} - ${loc.governorateAr}`,
  })),
];

const STORAGE_KEY = "tabibi-region-id";
const DISMISSED_KEY = "tabibi-region-dismissed";

export function getStoredRegionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredRegionId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new Event("tabibi-region-changed"));
}

export default function RegionModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (pathname !== "/") {
      setOpen(false);
      return;
    }
    const role = getStoredUserRole();
    if (role !== "patient") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const dismissed = window.localStorage.getItem(DISMISSED_KEY);
    if (!stored && !dismissed) setOpen(true);
  }, [mounted, pathname]);

  const handleUseMyLocation = () => {
    setGeoError(null);
    setLoadingGeo(true);
    if (!navigator.geolocation) {
      setGeoError("المتصفح لا يدعم الموقع الجغرافي");
      setLoadingGeo(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ar`,
            { headers: { "Accept-Language": "ar,en" } }
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || data.address?.county || "";
          const state = data.address?.state || "";
          const suggested = suggestLocationIdFromPlaceName(city || state || data.display_name || "");
          if (suggested) {
            setSelectedId(suggested);
          } else {
            setGeoError("لم نتمكن من تحديد منطقتك. اختر يدوياً من القائمة.");
          }
        } catch {
          setGeoError("حدث خطأ في تحديد الموقع. اختر المنطقة يدوياً.");
        } finally {
          setLoadingGeo(false);
        }
      },
      () => {
        setGeoError("لم نتمكن من الوصول لموقعك. اختر المنطقة يدوياً.");
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = () => {
    if (selectedId) {
      setStoredRegionId(selectedId);
      setOpen(false);
      router.push(`/doctors?locationId=${selectedId}`);
    }
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="region-modal-title">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-right">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-blue-100">
            <IconMapPin className="h-6 w-6 text-blue-600" />
          </div>
          <h2 id="region-modal-title" className="text-xl font-bold text-gray-900">
            اختر منطقتك
          </h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          اختر منطقتك في الضفة الغربية لعرض الأطباء القريبين منك، أو استخدم موقعك الحالي.
        </p>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 gap-2"
          onClick={handleUseMyLocation}
          disabled={loadingGeo}
        >
          {loadingGeo ? (
            <>
              <IconLoader className="h-4 w-4 animate-spin" />
              جاري تحديد الموقع...
            </>
          ) : (
            <>
              <IconMapPin className="h-4 w-4" />
              استخدم موقعي الحالي
            </>
          )}
        </Button>

        {geoError && <p className="text-sm text-amber-600 mb-2">{geoError}</p>}

        <label className="block text-sm font-medium text-gray-700 mb-2">
          أو اختر من القائمة
        </label>
        <div className="w-full min-w-0">
          <DropdownSelect
            value={selectedId}
            onChange={setSelectedId}
            options={REGION_OPTIONS}
            placeholder="اختر المدينة أو المحافظة"
            buttonClassName="h-11 border-gray-300"
          />
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={handleSkip}>
              تخطي
            </Button>
            <Button type="button" className="flex-1" onClick={handleConfirm} disabled={!selectedId}>
              تأكيد وعرض الأطباء
            </Button>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Link href="/login/patient" className="flex-1">
              <Button type="button" variant="outline" className="w-full gap-2">
                <IconLogin className="h-4 w-4" />
                تسجيل الدخول
              </Button>
            </Link>
            <Link href="/register/patient" className="flex-1">
              <Button type="button" variant="outline" className="w-full gap-2">
                <IconUserPlus className="h-4 w-4" />
                إنشاء حساب
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
