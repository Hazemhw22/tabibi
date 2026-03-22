"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { EXTRA_CLINIC_ANNUAL_FEE_NIS } from "@/lib/subscription-pricing";

/** خطط الاشتراك للأطباء المستقلين: شهري 80، نصف سنة 400، سنة 800 شيكل */
const SUBSCRIPTION_PLANS = [
  { value: "monthly", label: "شهري ₪80", amount: 80 },
  { value: "half_year", label: "نصف سنة ₪400", amount: 400 },
  { value: "yearly", label: "سنة ₪800", amount: 800 },
] as const;

export default function AdminDoctorActions({
  doctorId,
  subscriptionPeriod,
  status,
  showSubscription,
  isPending,
  medicalCenterId,
  canAddExtraClinics,
}: {
  doctorId: string;
  subscriptionPeriod?: string | null;
  status?: string;
  showSubscription?: boolean;
  isPending?: boolean;
  /** مربوط بمركز طبي: اشتراك تلقائي مع المركز — لا خطط 80/400/800 هنا */
  medicalCenterId?: string | null;
  canAddExtraClinics?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(subscriptionPeriod ?? "monthly");
  const isRejected = status === "REJECTED";
  const isApproved = status === "APPROVED";
  const isCenterDoctor = Boolean(medicalCenterId);

  const update = async (payload: { status?: string; subscriptionPeriod?: string; canAddExtraClinics?: boolean }) => {
    const key =
      payload.canAddExtraClinics === true
        ? "extra_clinic"
        : payload.status ?? payload.subscriptionPeriod ?? "subscription";
    setLoading(key);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        if (payload.canAddExtraClinics) toast.success("تم تفعيل إضافة العيادات الإضافية");
        else if (payload.status === "APPROVED")
          toast.success(isCenterDoctor ? "تم قبول الطبيب (ضمن اشتراك المركز)" : "تم قبول الطبيب");
        else if (payload.status === "REJECTED") toast.success("تم رفض الطبيب");
        else toast.success("تم تحديث الاشتراك");
        router.refresh();
      } else {
        toast.error(j.error ?? "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(null);
    }
  };

  /** طبيب مركز: موافقة بدون اختيار خطة — يُزامَن اشتراكه مع المركز في الخادم */
  const handleApproveCenterDoctor = () => {
    update({ status: "APPROVED" });
  };

  const handleApproveStandalone = () => {
    update({ status: "APPROVED", subscriptionPeriod: selectedPlan });
  };

  const enableExtraClinics = () => {
    void update({ canAddExtraClinics: true });
  };

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
      {/* أطباء المركز المعتمدون: زر السماح بعيادات إضافية فقط (500 ₪/سنة) */}
      {isCenterDoctor && isApproved && (
        <>
          {canAddExtraClinics ? (
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 inline-flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              إضافة عيادات مفعّلة (+{EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪/سنة)
            </span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs h-8 gap-1"
              disabled={!!loading}
              onClick={enableExtraClinics}
              title="تفعيل إضافة عيادة ثانية — رسوم إضافية سنوية"
            >
              {loading === "extra_clinic" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Building2 className="h-3 w-3" />
          )}
              إضافة عيادات (+{EXTRA_CLINIC_ANNUAL_FEE_NIS} ₪/سنة)
            </Button>
          )}
        </>
      )}

      {/* طبيب مستقل معلق/مرفوض: موافقة مع اختيار خطة */}
      {!isCenterDoctor && (isPending || isRejected) && (
        <>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            disabled={!!loading}
            className="text-xs h-8 rounded-md border border-gray-300 px-2 bg-white min-w-[120px]"
          >
            {SUBSCRIPTION_PLANS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="success"
            onClick={handleApproveStandalone}
            disabled={!!loading}
            className="text-xs h-8"
            title="موافق"
          >
            {loading === "APPROVED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          </Button>
        </>
      )}

      {/* طبيب مركز معلق: موافقة بدون خطة + رفض */}
      {isCenterDoctor && (isPending || isRejected) && (
        <Button
          size="sm"
          variant="success"
          onClick={handleApproveCenterDoctor}
          disabled={!!loading}
          className="text-xs h-8 gap-1"
          title="قبول — اشتراك تلقائي مع المركز"
        >
          {loading === "APPROVED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          قبول (مع المركز)
        </Button>
      )}

      {(isPending || isApproved) && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => update({ status: "REJECTED" })}
          disabled={!!loading}
          className="text-xs h-8"
          title="مرفوض"
        >
          {loading === "REJECTED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
        </Button>
      )}

      {/* تعديل الاشتراك — للأطباء المستقلين المعتمدين فقط */}
      {showSubscription && isApproved && !isCenterDoctor && (
        <select
          value={subscriptionPeriod ?? "monthly"}
          onChange={(e) => update({ subscriptionPeriod: e.target.value })}
          disabled={!!loading}
          className="text-xs h-8 rounded-md border border-gray-300 px-2 bg-white min-w-[120px]"
          title="تعديل الاشتراك"
        >
          {SUBSCRIPTION_PLANS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
