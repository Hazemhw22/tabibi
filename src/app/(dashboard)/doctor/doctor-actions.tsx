"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, UserX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  appointmentId: string;
  type: "clinic" | "platform";
}

export default function DoctorActions({ appointmentId, type }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const update = async (status: string) => {
    setLoading(status);
    const endpoint = type === "clinic"
      ? `/api/clinic/appointments/${appointmentId}`
      : `/api/appointments/${appointmentId}`;

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "COMPLETED" ? "تم تحديد الموعد كمنجز ✓" : "تم تحديد المريض كغائب");
        router.refresh();
      } else {
        toast.error("حدث خطأ في التحديث");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1.5 shrink-0">
      <Button size="sm" variant="success" onClick={() => update("COMPLETED")} disabled={!!loading} className="text-xs h-7 px-2 gap-1">
        {loading === "COMPLETED" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
        منجز
      </Button>
      <Button size="sm" variant="destructive" onClick={() => update("NO_SHOW")} disabled={!!loading} className="text-xs h-7 px-2 gap-1">
        {loading === "NO_SHOW" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
        غائب
      </Button>
    </div>
  );
}
