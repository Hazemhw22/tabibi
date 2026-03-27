import { cn } from "@/lib/utils";

/** عرض المبلغ مع الإشارة: ‎+₪100 / ‎-₪50 */
export function formatSignedShekel(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "₪0";
  const abs = Math.abs(n);
  if (n > 0) return `+₪${abs}`;
  if (n < 0) return `-₪${abs}`;
  return "₪0";
}

/** موجب أخضر، سالب أحمر، صفر محايد */
export function amountSignedColorClass(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) {
    return "text-slate-600 dark:text-slate-400";
  }
  return n > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
}

export function amountSignedClassName(amount: number, extra?: string): string {
  return cn("font-semibold tabular-nums", amountSignedColorClass(amount), extra);
}
