"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useMemo, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import IconPlus from "@/components/icon/icon-plus";
import IconSearch from "@/components/icon/icon-search";
import IconX from "@/components/icon/icon-x";
import IconUsers from "@/components/icon/icon-users";
import IconLoader from "@/components/icon/icon-loader";
import IconUser from "@/components/icon/icon-user";
import IconCalendar from "@/components/icon/icon-calendar";
import IconTrendingUp from "@/components/icon/icon-trending-up";
import IconTrendingDown from "@/components/icon/icon-trending-down";
import IconDocument from "@/components/icon/icon-document";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconClock from "@/components/icon/icon-clock";
import IconXCircle from "@/components/icon/icon-x-circle";
import IconTrash from "@/components/icon/icon-trash";
import IconPhone from "@/components/icon/icon-phone";
import IconExclamationTriangle from "@/components/icon/icon-exclamation-triangle";
import IconHeart from "@/components/icon/icon-heart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClinicPatientPhoneLookupField } from "@/components/clinic-patient-phone-lookup";
import { transactionSignedDelta } from "@/lib/patient-transaction-math";
import { MedicalFilesCarePlanTable } from "@/components/doctor-care-plans/medical-files-care-plan-table";
import type { CarePlanType } from "@/lib/specialty-plan-registry";

/* ─── Types ──────────────────────────────────────────────────────── */
type PatientListItem = {
  id: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  fileNumber?: string | null;
  createdAt: Date;
  _count: { clinicAppointments: number; transactions: number };
  balance: number;
};

type TransactionRow = {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: Date | string;
  notes?: string | null;
};

type AppointmentRow = {
  id: string;
  title: string;
  date: Date | string;
  time: string;
  duration: number;
  status: string;
  notes?: string | null;
};

type PatientDetail = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  notes?: string | null;
  fileNumber?: string | null;
  transactions: TransactionRow[];
  clinicAppointments: AppointmentRow[];
  balance: number;
};

type Props = {
  initialPatients: PatientListItem[];
  initialQ?: string;
  selectedPatient: PatientDetail | null;
  selectedId: string | null;
};

/* ─── Constants ──────────────────────────────────────────────────── */
const TABS = [
  { id: "info",         label: "البيانات",       icon: IconUser },
  { id: "visits",       label: "سجل الزيارات",   icon: IconCalendar },
  { id: "transactions", label: "المعاملات",       icon: IconTrendingUp },
  { id: "medical",      label: "الملفات الطبية", icon: IconDocument },
];

const APT_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SCHEDULED: { label: "مجدول",  color: "text-blue-600 bg-blue-50",   icon: IconClock },
  COMPLETED: { label: "منجز",   color: "text-green-600 bg-green-50", icon: IconCircleCheck },
  CANCELLED: { label: "ملغي",   color: "text-red-500 bg-red-50",     icon: IconXCircle },
  NO_SHOW:   { label: "غائب",   color: "text-yellow-600 bg-yellow-50", icon: IconXCircle },
};

/* ─── Component ──────────────────────────────────────────────────── */
const DEFAULT_CARE_PLAN: CarePlanType = "GENERIC";

export default function PatientsView({
  initialPatients,
  initialQ = "",
  selectedPatient,
  selectedId,
}: Props) {
  const { data: session } = useSession();
  const router    = useRouter();
  const pathname  = usePathname();
  const [, startTransition] = useTransition();

  /* list */
  const [search, setSearch] = useState(initialQ);

  /* tabs */
  const [activeTab, setActiveTab] = useState("info");

  /* add-patient modal */
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading,   setAddLoading]   = useState(false);
  const [addExistingUserId, setAddExistingUserId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    name: "", email: "", whatsapp: "", gender: "",
    dateOfBirth: "", address: "", bloodType: "",
    allergies: "", notes: "", fileNumber: "",
  });

  /* add service */
  const [addingService,  setAddingService]  = useState(false);
  const [serviceDesc,    setServiceDesc]    = useState("");
  const [serviceAmount,  setServiceAmount]  = useState("");
  const [serviceNotes,   setServiceNotes]   = useState("");
  const [savingService,  setSavingService]  = useState(false);

  /* add payment */
  const [addingPayment,  setAddingPayment]  = useState(false);
  const [paymentDesc,    setPaymentDesc]    = useState("دفعة نقدية");
  const [paymentAmount,  setPaymentAmount]  = useState("");
  const [paymentNotes,   setPaymentNotes]   = useState("");
  const [savingPayment,  setSavingPayment]  = useState(false);

  /* add appointment */
  const [addingApt,   setAddingApt]   = useState(false);
  const [aptTitle,    setAptTitle]    = useState("");
  const [aptDate,     setAptDate]     = useState("");
  const [aptTime,     setAptTime]     = useState("09:00");
  const [aptDuration, setAptDuration] = useState("30");
  const [aptNotes,    setAptNotes]    = useState("");
  const [savingApt,   setSavingApt]   = useState(false);
  const [hasCarePlanSummary, setHasCarePlanSummary] = useState(false);
  const onCarePlanSummaryLoaded = useCallback((has: boolean) => {
    setHasCarePlanSummary(has);
  }, []);

  /* reset tab on patient change */
  useEffect(() => {
    setActiveTab("info");
    setHasCarePlanSummary(false);
  }, [selectedId]);

  const setAdd = (k: string, v: string) => setAddForm((p) => ({ ...p, [k]: v }));

  /* filter patients client-side */
  const filtered = useMemo(() => {
    if (!search.trim()) return initialPatients;
    const q = search.toLowerCase().trim();
    return initialPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.whatsapp ?? "").includes(q) ||
        (p.fileNumber ?? "").toLowerCase().includes(q),
    );
  }, [initialPatients, search]);

  /* ── Navigation ─────────────────────────────────── */
  const handleSearch = (v: string) => {
    setSearch(v);
    const params = new URLSearchParams();
    if (v) params.set("q", v);
    if (selectedId) params.set("id", selectedId);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const openPatient = (id: string) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("id", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  /* ── Add patient ────────────────────────────────── */
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error("الاسم مطلوب"); return; }
    setAddLoading(true);
    try {
      const res  = await fetch("/api/clinic/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          ...(addExistingUserId ? { existingUserId: addExistingUserId } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم إضافة المريض بنجاح ✓");
        setAddModalOpen(false);
        setAddExistingUserId(null);
        setAddForm({ name:"",email:"",whatsapp:"",gender:"",dateOfBirth:"",address:"",bloodType:"",allergies:"",notes:"",fileNumber:"" });
        router.refresh();
        if (data.patient?.id) openPatient(data.patient.id);
      } else { toast.error(data.error || "حدث خطأ"); }
    } catch { toast.error("خطأ في الاتصال"); }
    finally  { setAddLoading(false); }
  };

  /* ── Transactions / appointments ────────────────── */
  const saveService = async () => {
    if (!serviceDesc || !serviceAmount) { toast.error("الاسم والمبلغ مطلوبان"); return; }
    setSavingService(true);
    try {
      const res = await fetch(`/api/clinic/patients/${selectedPatient!.id}/transactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type:"SERVICE", description:serviceDesc, amount:Number(serviceAmount), notes:serviceNotes }),
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
      const res = await fetch(`/api/clinic/patients/${selectedPatient!.id}/transactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type:"PAYMENT", description:paymentDesc, amount:Number(paymentAmount), notes:paymentNotes }),
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
      const res = await fetch(`/api/clinic/patients/${selectedPatient!.id}/appointments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title:aptTitle, date:aptDate, time:aptTime, duration:Number(aptDuration), notes:aptNotes }),
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

  /* ── Derived ─────────────────────────────────────── */
  const age = selectedPatient?.dateOfBirth != null
    ? differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth))
    : null;

  const services      = selectedPatient?.transactions.filter((t) => t.type === "SERVICE") ?? [];
  const payments      = selectedPatient?.transactions.filter((t) => t.type === "PAYMENT") ?? [];
  const totalServices = services.reduce((s, t) => s + transactionSignedDelta(t), 0);
  const totalPayments = payments.reduce((s, t) => s + transactionSignedDelta(t), 0);
  const lastVisit     = selectedPatient?.clinicAppointments?.[0];

  /* ═════════════════════════════════════════════════════════════════
     RENDER
  ═════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm h-full">

      {/* ══════════════════════════════════════════════════════════
          COLUMN 1 — Patient List (right, appears first in RTL)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex w-60 shrink-0 flex-col border-l border-gray-200 bg-white">

        {/* top bar */}
        <div className="shrink-0 space-y-2 border-b border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtered.length} مريض</span>
            <button
              type="button"
              onClick={() => {
                setAddExistingUserId(null);
                setAddForm({
                  name: "",
                  email: "",
                  whatsapp: "",
                  gender: "",
                  dateOfBirth: "",
                  address: "",
                  bloodType: "",
                  allergies: "",
                  notes: "",
                  fileNumber: "",
                });
                setAddModalOpen(true);
              }}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <IconPlus className="h-3.5 w-3.5" /> إضافة
            </button>
          </div>
          <div className="relative">
            <IconSearch className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="بحث عن مريض..."
              className="h-9 w-full rounded-lg border border-gray-200 pr-8 pl-8 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <IconX className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <li className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
              <IconUsers className="h-10 w-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">{search ? "لا توجد نتائج" : "لا يوجد مرضى بعد"}</p>
            </li>
          ) : (
            filtered.map((p) => {
              const active = selectedId === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => openPatient(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-right transition-colors",
                      active ? "bg-blue-600" : "hover:bg-gray-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500",
                      )}
                    >
                      <IconUser className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", active ? "text-white" : "text-gray-900")}>
                        {p.name}
                      </p>
                      <p className={cn("truncate text-xs", active ? "text-blue-100" : "text-gray-400")}>
                        {p.fileNumber ? `ملف #${p.fileNumber}` : p.phone || "—"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* ══════════════════════════════════════════════════════════
          COLUMN 2 — Patient Details (center)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/40 min-w-0">
        {selectedPatient ? (
          <>
            {/* ── Header card ─────────────────────────────────── */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4 space-y-4">

              {/* Avatar + name + inline info */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-xl font-bold text-blue-600">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedPatient.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    {age != null && <span>العمر: {age} سنة</span>}
                    {selectedPatient.phone && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <IconPhone className="h-3.5 w-3.5 text-gray-400" />
                        {selectedPatient.phone}
                      </span>
                    )}
                    {selectedPatient.allergies && (
                      <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <IconExclamationTriangle className="h-3.5 w-3.5" />
                        {selectedPatient.allergies}
                      </span>
                    )}
                    {selectedPatient.gender && (
                      <span>{selectedPatient.gender === "male" ? "ذكر" : "أنثى"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 quick-info cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="text-xs text-gray-400 mb-0.5">آخر زيارة</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {lastVisit ? format(new Date(lastVisit.date), "d MMM yyyy") : "—"}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5",
                    selectedPatient.balance < 0
                      ? "border-red-200 bg-red-50"
                      : selectedPatient.balance > 0
                        ? "border-green-200 bg-green-50"
                        : "border-gray-100 bg-gray-50",
                  )}
                >
                  <div className="text-xs text-gray-400 mb-0.5">الرصيد</div>
                  <div
                    className={cn(
                      "text-sm font-bold",
                      selectedPatient.balance < 0
                        ? "text-red-600"
                        : selectedPatient.balance > 0
                          ? "text-green-600"
                          : "text-gray-700",
                    )}
                  >
                    {selectedPatient.balance >= 0 ? "+" : ""}₪{selectedPatient.balance.toFixed(0)}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="text-xs text-gray-400 mb-0.5">الأدوية الحالية</div>
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {selectedPatient.notes || "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="text-xs text-gray-400 mb-0.5">عدد الزيارات</div>
                  <div className="text-sm font-bold text-gray-800">
                    {selectedPatient.clinicAppointments.length}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tab content ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ── INFO ───────────────────────────────── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">معلومات المريض</h3>
                  <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-50 overflow-hidden">
                    {(
                      [
                        { label: "الرقم الطبي",    value: selectedPatient.fileNumber },
                        { label: "الجنس",           value: selectedPatient.gender === "male" ? "ذكر" : selectedPatient.gender === "female" ? "أنثى" : null },
                        { label: "تاريخ الميلاد",   value: selectedPatient.dateOfBirth ? format(new Date(selectedPatient.dateOfBirth), "dd/MM/yyyy") : null },
                        { label: "فصيلة الدم",      value: selectedPatient.bloodType },
                        { label: "العنوان",          value: selectedPatient.address },
                        { label: "البريد الإلكتروني", value: selectedPatient.email },
                        { label: "رقم الهاتف",      value: selectedPatient.phone },
                      ] as { label: string; value: string | null | undefined }[]
                    )
                      .filter((f) => f.value)
                      .map((field) => (
                        <div key={field.label} className="flex items-center justify-between px-5 py-3 text-sm">
                          <span className="text-gray-400">{field.label}</span>
                          <span className="font-medium text-gray-900">{field.value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ── VISITS ─────────────────────────────── */}
              {activeTab === "visits" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      سجل الزيارات ({selectedPatient.clinicAppointments.length})
                    </h3>
                    {!addingApt && (
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setAddingApt(true)}
                        className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <IconPlus className="h-3.5 w-3.5" /> موعد جديد
                      </Button>
                    )}
                  </div>

                  {addingApt && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                      <input
                        placeholder="عنوان الموعد..."
                        value={aptTitle} onChange={(e) => setAptTitle(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        <select value={aptDuration} onChange={(e) => setAptDuration(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                          {[15,20,30,45,60,90].map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
                        </select>
                      </div>
                      <input
                        placeholder="ملاحظات" value={aptNotes} onChange={(e) => setAptNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveApt} disabled={savingApt}>
                          {savingApt ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingApt(false)}>إلغاء</Button>
                      </div>
                    </div>
                  )}

                  {selectedPatient.clinicAppointments.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
                      لا توجد زيارات مسجّلة
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPatient.clinicAppointments.map((apt) => {
                        const cfg  = APT_STATUS[apt.status] ?? APT_STATUS.SCHEDULED;
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={apt.id}
                            className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:border-blue-100 transition-colors"
                          >
                            <div className="min-w-[52px] text-center">
                              <div className="text-xs font-bold text-gray-700">{format(new Date(apt.date), "dd/MM")}</div>
                              <div className="text-xs text-blue-500">{apt.time}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{apt.title}</p>
                              <p className="text-xs text-gray-400">{apt.duration} دقيقة{apt.notes ? ` · ${apt.notes}` : ""}</p>
                            </div>
                            <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", cfg.color)}>
                              <Icon className="h-3 w-3" />{cfg.label}
                            </span>
                            {apt.status === "SCHEDULED" && (
                              <div className="flex gap-1">
                                <button onClick={() => updateAptStatus(apt.id, "COMPLETED")}
                                  className="rounded p-1.5 text-gray-300 hover:bg-green-50 hover:text-green-500 transition-colors">
                                  <IconCircleCheck className="h-4 w-4" />
                                </button>
                                <button onClick={() => updateAptStatus(apt.id, "CANCELLED")}
                                  className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors">
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
              )}

              {/* ── TRANSACTIONS ───────────────────────── */}
              {activeTab === "transactions" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">
                      <div className="text-xs text-red-400">الخدمات (دين)</div>
                      <div className="text-base font-bold text-red-600 mt-0.5">₪{totalServices.toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-center">
                      <div className="text-xs text-green-400">الدفعات</div>
                      <div className="text-base font-bold text-green-600 mt-0.5">₪{totalPayments.toFixed(0)}</div>
                    </div>
                    <div className={cn(
                      "rounded-xl border px-4 py-3 text-center",
                      selectedPatient.balance < 0 ? "border-red-100 bg-red-50" : "border-green-100 bg-green-50"
                    )}>
                      <div className="text-xs text-gray-400">الرصيد</div>
                      <div className={cn("text-base font-bold mt-0.5", selectedPatient.balance < 0 ? "text-red-600" : "text-green-600")}>
                        {selectedPatient.balance >= 0 ? "+" : ""}₪{selectedPatient.balance.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!addingService && (
                      <Button size="sm" variant="outline"
                        onClick={() => setAddingService(true)}
                        className="gap-1 border-red-200 text-red-600 hover:bg-red-50">
                        <IconPlus className="h-3.5 w-3.5" /> خدمة جديدة
                      </Button>
                    )}
                    {!addingPayment && (
                      <Button size="sm" variant="outline"
                        onClick={() => setAddingPayment(true)}
                        className="gap-1 border-green-200 text-green-600 hover:bg-green-50">
                        <IconPlus className="h-3.5 w-3.5" /> تسجيل دفعة
                      </Button>
                    )}
                  </div>

                  {addingService && (
                    <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-red-700">إضافة خدمة</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="اسم الخدمة..." value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                        <div className="flex gap-1">
                          <span className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-sm text-gray-600">₪</span>
                          <input type="number" placeholder="المبلغ" value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                        </div>
                      </div>
                      <input placeholder="ملاحظات" value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveService} disabled={savingService} className="bg-red-600 hover:bg-red-700">
                          {savingService ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingService(false)}>إلغاء</Button>
                      </div>
                    </div>
                  )}

                  {addingPayment && (
                    <div className="rounded-xl border border-green-200 bg-green-50/30 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-green-700">تسجيل دفعة</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="وصف الدفعة..." value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                        <div className="flex gap-1">
                          <span className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-sm text-gray-600">₪</span>
                          <input type="number" placeholder="المبلغ" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                        </div>
                      </div>
                      <input placeholder="ملاحظات" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={savePayment} disabled={savingPayment} className="bg-green-600 hover:bg-green-700">
                          {savingPayment ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingPayment(false)}>إلغاء</Button>
                      </div>
                    </div>
                  )}

                  {selectedPatient.transactions.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
                      لا توجد معاملات مسجّلة
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white -mx-2 px-2 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
                          <tr>
                            <th className="px-4 py-3 font-medium">التاريخ</th>
                            <th className="px-4 py-3 font-medium">البيان</th>
                            <th className="px-4 py-3 font-medium text-red-500">ديون</th>
                            <th className="px-4 py-3 font-medium text-green-600">دفعات</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedPatient.transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50/50">
                              <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                                {format(new Date(t.date), "dd/MM/yyyy")}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {t.type === "SERVICE"
                                    ? <IconTrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />
                                    : <IconTrendingUp   className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                                  <span className="font-medium text-gray-900">{t.description}</span>
                                </div>
                                {t.notes && <p className="mr-5 mt-0.5 text-xs text-gray-400">{t.notes}</p>}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-red-600">
                                {t.type === "SERVICE" ? `-₪${Math.abs(Number(t.amount)).toFixed(0)}` : "—"}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">
                                {t.type === "PAYMENT" ? `₪${Math.abs(Number(t.amount)).toFixed(0)}` : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => deleteTransaction(t.id)}
                                  className="text-gray-200 hover:text-red-400 transition-colors"
                                >
                                  <IconTrash className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── MEDICAL ────────────────────────────── */}
              {activeTab === "medical" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">الملفات الطبية</h3>

                  <MedicalFilesCarePlanTable
                    patientId={selectedPatient.id}
                    patientSource="clinic"
                    carePlanType={DEFAULT_CARE_PLAN}
                    patientName={selectedPatient.name}
                    doctorDisplayName={session?.user?.name ?? ""}
                    patientPrintDemographics={{
                      fileNumber: selectedPatient.fileNumber,
                      gender: selectedPatient.gender,
                      dateOfBirth: selectedPatient.dateOfBirth
                        ? selectedPatient.dateOfBirth instanceof Date
                          ? selectedPatient.dateOfBirth.toISOString()
                          : String(selectedPatient.dateOfBirth)
                        : null,
                      guardian: null,
                    }}
                    onPlanLoaded={onCarePlanSummaryLoaded}
                  />

                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                    {selectedPatient.allergies && (
                      <div className="flex items-start gap-3 px-5 py-4">
                        <IconExclamationTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 mb-1">الحساسيات والتنبيهات</div>
                          <div className="text-sm text-gray-600">{selectedPatient.allergies}</div>
                        </div>
                      </div>
                    )}
                    {selectedPatient.notes && (
                      <div className="flex items-start gap-3 px-5 py-4">
                        <IconDocument className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 mb-1">ملاحظات طبية</div>
                          <div className="text-sm text-gray-600">{selectedPatient.notes}</div>
                        </div>
                      </div>
                    )}
                    {!selectedPatient.allergies && !selectedPatient.notes && !hasCarePlanSummary && (
                      <div className="py-12 text-center text-sm text-gray-400">
                        <IconHeart className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                        لا توجد ملفات طبية
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-300">
            <IconUsers className="mb-4 h-16 w-16" />
            <p className="text-sm">اختر مريضاً من القائمة</p>
            <p className="mt-1 text-xs">أو أضف مريضاً جديداً</p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          COLUMN 3 — Vertical Tabs (left, appears last in RTL)
      ══════════════════════════════════════════════════════════ */}
      <div className="flex w-44 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="shrink-0 border-b border-gray-100 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">القائمة</span>
        </div>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={!selectedPatient}
            onClick={() => selectedPatient && setActiveTab(tab.id)}
            className={cn(
              "flex w-full items-center gap-3 border-r-[3px] px-4 py-4 text-right text-sm font-medium transition-colors",
              !selectedPatient
                ? "cursor-not-allowed border-transparent text-gray-300"
                : activeTab === tab.id
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          ADD PATIENT MODAL
      ══════════════════════════════════════════════════════════ */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">إضافة مريض جديد</h2>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="الاسم الكامل *" placeholder="محمد أحمد" value={addForm.name} onChange={(e) => setAdd("name", e.target.value)} />
                <Input label="رقم الملف" placeholder="001" value={addForm.fileNumber} onChange={(e) => setAdd("fileNumber", e.target.value)} />
              </div>
              <ClinicPatientPhoneLookupField
                whatsapp={addForm.whatsapp}
                onWhatsappChange={(v) => setAdd("whatsapp", v)}
                onSelectUser={(u) => {
                  setAddForm((p) => ({
                    ...p,
                    name: u.name?.trim() || p.name,
                    email: u.email || "",
                  }));
                  setAddExistingUserId(u.id);
                }}
                existingUserId={addExistingUserId}
                onClearExistingUser={() => setAddExistingUserId(null)}
              />
              <Input label="البريد الإلكتروني" type="email" placeholder="email@example.com" value={addForm.email} onChange={(e) => setAdd("email", e.target.value)} dir="ltr" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الجنس</label>
                  <select value={addForm.gender} onChange={(e) => setAdd("gender", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">-- اختر --</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <Input label="تاريخ الميلاد" type="date" value={addForm.dateOfBirth} onChange={(e) => setAdd("dateOfBirth", e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">فصيلة الدم</label>
                  <select value={addForm.bloodType} onChange={(e) => setAdd("bloodType", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">-- اختر --</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <Input label="العنوان" placeholder="الخليل، حي البلد" value={addForm.address} onChange={(e) => setAdd("address", e.target.value)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الحساسيات / التنبيهات</label>
                <input
                  placeholder="مثل: حساسية من البنسلين..."
                  value={addForm.allergies} onChange={(e) => setAdd("allergies", e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات / أدوية حالية</label>
                <textarea
                  value={addForm.notes} onChange={(e) => setAdd("notes", e.target.value)}
                  rows={2} placeholder="أي معلومات إضافية أو أدوية حالية..."
                  className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={addLoading}>
                  {addLoading ? <><IconLoader className="ml-2 h-4 w-4 animate-spin" />جاري الحفظ...</> : "إضافة المريض"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>إلغاء</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
