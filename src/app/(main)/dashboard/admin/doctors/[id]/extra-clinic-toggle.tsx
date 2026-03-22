"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EXTRA_CLINIC_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";
import { toast } from "sonner";

export default function ExtraClinicToggle({
  doctorId,
  medicalCenterId,
  canAddExtraClinics,
}: {
  doctorId: string;
  medicalCenterId: string | null;
  canAddExtraClinics: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!medicalCenterId) return null;

  if (canAddExtraClinics) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
        ✓ مفعّل: يمكن للطبيب إضافة عيادات إضافية (تم احتساب {EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪ سنوياً عند التفعيل)
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        طبيب مرتبط بمركز: لا يمكنه إضافة أكثر من عيادة حتى تفعيل هذا الخيار (رسوم إضافية {EXTRA_CLINIC_ANNUAL_FEE_NIS}{" "}
        ₪ سنوياً).
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const res = await fetch(`/api/admin/doctors/${doctorId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ canAddExtraClinics: true }),
            });
            const j = await res.json();
            if (!res.ok) {
              toast.error(j.error || "فشل التفعيل");
              return;
            }
            toast.success("تم التفعيل وتسجيل الرسوم الإضافية");
            router.refresh();
          } catch {
            toast.error("حدث خطأ");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "جاري..." : `السماح بإضافة عيادات (+${EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪ سنوياً)`}
      </Button>
    </div>
  );
}
