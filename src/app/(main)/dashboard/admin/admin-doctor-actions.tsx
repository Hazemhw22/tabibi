"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** خطط الاشتراك: شهري 80، نصف سنة 400، سنة 800 شيكل */
const SUBSCRIPTION_PLANS = [
  { value: "monthly", label: "شهري ₪80", amount: 80 },
  { value: "half_year", label: "نصف سنة ₪400", amount: 400 },
  { value: "yearly", label: "سنة ₪800", amount: 800 },
] as const;

export default function AdminDoctorActions({
  doctorId,
  subscriptionPeriod,
  showSubscription,
  isPending,
}: {
  doctorId: string;
  subscriptionPeriod?: string | null;
  showSubscription?: boolean;
  isPending?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState(subscriptionPeriod ?? "monthly");

  const update = async (payload: { status?: string; subscriptionPeriod?: string }) => {
    const key = payload.status ?? "subscription";
    setLoading(key);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(payload.status === "APPROVED" ? "تم قبول الطبيب" : payload.status === "REJECTED" ? "تم رفض الطبيب" : "تم تحديث الاشتراك");
        router.refresh();
      } else {
        toast.error("حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = () => {
    update({ status: "APPROVED", subscriptionPeriod: selectedPlan });
  };

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      {isPending && (
        <>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            disabled={!!loading}
            className="text-xs h-8 rounded-md border border-gray-300 px-2 bg-white min-w-[120px]"
          >
            {SUBSCRIPTION_PLANS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="success"
            onClick={handleApprove}
            disabled={!!loading}
            className="text-xs h-8"
          >
            {loading === "APPROVED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          </Button>
        </>
      )}
      <Button
        size="sm"
        variant="destructive"
        onClick={() => update({ status: "REJECTED" })}
        disabled={!!loading}
        className="text-xs h-8"
      >
        {loading === "REJECTED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
      </Button>
      {showSubscription && !isPending && (
        <select
          value={subscriptionPeriod ?? "monthly"}
          onChange={(e) => update({ subscriptionPeriod: e.target.value })}
          disabled={!!loading}
          className="text-xs h-8 rounded-md border border-gray-300 px-2 bg-white min-w-[120px]"
        >
          {SUBSCRIPTION_PLANS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
