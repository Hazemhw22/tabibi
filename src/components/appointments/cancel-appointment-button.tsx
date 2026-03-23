"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconXCircle from "@/components/icon/icon-x-circle";
import IconLoader from "@/components/icon/icon-loader";
import IconExclamationTriangle from "@/components/icon/icon-exclamation-triangle";
import IconTrash from "@/components/icon/icon-trash";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Props = {
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  /** عرض الزر كأيقونة فقط (للجدول) */
  iconOnly?: boolean;
};

export function CancelAppointmentButton({ appointmentId, appointmentDate, startTime, iconOnly }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleConfirmCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم إلغاء الموعد");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error || "فشل الإلغاء");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={loading}
          title="إلغاء الموعد"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setOpen(true)}
          disabled={loading}
        >
          <IconXCircle className="h-3.5 w-3.5" />
          إلغاء الموعد
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-gray-200 shadow-xl">
          <DialogHeader className="text-right">
            <div className="flex items-center gap-3 justify-end mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <IconExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl text-gray-900">
                تأكيد إلغاء الموعد
              </DialogTitle>
            </div>
            <DialogDescription className="text-right text-gray-600">
              هل أنت متأكد من إلغاء هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-end sm:justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              العودة (الإبقاء على الموعد)
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {loading ? (
                <IconLoader className="h-4 w-4 animate-spin" />
              ) : (
                <IconXCircle className="h-4 w-4" />
              )}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
