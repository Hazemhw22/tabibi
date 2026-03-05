"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PLANS = [
  { value: "basic", label: "أساسي" },
  { value: "premium", label: "بريميوم" },
  { value: "enterprise", label: "مؤسسة" },
] as const;

export default function AdminDoctorActions({
  doctorId,
  subscriptionPlan,
  showSubscription,
}: {
  doctorId: string;
  subscriptionPlan?: string | null;
  showSubscription?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const update = async (payload: { status?: string; subscriptionPlan?: string }) => {
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

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap">
      <Button
        size="sm"
        variant="success"
        onClick={() => update({ status: "APPROVED" })}
        disabled={!!loading}
        className="text-xs h-8"
      >
        {loading === "APPROVED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => update({ status: "REJECTED" })}
        disabled={!!loading}
        className="text-xs h-8"
      >
        {loading === "REJECTED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
      </Button>
      {showSubscription && (
        <select
          value={subscriptionPlan ?? "basic"}
          onChange={(e) => update({ subscriptionPlan: e.target.value })}
          disabled={!!loading}
          className="text-xs h-8 rounded-md border border-gray-300 px-2 bg-white"
        >
          {PLANS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
