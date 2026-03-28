"use client";

import Link from "next/link";
import IconDollarSignCircle from "@/components/icon/icon-dollar-sign-circle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MonthlyFinanceRow } from "@/lib/doctor-dashboard-monthly-finance";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  series: MonthlyFinanceRow[];
  /** إجمالي التحصيل (كل الفترة) */
  totalEarningsNis: number;
  expensesNis: number;
  receivablesNis: number;
};

function formatNis(n: number): string {
  return `₪${Math.round(n).toLocaleString("ar-EG")}`;
}

function formatAxisTick(v: number): string {
  if (!Number.isFinite(v)) return "0";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}م`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}ألف`;
  return String(Math.round(v));
}

const chartWrap = "rounded-2xl border border-slate-700/80 bg-slate-900 p-4 shadow-sm";
const chartTitle = "text-sm font-bold text-slate-100 text-right mb-1";
const chartSub = "text-[10px] text-slate-500 text-right mb-3 leading-relaxed";

export default function DoctorDashboardFinanceCharts({
  series,
  totalEarningsNis,
  expensesNis,
  receivablesNis,
}: Props) {
  const netApprox = totalEarningsNis - expensesNis;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <IconDollarSignCircle className="h-5 w-5 text-blue-600 shrink-0" />
            نظرة مالية سريعة
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مخططان: التحصيل والأرباح التقريبية (مع المنصة وحصة الحجوزات)، ومصروفات العيادة مقابل تدفق
            المستحقات
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link href="/dashboard/doctor/expenses">
              <IconDollarSignCircle className="h-4 w-4" />
              مصروفات العيادة
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-blue-600">
            <Link href="/dashboard/doctor/reports">التقارير المالية</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
        <span className="text-slate-600 dark:text-slate-400">صافٍ تقريبي (تحصيل − مصروفات العيادة): </span>
        <span
          className={cn(
            "font-bold tabular-nums",
            netApprox >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          )}
        >
          {formatNis(netApprox)}
        </span>
        <span className="text-slate-400 dark:text-slate-500 mx-2">|</span>
        <span className="text-slate-500 dark:text-slate-400 text-xs">
          مستحقات حالية تقريباً: {formatNis(receivablesNis)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* مخطط الأرباح / التحصيل */}
        <div className={chartWrap}>
          <p className={chartTitle}>التحصيل والأرباح التقريبية</p>
          <p className={chartSub}>
            تحصيل إلكتروني عبر المنصة (Stripe)، حصة الطبيب من الحجوزات المكتملة، وإجمالي التحصيل
            (يشمل الدفعات المسجّلة يدوياً)
          </p>
          <div className="h-[260px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisTick}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value: number | string, name: string) => [
                    formatNis(Number(value)),
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: "#cbd5e1" }}>{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="stripeNis"
                  name="تحصيل إلكتروني (المنصة)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="doctorShareNis"
                  name="حصة الطبيب من حجوزات المنصة"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCollectionNis"
                  name="إجمالي التحصيل"
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* مخطط المصروفات والمستحقات */}
        <div className={chartWrap}>
          <p className={chartTitle}>مصروفات العيادة وتدفق المستحقات</p>
          <p className={chartSub}>
            مصروفات مسجّلة في الدفتر، وصافي «خدمات − دفعات» خلال الشهر (تقريب لتغيّر المستحقات)
          </p>
          <div className="h-[260px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisTick}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#475569" }}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value: number | string, name: string) => [
                    formatNis(Number(value)),
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: 8 }}
                  formatter={(value) => <span style={{ color: "#cbd5e1" }}>{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="expensesNis"
                  name="مصروفات العيادة"
                  stroke="#fb7185"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="receivablesFlowNis"
                  name="صافي خدمات − دفعات (تدفق)"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
