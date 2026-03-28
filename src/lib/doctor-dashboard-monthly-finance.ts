import { format } from "date-fns";
import { ar } from "date-fns/locale";

export type MonthBucket = { key: string; label: string; start: Date; end: Date };

export function buildLastNMonthBuckets(now: Date, n: number): MonthBucket[] {
  const months: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: format(start, "MMM", { locale: ar }),
      start,
      end,
    });
  }
  return months;
}

function inMonth(d: Date, b: MonthBucket): boolean {
  return d >= b.start && d <= b.end;
}

export type MonthlyFinanceRow = {
  month: string;
  label: string;
  /** دفع إلكتروني عبر المنصة (Stripe) */
  stripeNis: number;
  /** دفعات مسجّلة يدوياً — مرضى المنصة */
  platformRecordedNis: number;
  /** دفعات مسجّلة — العيادة */
  clinicRecordedNis: number;
  /** حصة الطبيب من الحجوزات المكتملة (حسب الرسوم/لقطة العيادة) */
  doctorShareNis: number;
  /** إجمالي التحصيل = Stripe + دفعات مسجّلة */
  totalCollectionNis: number;
  /** مصروفات العيادة من الدفتر */
  expensesNis: number;
  /** صافي تدفق ديون الشهر: خدمات − دفعات (منصة + عيادة) */
  receivablesFlowNis: number;
};

export function aggregateDoctorMonthlyFinance(
  buckets: MonthBucket[],
  input: {
    payments: { amount: number; createdAt: string }[];
    platformTx: { type: string; amount: number; date: string }[];
    clinicTx: { type: string; amount: number; date: string }[];
    completedAppointments: {
      appointmentDate: string;
      fee?: number | null;
      doctorClinicFeeSnapshot?: number | null;
      medicalCenterId?: string | null;
    }[];
    ledger: { amount: number; occurredAt: string }[];
  },
): MonthlyFinanceRow[] {
  return buckets.map((b) => {
    let stripeNis = 0;
    for (const p of input.payments) {
      const d = new Date(p.createdAt);
      if (inMonth(d, b)) stripeNis += p.amount;
    }

    let platformRecordedNis = 0;
    let platformService = 0;
    for (const t of input.platformTx) {
      const d = new Date(t.date);
      if (!inMonth(d, b)) continue;
      const abs = Math.abs(t.amount);
      if (t.type === "PAYMENT") platformRecordedNis += abs;
      if (t.type === "SERVICE") platformService += abs;
    }

    let clinicRecordedNis = 0;
    let clinicService = 0;
    for (const t of input.clinicTx) {
      const d = new Date(t.date);
      if (!inMonth(d, b)) continue;
      const abs = Math.abs(t.amount);
      if (t.type === "PAYMENT") clinicRecordedNis += abs;
      if (t.type === "SERVICE") clinicService += abs;
    }

    let doctorShareNis = 0;
    for (const a of input.completedAppointments) {
      const d = new Date(a.appointmentDate);
      if (!inMonth(d, b)) continue;
      const share = a.medicalCenterId
        ? Number(a.doctorClinicFeeSnapshot ?? 0)
        : Number(a.fee ?? 0);
      doctorShareNis += share;
    }

    let expensesNis = 0;
    for (const row of input.ledger) {
      const d = new Date(row.occurredAt);
      if (inMonth(d, b)) expensesNis += Number(row.amount ?? 0);
    }

    const totalCollectionNis = stripeNis + platformRecordedNis + clinicRecordedNis;
    const receivablesFlowNis =
      platformService + clinicService - platformRecordedNis - clinicRecordedNis;

    return {
      month: b.key,
      label: b.label,
      stripeNis,
      platformRecordedNis,
      clinicRecordedNis,
      doctorShareNis,
      totalCollectionNis,
      expensesNis,
      receivablesFlowNis,
    };
  });
}
