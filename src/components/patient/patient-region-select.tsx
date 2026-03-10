"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEST_BANK_LOCATIONS } from "@/data/west-bank-locations";
import { toast } from "sonner";

type Props = {
  /** القيمة الحالية (مثلاً من الإعدادات) */
  defaultRegionId?: string | null;
  /** عنوان البطاقة */
  title?: string;
  /** وصف قصير */
  description?: string;
  /** عرض مضغوط بدون تأكيد كبير */
  compact?: boolean;
};

export default function PatientRegionSelect({
  defaultRegionId,
  title = "اختر منطقتك لعرض الأطباء القريبين منك",
  description = "حدّد المدينة أو المحافظة في الضفة الغربية لرؤية الأطباء في منطقتك فقط.",
  compact = false,
}: Props) {
  const router = useRouter();
  const [regionId, setRegionId] = useState(defaultRegionId ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!regionId) {
      toast.error("اختر منطقتك");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/patient/region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حدث خطأ");
        return;
      }
      toast.success("تم حفظ منطقتك. سنعرض لك الأطباء في منطقتك.");
      router.refresh();
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={compact ? "" : "border-2 border-emerald-200 bg-emerald-50/50 mb-8"}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-emerald-600" />
          {title}
        </CardTitle>
        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">اختر المدينة أو المحافظة</option>
          {WEST_BANK_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.type === "governorate" ? `محافظة ${loc.nameAr}` : `${loc.nameAr} - ${loc.governorateAr}`}
            </option>
          ))}
        </select>
        <Button onClick={handleSave} disabled={!regionId || loading} className="gap-2">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...</> : compact ? "حفظ المنطقة" : "حفظ وعرض الأطباء"}
        </Button>
      </CardContent>
    </Card>
  );
}
