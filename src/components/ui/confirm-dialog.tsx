"use client";

import { useCallback, useState } from "react";
import IconLoader from "@/components/icon/icon-loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = useCallback(async () => {
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      /* يبقى الحوار مفتوحاً — المعالجة في الصفحة (toast وغيره) */
    } finally {
      setPending(false);
    }
  }, [onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className={cn("sm:max-w-[420px] gap-0 overflow-hidden p-0")} dir="rtl">
        <div
          className={cn(
            "px-6 pt-6 pb-4",
            variant === "destructive" && "border-b border-red-100 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/25",
          )}
        >
          <DialogHeader className="text-right space-y-2 sm:text-right">
            <DialogTitle className="text-right text-xl">{title}</DialogTitle>
            <DialogDescription className="text-right text-base leading-relaxed text-gray-600 dark:text-slate-300">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/40 sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={pending}
            className={cn(variant === "destructive" && "min-w-[100px]")}
            onClick={() => void handleConfirm()}
          >
            {pending ? <IconLoader className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
