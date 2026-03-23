"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import IconUser from "@/components/icon/icon-user";
import IconCalendar from "@/components/icon/icon-calendar";
import IconPlus from "@/components/icon/icon-plus";
import IconTrash from "@/components/icon/icon-trash";
import IconLoader from "@/components/icon/icon-loader";
import IconTrendingDown from "@/components/icon/icon-trending-down";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconClock from "@/components/icon/icon-clock";
import IconXCircle from "@/components/icon/icon-x-circle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string; type: string; description: string;
  amount: number; date: string | Date; notes?: string | null;
}

interface Appointment {
  id: string; title: string; date: string | Date;
  time: string; duration: number; status: string; notes?: string | null;
}

interface Patient {
  id: string; name: string; phone?: string | null; email?: string | null;
  gender?: string | null; dateOfBirth?: Date | string | null; address?: string | null;
  bloodType?: string | null; allergies?: string | null; notes?: string | null;
  fileNumber?: string | null;
}

interface Props {
  patient: Patient;
  transactions: Transaction[];
  appointments: Appointment[];
  balance: number;
}

const tabs = [
  { id: "info", label: "المعلومات", icon: IconUser },
  { id: "services", label: "الخدمات", icon: IconUser },
  { id: "history", label: "الحركات", icon: IconClock },
  { id: "manage", label: "مواعيد ودفعات", icon: IconCalendar },
];

const APT_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SCHEDULED: { label: "مجدول", color: "text-blue-600 bg-blue-50", icon: IconClock },
  COMPLETED: { label: "منجز", color: "text-green-600 bg-green-50", icon: IconCircleCheck },
  CANCELLED: { label: "ملغي", color: "text-red-500 bg-red-50", icon: IconXCircle },
  NO_SHOW: { label: "غائب", color: "text-yellow-600 bg-yellow-50", icon: IconXCircle },
};

export default function PatientTabs({ patient, transactions, appointments, balance }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("info");

  // Services tab state
  const [addingService, setAddingService] = useState(false);
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [savingService, setSavingService] = useState(false);

  // Payment state
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentDesc, setPaymentDesc] = useState("دفعة نقدية");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Appointment state
  const [addingApt, setAddingApt] = useState(false);
  const [aptTitle, setAptTitle] = useState("");
  const [aptDate, setAptDate] = useState("");
  const [aptTime, setAptTime] = useState("09:00");
  const [aptDuration, setAptDuration] = useState("30");
  const [aptNotes, setAptNotes] = useState("");
  const [savingApt, setSavingApt] = useState(false);

  const services = transactions.filter((t) => t.type === "SERVICE");
  const payments = transactions.filter((t) => t.type === "PAYMENT");

  const totalServices = services.reduce((s, t) => s + t.amount, 0);
  const totalPayments = payments.reduce((s, t) => s + t.amount, 0);

  // Ledger (running balance)
  const ledger = [...transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce<(Transaction & { runningBalance: number })[]>((acc, t) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].runningBalance : 0;
      const delta = t.type === "PAYMENT" ? t.amount : -t.amount;
      return [...acc, { ...t, runningBalance: prev + delta }];
    }, [])
    .reverse();

  const saveService = async () => {
    if (!serviceDesc || !serviceAmount) { toast.error("اسم الخدمة والمبلغ مطلوبان"); return; }
    setSavingService(true);
    try {
      const res = await fetch(`/api/clinic/patients/${patient.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SERVICE", description: serviceDesc, amount: Number(serviceAmount), notes: serviceNotes }),
      });
      if (res.ok) {
        toast.success("تم إضافة الخدمة ✓");
        setAddingService(false); setServiceDesc(""); setServiceAmount(""); setServiceNotes("");
        router.refresh();
      } else { toast.error("حدث خطأ"); }
    } finally { setSavingService(false); }
  };

  const savePayment = async () => {
    if (!paymentAmount) { toast.error("المبلغ مطلوب"); return; }
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/clinic/patients/${patient.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PAYMENT", description: paymentDesc, amount: Number(paymentAmount), notes: paymentNotes }),
      });
      if (res.ok) {
        toast.success("تم تسجيل الدفعة ✓");
        setAddingPayment(false); setPaymentAmount(""); setPaymentNotes("");
        router.refresh();
      } else { toast.error("حدث خطأ"); }
    } finally { setSavingPayment(false); }
  };

  const saveApt = async () => {
    if (!aptTitle || !aptDate || !aptTime) { toast.error("العنوان والتاريخ والوقت مطلوبة"); return; }
    setSavingApt(true);
    try {
      const res = await fetch(`/api/clinic/patients/${patient.id}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: aptTitle, date: aptDate, time: aptTime, duration: Number(aptDuration), notes: aptNotes }),
      });
      if (res.ok) {
        toast.success("تم إضافة الموعد ✓");
        setAddingApt(false); setAptTitle(""); setAptDate(""); setAptNotes("");
        router.refresh();
      } else { toast.error("حدث خطأ"); }
    } finally { setSavingApt(false); }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm("هل تريد حذف هذه المعاملة؟")) return;
    const res = await fetch(`/api/clinic/transactions/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("تم الحذف"); router.refresh(); }
    else toast.error("حدث خطأ");
  };

  const updateAptStatus = async (aptId: string, status: string) => {
    const res = await fetch(`/api/clinic/appointments/${aptId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success("تم التحديث"); router.refresh(); }
    else toast.error("حدث خطأ");
  };

  return (
    <div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Vertical Tab Bar */}
      <nav className="flex shrink-0 flex-col w-48 border-l border-gray-200 bg-gray-50/80">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-right transition-colors border-r-2",
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 bg-blue-50/80"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/80"
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 bg-white p-6 overflow-auto">

        {/* ===== TAB 1: INFO ===== */}
        {activeTab === "info" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "رقم الهاتف", value: patient.phone },
                { label: "البريد الإلكتروني", value: patient.email },
                { label: "العنوان", value: patient.address },
                { label: "فصيلة الدم", value: patient.bloodType },
                { label: "الجنس", value: patient.gender === "male" ? "ذكر" : patient.gender === "female" ? "أنثى" : null },
                {
                  label: "تاريخ الميلاد",
                  value: patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy") : null
                },
              ].filter((f) => f.value).map((field) => (
                <div key={field.label} className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-400 mb-1">{field.label}</div>
                  <div className="text-sm font-medium text-gray-800">{field.value}</div>
                </div>
              ))}
            </div>
            {patient.allergies && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="text-xs text-orange-500 mb-1 font-semibold">⚠️ حساسيات / تنبيهات</div>
                <div className="text-sm text-orange-800">{patient.allergies}</div>
              </div>
            )}
            {patient.notes && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="text-xs text-blue-500 mb-1 font-semibold">ملاحظات</div>
                <div className="text-sm text-blue-800">{patient.notes}</div>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 2: SERVICES ===== */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-xs text-red-400 mb-1">إجمالي الخدمات</div>
                <div className="text-xl font-bold text-red-600">-₪{totalServices.toFixed(0)}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-xs text-green-400 mb-1">إجمالي الدفعات</div>
                <div className="text-xl font-bold text-green-600">+₪{totalPayments.toFixed(0)}</div>
              </div>
              <div className={`rounded-xl p-4 text-center ${balance < 0 ? "bg-red-50" : "bg-green-50"}`}>
                <div className="text-xs text-gray-400 mb-1">الرصيد</div>
                <div className={`text-xl font-bold ${balance < 0 ? "text-red-600" : "text-green-600"}`}>
                  {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Add Service Button */}
            {!addingService ? (
              <Button onClick={() => setAddingService(true)} variant="outline" className="gap-2 border-dashed border-red-300 text-red-600 hover:bg-red-50">
                <IconPlus className="h-4 w-4" /> إضافة خدمة جديدة (دين)
              </Button>
            ) : (
              <div className="border border-red-200 bg-red-50/30 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-red-700 text-sm">خدمة جديدة (سالب - دين)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input placeholder="اسم الخدمة مثل: كشف، علاج..." value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)}
                    className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  <div className="flex gap-2">
                    <span className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 shrink-0">₪</span>
                    <input type="number" placeholder="المبلغ" value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)}
                      className="flex-1 h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
                <input placeholder="ملاحظات (اختياري)" value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveService} disabled={savingService} className="bg-red-600 hover:bg-red-700">
                    {savingService ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : "حفظ الخدمة"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingService(false)}>إلغاء</Button>
                </div>
              </div>
            )}

            {/* Services Table */}
            {services.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">لا توجد خدمات مسجّلة بعد</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 -mx-2 px-2 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-right text-xs text-gray-500">
                      <th className="px-4 py-3 font-medium">التاريخ</th>
                      <th className="px-4 py-3 font-medium">الخدمة</th>
                      <th className="px-4 py-3 font-medium">المبلغ</th>
                      <th className="px-4 py-3 font-medium">ملاحظات</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-red-50/30">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {format(new Date(s.date), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.description}</td>
                        <td className="px-4 py-3 font-bold text-red-600 whitespace-nowrap">
                          -₪{s.amount.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{s.notes || "-"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteTransaction(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50 border-t border-red-100">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-semibold text-red-700 text-sm">المجموع</td>
                      <td className="px-4 py-3 font-bold text-red-700 text-base">-₪{totalServices.toFixed(0)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 3: HISTORY / LEDGER ===== */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <div className="text-xs text-red-400">خدمات</div>
                <div className="font-bold text-red-600">-₪{totalServices.toFixed(0)}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <div className="text-xs text-green-400">دفعات</div>
                <div className="font-bold text-green-600">+₪{totalPayments.toFixed(0)}</div>
              </div>
              <div className={`rounded-xl p-3 text-center ${balance < 0 ? "bg-red-50" : "bg-green-50"}`}>
                <div className="text-xs text-gray-400">الرصيد</div>
                <div className={`font-bold ${balance < 0 ? "text-red-600" : "text-green-600"}`}>
                  {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
                </div>
              </div>
            </div>

            {ledger.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">لا توجد حركات بعد</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 -mx-2 px-2 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-right text-xs text-gray-500">
                      <th className="px-4 py-3 font-medium">التاريخ</th>
                      <th className="px-4 py-3 font-medium">البيان</th>
                      <th className="px-4 py-3 font-medium text-red-500">مدين (−)</th>
                      <th className="px-4 py-3 font-medium text-green-600">دائن (+)</th>
                      <th className="px-4 py-3 font-medium">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledger.map((t) => (
                      <tr key={t.id} className={t.type === "SERVICE" ? "hover:bg-red-50/20" : "hover:bg-green-50/20"}>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {format(new Date(t.date), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {t.type === "SERVICE"
                              ? <IconTrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              : <IconTrendingUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            }
                            <span className="font-medium text-gray-900">{t.description}</span>
                          </div>
                          {t.notes && <div className="text-xs text-gray-400 mt-0.5 mr-5">{t.notes}</div>}
                        </td>
                        <td className="px-4 py-3 font-bold text-red-600 text-center">
                          {t.type === "SERVICE" ? `₪${t.amount.toFixed(0)}` : "-"}
                        </td>
                        <td className="px-4 py-3 font-bold text-green-600 text-center">
                          {t.type === "PAYMENT" ? `₪${t.amount.toFixed(0)}` : "-"}
                        </td>
                        <td className={`px-4 py-3 font-bold text-center ${t.runningBalance < 0 ? "text-red-600" : "text-green-600"}`}>
                          {t.runningBalance >= 0 ? "+" : ""}₪{t.runningBalance.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">الرصيد النهائي</td>
                      <td className="px-4 py-3 font-bold text-red-600 text-center">₪{totalServices.toFixed(0)}</td>
                      <td className="px-4 py-3 font-bold text-green-600 text-center">₪{totalPayments.toFixed(0)}</td>
                      <td className={`px-4 py-3 font-bold text-center text-lg ${balance < 0 ? "text-red-600" : "text-green-600"}`}>
                        {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== TAB 4: MANAGE (Appointments + Payments) ===== */}
        {activeTab === "manage" && (
          <div className="space-y-8">
            {/* === APPOINTMENTS SECTION === */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <IconCalendar className="h-4 w-4 text-blue-600" /> المواعيد
                </h3>
                {!addingApt && (
                  <Button size="sm" onClick={() => setAddingApt(true)} variant="outline" className="gap-1 border-blue-300 text-blue-600 hover:bg-blue-50">
                    <IconPlus className="h-3.5 w-3.5" /> إضافة موعد
                  </Button>
                )}
              </div>

              {addingApt && (
                <div className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3 mb-4">
                  <h4 className="font-semibold text-blue-700 text-sm">موعد جديد</h4>
                  <input placeholder="عنوان الموعد مثل: مراجعة، كشف، علاج..." value={aptTitle} onChange={(e) => setAptTitle(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="grid grid-cols-3 gap-3">
                    <input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)}
                      className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)}
                      className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <select value={aptDuration} onChange={(e) => setAptDuration(e.target.value)}
                      className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {[15,20,30,45,60,90,120].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
                    </select>
                  </div>
                  <input placeholder="ملاحظات (اختياري)" value={aptNotes} onChange={(e) => setAptNotes(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveApt} disabled={savingApt}>
                      {savingApt ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : "حفظ الموعد"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAddingApt(false)}>إلغاء</Button>
                  </div>
                </div>
              )}

              {appointments.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl">لا توجد مواعيد بعد</div>
              ) : (
                <div className="space-y-2">
                  {appointments.map((apt) => {
                    const cfg = APT_STATUS[apt.status] || APT_STATUS.SCHEDULED;
                    const Icon = cfg.icon;
                    return (
                      <div key={apt.id} className="flex items-center gap-4 p-3.5 bg-white border border-gray-100 rounded-xl hover:border-blue-100 transition-colors">
                        <div className="text-center min-w-[56px]">
                          <div className="text-xs font-bold text-gray-700">{format(new Date(apt.date), "dd/MM")}</div>
                          <div className="text-xs text-blue-600 font-medium">{apt.time}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{apt.title}</p>
                          <p className="text-xs text-gray-400">{apt.duration} دقيقة{apt.notes ? ` • ${apt.notes}` : ""}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                          <Icon className="h-3 w-3" />{cfg.label}
                        </div>
                        {apt.status === "SCHEDULED" && (
                          <div className="flex gap-1">
                            <button onClick={() => updateAptStatus(apt.id, "COMPLETED")} title="منجز"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-green-500 hover:bg-green-50 transition-colors">
                              <IconCircleCheck className="h-4 w-4" />
                            </button>
                            <button onClick={() => updateAptStatus(apt.id, "CANCELLED")} title="ملغي"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <IconXCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* === PAYMENTS SECTION === */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <IconTrendingUp className="h-4 w-4 text-green-600" />
                  الدفعات
                  <span className={`text-sm font-bold mr-2 ${balance < 0 ? "text-red-500" : "text-green-600"}`}>
                    (الرصيد: {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)})
                  </span>
                </h3>
                {!addingPayment && (
                  <Button size="sm" onClick={() => setAddingPayment(true)} variant="outline" className="gap-1 border-green-300 text-green-600 hover:bg-green-50">
                    <IconPlus className="h-3.5 w-3.5" /> إضافة دفعة
                  </Button>
                )}
              </div>

              {addingPayment && (
                <div className="border border-green-200 bg-green-50/30 rounded-xl p-4 space-y-3 mb-4">
                  <h4 className="font-semibold text-green-700 text-sm">تسجيل دفعة (موجب)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="وصف الدفعة مثل: دفعة نقدية..." value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)}
                      className="h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <div className="flex gap-2">
                      <span className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 shrink-0">₪</span>
                      <input type="number" placeholder="المبلغ" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                        className="flex-1 h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <input placeholder="ملاحظات (اختياري)" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={savePayment} disabled={savingPayment} className="bg-green-600 hover:bg-green-700">
                      {savingPayment ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : "تسجيل الدفعة"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAddingPayment(false)}>إلغاء</Button>
                  </div>
                </div>
              )}

              {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl">لا توجد دفعات مسجّلة</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 -mx-2 px-2 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-right text-xs text-gray-500">
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium">الوصف</th>
                        <th className="px-4 py-3 font-medium">المبلغ</th>
                        <th className="px-4 py-3 font-medium">ملاحظات</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-green-50/30">
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {format(new Date(p.date), "dd/MM/yyyy")}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{p.description}</td>
                          <td className="px-4 py-3 font-bold text-green-600">+₪{p.amount.toFixed(0)}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{p.notes || "-"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => deleteTransaction(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-green-50 border-t border-green-100">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-semibold text-green-700 text-sm">الإجمالي</td>
                        <td className="px-4 py-3 font-bold text-green-700">+₪{totalPayments.toFixed(0)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
