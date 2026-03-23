"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconXCircle from "@/components/icon/icon-x-circle";
import IconLoader from "@/components/icon/icon-loader";
import IconUsers from "@/components/icon/icon-users";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DoctorActions({
  appointmentId,
  mode = "visit",
}: {
  appointmentId: string;
  mode?: "visit" | "approval";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const updateStatus = async (status: string) => {
    setLoading(status);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success(
          status === "COMPLETED"
            ? "تم تحديد الموعد كمنجز"
            : status === "NO_SHOW"
              ? "تم تحديد المريض كغائب"
              : status === "CONFIRMED"
                ? "تمت الموافقة على الحجز"
                : "تم رفض الحجز"
        );
        router.refresh();
      } else {
        toast.error("حدث خطأ في التحديث");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-1.5">
      {mode === "approval" && (
        <>
          <Button
            size="sm"
            variant="success"
            onClick={() => updateStatus("CONFIRMED")}
            disabled={!!loading}
            className="text-xs gap-1"
          >
            {loading === "CONFIRMED" ? (
              <IconLoader className="h-3 w-3 animate-spin" />
            ) : (
              <IconCircleCheck className="h-3 w-3" />
            )}
            قبول
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => updateStatus("CANCELLED")}
            disabled={!!loading}
            className="text-xs gap-1"
          >
            {loading === "CANCELLED" ? (
              <IconLoader className="h-3 w-3 animate-spin" />
            ) : (
              <IconXCircle className="h-3 w-3" />
            )}
            رفض
          </Button>
        </>
      )}
      {mode === "visit" && (
        <>
      <Button
        size="sm"
        variant="success"
        onClick={() => updateStatus("COMPLETED")}
        disabled={!!loading}
        className="text-xs gap-1"
      >
        {loading === "COMPLETED" ? (
          <IconLoader className="h-3 w-3 animate-spin" />
        ) : (
          <IconCircleCheck className="h-3 w-3" />
        )}
        منجز
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => updateStatus("NO_SHOW")}
        disabled={!!loading}
        className="text-xs gap-1"
      >
        {loading === "NO_SHOW" ? (
          <IconLoader className="h-3 w-3 animate-spin" />
        ) : (
          <IconUsers className="h-3 w-3" />
        )}
        غائب
      </Button>
        </>
      )}
    </div>
  );
}
