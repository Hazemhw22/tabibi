"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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
        {loading === "APPROVED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
        قبول
      </Button>
      <Button size="sm" variant="destructive" onClick={() => update("REJECTED")} disabled={!!loading} className="h-8 px-2.5 gap-1 text-xs">
        {loading === "REJECTED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
        رفض
      </Button>
    </div>
  );
}
