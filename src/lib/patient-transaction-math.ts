/**
 * منطق موحّد للمعاملات: الخدمات تُخزَّن سالبة، والدفعات موجبة.
 * يدعم البيانات القديمة حيث كانت الخدمات موجبة في قاعدة البيانات.
 */

export function transactionSignedDelta(t: {
  type: string;
  amount: number | null | undefined;
}): number {
  const a = Number(t.amount);
  if (!Number.isFinite(a)) return 0;
  if (t.type === "PAYMENT") return Math.abs(a);
  if (t.type === "SERVICE") return a <= 0 ? a : -Math.abs(a);
  return 0;
}

/** رصيد المريض (موجب = لصالح المريض / دُفع أكثر، سالب = دين) */
export function ledgerBalance(
  transactions: { type: string; amount: number | null | undefined }[],
): number {
  return transactions.reduce((s, t) => s + transactionSignedDelta(t), 0);
}
