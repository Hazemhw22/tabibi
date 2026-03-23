"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconXCircle from "@/components/icon/icon-x-circle";
import IconLoader from "@/components/icon/icon-loader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminDoctorActions({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const update = async (status: "APPROVED" | "REJECTED") => {
    setLoading(status);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "APPROVED" ? "✓ تم قبول الطبيب" : "تم رفض الطبيب");
        router.refresh();
      } else toast.error("حدث خطأ");
    } catch { toast.error("خطأ في الاتصال"); }
    finally { setLoading(null); }
  };

  return (
    <div className="flex gap-1.5 shrink-0">
      <Button size="sm" variant="success" onClick={() => update("APPROVED")} disabled={!!loading} className="h-8 px-2.5 gap-1 text-xs">
        {loading === "APPROVED" ? <IconLoader className="h-3 w-3 animate-spin" /> : <IconCircleCheck className="h-3.5 w-3.5" />}
        قبول
      </Button>
      <Button size="sm" variant="destructive" onClick={() => update("REJECTED")} disabled={!!loading} className="h-8 px-2.5 gap-1 text-xs">
        {loading === "REJECTED" ? <IconLoader className="h-3 w-3 animate-spin" /> : <IconXCircle className="h-3.5 w-3.5" />}
        رفض
      </Button>
    </div>
  );
}
