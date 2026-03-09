"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useMemo, useEffect } from "react";
import {
  Plus, Search, X, Users, Loader2,
  User, Calendar, TrendingUp, TrendingDown,
  FileText, CheckCircle, Clock, XCircle, Trash2, Pencil, Check,
  Phone, AlertTriangle, Stethoscope, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PatientListItem, SelectedPatient, AppointmentRow, TransactionRow } from "./page";

/* ─── Tab definitions ────────────────────────────────────────────── */
const TABS = [
  { id: "info",         label: "البيانات",       icon: User },
  { id: "visits",       label: "سجل الزيارات",   icon: Calendar },
  { id: "transactions", label: "المعاملات",       icon: Receipt },
  { id: "medical",      label: "الملفات الطبية", icon: FileText },
];

const APT_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  SCHEDULED:  { label: "مجدول",   color: "text-blue-600 bg-blue-50",    icon: Clock },
  DRAFT:      { label: "مسودة",   color: "text-gray-600 bg-gray-100",   icon: Clock },
  CONFIRMED:  { label: "مؤكد",    color: "text-indigo-600 bg-indigo-50", icon: CheckCircle },
  COMPLETED:  { label: "منجز",    color: "text-green-600 bg-green-50",  icon: CheckCircle },
  CANCELLED:  { label: "ملغي",    color: "text-red-500 bg-red-50",      icon: XCircle },
  NO_SHOW:    { label: "لم يحضر", color: "text-yellow-600 bg-yellow-50", icon: XCircle },
};

/* ─── Props ──────────────────────────────────────────────────────── */
type Props = {
  initialPatients: PatientListItem[];
  initialQ?: string;
  selectedPatient: SelectedPatient | null;
  selectedId: string | null;
  doctorId: string;
  defaultFee: number;
};

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function PatientsView({
  initialPatients,
  initialQ = "",
  selectedPatient,
  selectedId,
  doctorId,
  defaultFee,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  /* ── State ─────────────────────────────────────────────────────── */
  const [search,    setSearch]    = useState(initialQ);
  const [activeTab, setActiveTab] = useState("info");

  /* add-patient modal */
  const [addOpen,    setAddOpen]    = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addForm, setAddForm] = useState({
    name:"", email:"", whatsapp:"", gender:"",
    dateOfBirth:"", address:"", bloodType:"",
    allergies:"", notes:"", fileNumber:"",
  });

  /* edit-patient modal (clinic patients only) */
  const [editOpen,    setEditOpen]    = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name:"", email:"", whatsapp:"", fileNumber:"",
    gender:"", dateOfBirth:"", address:"", bloodType:"",
    allergies:"", notes:"",
  });

  /* add service / payment */
  const [addingService, setAddingService] = useState(false);
  const [serviceDesc,   setServiceDesc]   = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceNotes,  setServiceNotes]  = useState("");
  const [savingService, setSavingService] = useState(false);

  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentDesc,   setPaymentDesc]   = useState("دفعة نقدية");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes,  setPaymentNotes]  = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  /* add appointment */
  const [addingApt,   setAddingApt]   = useState(false);
  const [aptTitle,    setAptTitle]    = useState("");
  const [aptDate,     setAptDate]     = useState("");
  const [aptTime,     setAptTime]     = useState("09:00");
  const [aptDuration, setAptDuration] = useState("30");
  const [aptNotes,    setAptNotes]    = useState("");
  const [savingApt,   setSavingApt]   = useState(false);
  /* platform-specific */
  const [aptEndTime, setAptEndTime] = useState("09:30");
  const [aptFee,     setAptFee]     = useState(String(defaultFee || ""));

  /* reset tab when patient changes */
  useEffect(() => { setActiveTab("info"); }, [selectedId]);

  const setAdd = (k: string, v: string) => setAddForm((p) => ({ ...p, [k]: v }));
  const setEdit = (k: string, v: string) => setEditForm((p) => ({ ...p, [k]: v }));

  /* open edit modal with current patient data */
  const openEdit = () => {
    if (!selectedPatient || selectedPatient.source !== "clinic") return;
    setEditForm({
      name: selectedPatient.name,
      email: selectedPatient.email ?? "",
      whatsapp: selectedPatient.whatsapp ?? "",
      fileNumber: selectedPatient.fileNumber ?? "",
      gender: selectedPatient.gender ?? "",
      dateOfBirth: selectedPatient.dateOfBirth ? (typeof selectedPatient.dateOfBirth === "string" ? selectedPatient.dateOfBirth.slice(0, 10) : format(new Date(selectedPatient.dateOfBirth), "yyyy-MM-dd")) : "",
      address: selectedPatient.address ?? "",
      bloodType: selectedPatient.bloodType ?? "",
      allergies: selectedPatient.allergies ?? "",
      notes: selectedPatient.notes ?? "",
    });
    setEditOpen(true);
  };

  /* ── Edit patient (clinic only) ────────────────────────────────── */
  const handleEditPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || selectedPatient.source !== "clinic") return;
    if (!editForm.name.trim()) { toast.error("الاسم مطلوب"); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/clinic/patients/${selectedPatient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success("تم تحديث بيانات المريض ✓");
        setEditOpen(false);
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || "حدث خطأ");
      }
    } catch {
      toast.error("خطأ في الاتصال");
    } finally {
      setEditLoading(false);
    }
  };

  /* ── Client-side search filter ─────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return initialPatients;
    const q = search.toLowerCase();
    return initialPatients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.whatsapp ?? "").includes(q) ||
        (p.fileNumber ?? "").toLowerCase().includes(q),
    );
  }, [initialPatients, search]);

  /* ── Navigation helpers ────────────────────────────────────────── */
  const openPatient = (p: PatientListItem) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("id", p.id);
    params.set("source", p.source);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    const params = new URLSearchParams();
    if (v) params.set("q", v);
    if (selectedId) params.set("id", selectedId);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  /* ── Add patient ───────────────────────────────────────────────── */
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error("الاسم مطلوب"); return; }
    setAddLoading(true);
    try {
      const res  = await fetch("/api/clinic/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تم إضافة المريض ✓");
        setAddOpen(false);
        setAddForm({ name:"",email:"",whatsapp:"",gender:"",dateOfBirth:"",address:"",bloodType:"",allergies:"",notes:"",fileNumber:"" });
        router.refresh();
        openPatient({ id: data.patient.id, name: data.patient.name, source: "clinic", appointmentCount: 0 });
      } else { toast.error(data.error || "حدث خطأ"); }
    } catch { toast.error("خطأ في الاتصال"); }
    finally  { setAddLoading(false); }
  };

  /* ── Transactions / appointments ───────────────────────────────── */
  const txUrl = (id: string, src: string) =>
    src === "platform"
      ? `/api/doctor/patients/${id}/platform-transactions`
      : `/api/clinic/patients/${id}/transactions`;

  const saveService = async () => {
    if (!serviceDesc || !serviceAmount) { toast.error("الوصف والمبلغ مطلوبان"); return; }
    setSavingService(true);
    try {
      const res = await fetch(txUrl(selectedPatient!.id, selectedPatient!.source), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type:"SERVICE", description:serviceDesc, amount:Number(serviceAmount), notes:serviceNotes || undefined }),
      });
      if (res.ok) {
        toast.success("تم إضافة الخدمة ✓");
        setAddingService(false); setServiceDesc(""); setServiceAmount(""); setServiceNotes("");
        router.refresh();
      } else { const d = await res.json(); toast.error(d.error || "حدث خطأ"); }
    } finally { setSavingService(false); }
  };

  const savePayment = async () => {
    if (!paymentAmount) { toast.error("المبلغ مطلوب"); return; }
    setSavingPayment(true);
    try {
      const res = await fetch(txUrl(selectedPatient!.id, selectedPatient!.source), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type:"PAYMENT", description:paymentDesc, amount:Number(paymentAmount), notes:paymentNotes || undefined }),
      });
      if (res.ok) {
        toast.success("تم تسجيل الدفعة ✓");
        setAddingPayment(false); setPaymentAmount(""); setPaymentNotes("");
        router.refresh();
      } else { const d = await res.json(); toast.error(d.error || "حدث خطأ"); }
    } finally { setSavingPayment(false); }
  };

  const saveApt = async () => {
    if (!selectedPatient) return;
    setSavingApt(true);
    try {
      let res: Response;
      if (selectedPatient.source === "clinic") {
        if (!aptTitle || !aptDate || !aptTime) { toast.error("العنوان والتاريخ والوقت مطلوبة"); setSavingApt(false); return; }
        res = await fetch(`/api/clinic/patients/${selectedPatient.id}/appointments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title:aptTitle, date:aptDate, time:aptTime, duration:Number(aptDuration)||30, notes:aptNotes||undefined }),
        });
      } else {
        if (!aptDate || !aptTime || !aptEndTime) { toast.error("التاريخ ووقت البداية والنهاية مطلوبة"); setSavingApt(false); return; }
        res = await fetch("/api/appointments", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId, patientId:selectedPatient.id, appointmentDate:aptDate, startTime:aptTime, endTime:aptEndTime, fee:Number(aptFee)||defaultFee, notes:aptNotes||undefined }),
        });
      }
      if (res.ok) {
        toast.success("تم إضافة الموعد ✓");
        setAddingApt(false); setAptTitle(""); setAptDate(""); setAptNotes("");
        router.refresh();
      } else { const d = await res.json(); toast.error(d.error || "حدث خطأ"); }
    } finally { setSavingApt(false); }
  };

  /* confirm-delete modal */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteTransaction = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const isClinic = selectedPatient?.source === "clinic";
    try {
      const res = await fetch(
        isClinic ? `/api/clinic/transactions/${confirmDeleteId}` : `/api/doctor/transactions/${confirmDeleteId}`,
        { method: "DELETE" }
      );
      if (res.ok) { toast.success("تم الحذف"); setConfirmDeleteId(null); router.refresh(); }
      else toast.error("حدث خطأ");
    } finally { setDeleting(false); }
  };

  /* edit transaction */
  type EditState = { id: string; description: string; amount: string; notes: string };
  const [editTx, setEditTx] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (t: TransactionRow) =>
    setEditTx({ id: t.id, description: t.description, amount: String(t.amount), notes: t.notes ?? "" });

  const saveEdit = async () => {
    if (!editTx) return;
    const amount = Number(editTx.amount);
    if (!editTx.description.trim() || !amount || amount <= 0) {
      toast.error("الوصف والمبلغ مطلوبان");
      return;
    }
    setSavingEdit(true);
    try {
      const isClinic = selectedPatient?.source === "clinic";
      const url = isClinic
        ? `/api/clinic/transactions/${editTx.id}`
        : `/api/doctor/transactions/${editTx.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editTx.description.trim(),
          amount,
          notes: editTx.notes.trim() || null,
        }),
      });
      if (res.ok) { toast.success("تم التعديل ✓"); setEditTx(null); router.refresh(); }
      else { const d = await res.json(); toast.error(d.error || "حدث خطأ"); }
    } finally { setSavingEdit(false); }
  };

  /* ── Derived data ──────────────────────────────────────────────── */
  const age = selectedPatient?.dateOfBirth
    ? differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth))
    : null;

  const services      = selectedPatient?.transactions.filter((t) => t.type === "SERVICE") ?? [];
  const pmts          = selectedPatient?.transactions.filter((t) => t.type === "PAYMENT") ?? [];
  const totalServices = services.reduce((s, t) => s + t.amount, 0);
  const totalPayments = pmts.reduce((s, t) => s + t.amount, 0);
  const lastVisit     = selectedPatient?.appointments?.[0];

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* ══ COLUMN 1 (RIGHT) — Patient List ══════════════════════ */}
      <div className="flex w-60 shrink-0 flex-col border-l border-gray-200">

        {/* Top bar */}
        <div className="shrink-0 space-y-2 border-b border-gray-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{filtered.length} مريض</span>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة
            </button>
          </div>
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="بحث عن مريض..."
              className="h-9 w-full rounded-lg border border-gray-200 pr-8 pl-8 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {search && (
              <button type="button" onClick={() => handleSearch("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-12 text-center px-4 h-full">
              <Users className="h-10 w-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">{search ? "لا توجد نتائج" : "لا يوجد مرضى"}</p>
            </li>
          ) : filtered.map((p) => {
            const active = selectedId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openPatient(p)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-right transition-colors",
                    active ? "bg-blue-600" : "hover:bg-gray-50"
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm font-medium", active ? "text-white" : "text-gray-900")}>
                      {p.name}
                    </p>
                    <p className={cn("truncate text-xs", active ? "text-blue-100" : "text-gray-400")}>
                      {p.source === "clinic"
                        ? (p.fileNumber ? `ملف #${p.fileNumber}` : p.whatsapp ?? "—")
                        : `${p.appointmentCount} موعد · منصة`}
                    </p>
                  </div>
                  <Badge
                    variant={p.source === "clinic" ? "secondary" : "default"}
                    className={cn("text-[10px] shrink-0 px-1.5", active && "opacity-80")}
                  >
                    {p.source === "clinic" ? "عيادة" : "منصة"}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ══ COLUMN 2 (CENTER) — Patient Details ══════════════════ */}
      <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/40 min-w-0">
        {selectedPatient ? (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-xl font-bold text-blue-600">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{selectedPatient.name}</h2>
                    <Badge variant={selectedPatient.source === "clinic" ? "secondary" : "default"} className="text-xs">
                      {selectedPatient.source === "clinic" ? "عيادة" : "منصة"}
                    </Badge>
                    {selectedPatient.source === "clinic" && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditForm({
                          name: selectedPatient.name,
                          email: selectedPatient.email ?? "",
                          whatsapp: selectedPatient.whatsapp ?? "",
                          fileNumber: selectedPatient.fileNumber ?? "",
                          gender: selectedPatient.gender ?? "",
                          dateOfBirth: selectedPatient.dateOfBirth ? format(new Date(selectedPatient.dateOfBirth), "yyyy-MM-dd") : "",
                          address: selectedPatient.address ?? "",
                          bloodType: selectedPatient.bloodType ?? "",
                          allergies: selectedPatient.allergies ?? "",
                          notes: selectedPatient.notes ?? "",
                        });
                        setEditOpen(true);
                      }} className="gap-1">
                        <Pencil className="h-3.5 w-3.5" /> تعديل
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    {age != null && <span>العمر: {age} سنة</span>}
                    {selectedPatient.whatsapp && (
                      <span className="flex items-center gap-1" dir="ltr">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />{selectedPatient.whatsapp}
                      </span>
                    )}
                    {selectedPatient.allergies && (
                      <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />{selectedPatient.allergies}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 info cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="text-xs text-gray-400 mb-0.5">آخر زيارة</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {lastVisit
                      ? format(new Date(lastVisit.appointmentDate), "d MMM yyyy")
                      : "—"}
                  </div>
                </div>
                <div className={cn("rounded-xl border px-3.5 py-2.5",
                  selectedPatient.balance < 0 ? "border-red-200 bg-red-50"
                  : selectedPatient.balance > 0 ? "border-green-200 bg-green-50"
                  : "border-gray-100 bg-gray-50")}>
                  <div className="text-xs text-gray-400 mb-0.5">الرصيد</div>
                  <div className={cn("text-sm font-bold",
                    selectedPatient.balance < 0 ? "text-red-600"
                    : selectedPatient.balance > 0 ? "text-green-600" : "text-gray-700")}>
                    {selectedPatient.balance >= 0 ? "+" : ""}₪{selectedPatient.balance.toFixed(0)}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="text-xs text-gray-400 mb-0.5">الأدوية / ملاحظات</div>
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {selectedPatient.notes || "—"}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <div className="text-xs text-gray-400 mb-0.5">عدد الزيارات</div>
                  <div className="text-sm font-bold text-gray-800">
                    {selectedPatient.appointments.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ── البيانات ──────────────────────────────────── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">معلومات المريض</h3>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                    {(
                      [
                        { label: "الرقم الطبي",      value: selectedPatient.fileNumber },
                        { label: "الجنس",             value: selectedPatient.gender === "male" ? "ذكر" : selectedPatient.gender === "female" ? "أنثى" : null },
                        { label: "تاريخ الميلاد",     value: selectedPatient.dateOfBirth ? format(new Date(selectedPatient.dateOfBirth), "dd/MM/yyyy") : null },
                        { label: "فصيلة الدم",        value: selectedPatient.bloodType },
                        { label: "العنوان",            value: selectedPatient.address },
                        { label: "البريد الإلكتروني", value: selectedPatient.email },
                        { label: "رقم الهاتف",      value: selectedPatient.whatsapp },
                      ] as { label: string; value: string | null | undefined }[]
                    ).filter((f) => f.value).map((field) => (
                      <div key={field.label} className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="text-gray-400">{field.label}</span>
                        <span className="font-medium text-gray-900">{field.value}</span>
                      </div>
                    ))}
                    {!selectedPatient.fileNumber && !selectedPatient.whatsapp && !selectedPatient.email && (
                      <div className="px-5 py-8 text-center text-sm text-gray-400">لا توجد بيانات إضافية</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── سجل الزيارات ──────────────────────────────── */}
              {activeTab === "visits" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      سجل الزيارات ({selectedPatient.appointments.length})
                    </h3>
                    {!addingApt && (
                      <Button size="sm" variant="outline" onClick={() => setAddingApt(true)}
                        className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50">
                        <Plus className="h-3.5 w-3.5" /> موعد جديد
                      </Button>
                    )}
                  </div>

                  {addingApt && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                      {selectedPatient.source === "clinic" ? (
                        <>
                          <input placeholder="عنوان الموعد..." value={aptTitle} onChange={(e) => setAptTitle(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
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
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)}
                            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="التاريخ" />
                          <input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)}
                            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="بداية" />
                          <input type="time" value={aptEndTime} onChange={(e) => setAptEndTime(e.target.value)}
                            className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="نهاية" />
                        </div>
                      )}
                      <input placeholder="ملاحظات" value={aptNotes} onChange={(e) => setAptNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveApt} disabled={savingApt}>
                          {savingApt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingApt(false)}>إلغاء</Button>
                      </div>
                    </div>
                  )}

                  {selectedPatient.appointments.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
                      لا توجد زيارات مسجّلة
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPatient.appointments.map((apt) => {
                        const dateStr = apt.appointmentDate;
                        const cfg = APT_STATUS[apt.status] ?? APT_STATUS.SCHEDULED;
                        const Icon = cfg.icon;
                        return (
                          <div key={apt.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:border-blue-100 transition-colors">
                            <div className="min-w-[52px] text-center">
                              <div className="text-xs font-bold text-gray-700">{format(new Date(dateStr), "dd/MM")}</div>
                              <div className="text-xs text-blue-500">{apt.startTime?.slice(0,5) ?? ""}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {apt.title ?? `موعد ${format(new Date(dateStr), "dd/MM/yyyy")}`}
                              </p>
                              <p className="text-xs text-gray-400">
                                {apt.duration ? `${apt.duration} دقيقة` : apt.fee ? `رسوم: ₪${apt.fee}` : ""}
                              </p>
                            </div>
                            <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", cfg.color)}>
                              <Icon className="h-3 w-3" />{cfg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── المعاملات ─────────────────────────────────── */}
              {activeTab === "transactions" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">
                      <div className="text-xs text-red-400">الخدمات</div>
                      <div className="text-base font-bold text-red-600 mt-0.5">₪{totalServices.toFixed(0)}</div>
                    </div>
                    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-center">
                      <div className="text-xs text-green-400">الدفعات</div>
                      <div className="text-base font-bold text-green-600 mt-0.5">₪{totalPayments.toFixed(0)}</div>
                    </div>
                    <div className={cn("rounded-xl border px-4 py-3 text-center",
                      selectedPatient.balance < 0 ? "border-red-100 bg-red-50" : "border-green-100 bg-green-50")}>
                      <div className="text-xs text-gray-400">الرصيد</div>
                      <div className={cn("text-base font-bold mt-0.5",
                        selectedPatient.balance < 0 ? "text-red-600" : "text-green-600")}>
                        {selectedPatient.balance >= 0 ? "+" : ""}₪{selectedPatient.balance.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!addingService && (
                      <Button size="sm" variant="outline" onClick={() => setAddingService(true)}
                        className="gap-1 border-red-200 text-red-600 hover:bg-red-50">
                        <Plus className="h-3.5 w-3.5" /> خدمة جديدة
                      </Button>
                    )}
                    {!addingPayment && (
                      <Button size="sm" variant="outline" onClick={() => setAddingPayment(true)}
                        className="gap-1 border-green-200 text-green-600 hover:bg-green-50">
                        <Plus className="h-3.5 w-3.5" /> تسجيل دفعة
                      </Button>
                    )}
                  </div>

                  {addingService && (
                    <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="اسم الخدمة..." value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                        <div className="flex gap-1">
                          <span className="flex items-center shrink-0 rounded-lg border border-gray-200 bg-gray-100 px-2 text-sm text-gray-600">₪</span>
                          <input type="number" placeholder="المبلغ" value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                        </div>
                      </div>
                      <input placeholder="ملاحظات" value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveService} disabled={savingService} className="bg-red-600 hover:bg-red-700">
                          {savingService ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingService(false)}>إلغاء</Button>
                      </div>
                    </div>
                  )}

                  {addingPayment && (
                    <div className="rounded-xl border border-green-200 bg-green-50/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="وصف الدفعة..." value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                        <div className="flex gap-1">
                          <span className="flex items-center shrink-0 rounded-lg border border-gray-200 bg-gray-100 px-2 text-sm text-gray-600">₪</span>
                          <input type="number" placeholder="المبلغ" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                        </div>
                      </div>
                      <input placeholder="ملاحظات" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={savePayment} disabled={savingPayment} className="bg-green-600 hover:bg-green-700">
                          {savingPayment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
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
                    <div className="table-scroll-mobile w-full min-w-0 rounded-xl border border-gray-200 bg-white -mx-2 px-2 sm:mx-0 sm:px-0">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400">
                          <tr>
                            <th className="px-4 py-3 font-medium">التاريخ</th>
                            <th className="px-4 py-3 font-medium">البيان</th>
                            <th className="px-4 py-3 text-center font-medium text-red-500">مدين</th>
                            <th className="px-4 py-3 text-center font-medium text-green-600">دائن</th>
                            <th className="w-20 px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedPatient.transactions.map((t) => {
                            const isEditing = editTx?.id === t.id;
                            return (
                              <tr key={t.id} className={cn("transition-colors", isEditing ? "bg-blue-50/40" : "hover:bg-gray-50/50")}>
                                {isEditing ? (
                                  /* ── Inline edit row ── */
                                  <>
                                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                                      {format(new Date(t.date), "dd/MM/yyyy")}
                                    </td>
                                    <td className="px-4 py-2" colSpan={2}>
                                      <div className="flex flex-col gap-1.5">
                                        <input
                                          value={editTx.description}
                                          onChange={(e) => setEditTx((p) => p && ({ ...p, description: e.target.value }))}
                                          className="h-8 w-full rounded-lg border border-blue-300 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                          placeholder="الوصف"
                                        />
                                        <input
                                          value={editTx.notes}
                                          onChange={(e) => setEditTx((p) => p && ({ ...p, notes: e.target.value }))}
                                          className="h-7 w-full rounded-lg border border-gray-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                                          placeholder="ملاحظات (اختياري)"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex gap-1">
                                        <span className="flex items-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-xs text-gray-600">₪</span>
                                        <input
                                          type="number"
                                          value={editTx.amount}
                                          onChange={(e) => setEditTx((p) => p && ({ ...p, amount: e.target.value }))}
                                          className="h-8 w-20 rounded-lg border border-blue-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-1">
                                        <button onClick={saveEdit} disabled={savingEdit}
                                          className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                          title="حفظ">
                                          {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                        <button onClick={() => setEditTx(null)}
                                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                          title="إلغاء">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  /* ── Normal row ── */
                                  <>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                                      {format(new Date(t.date), "dd/MM/yyyy")}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {t.type === "SERVICE"
                                          ? <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />
                                          : <TrendingUp   className="h-3.5 w-3.5 shrink-0 text-green-500" />}
                                        <span className="font-medium text-gray-900">{t.description}</span>
                                      </div>
                                      {t.notes && <p className="mr-5 mt-0.5 text-xs text-gray-400">{t.notes}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-red-600">
                                      {t.type === "SERVICE" ? `₪${t.amount.toFixed(0)}` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-green-600">
                                      {t.type === "PAYMENT" ? `₪${t.amount.toFixed(0)}` : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => startEdit(t)}
                                          title="تعديل"
                                          className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                                        >
                                          <Pencil className="h-3 w-3" />
                                          تعديل
                                        </button>
                                        <button
                                          onClick={() => setConfirmDeleteId(t.id)}
                                          title="حذف"
                                          className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                          حذف
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── الملفات الطبية ────────────────────────────── */}
              {activeTab === "medical" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">الملفات الطبية</h3>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                    {selectedPatient.allergies && (
                      <div className="flex items-start gap-3 px-5 py-4">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 mb-1">الحساسيات والتنبيهات</div>
                          <div className="text-sm text-gray-600">{selectedPatient.allergies}</div>
                        </div>
                      </div>
                    )}
                    {selectedPatient.notes && (
                      <div className="flex items-start gap-3 px-5 py-4">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 mb-1">ملاحظات طبية</div>
                          <div className="text-sm text-gray-600">{selectedPatient.notes}</div>
                        </div>
                      </div>
                    )}
                    {!selectedPatient.allergies && !selectedPatient.notes && (
                      <div className="py-12 text-center text-sm text-gray-400">
                        <Stethoscope className="mx-auto mb-3 h-10 w-10 text-gray-200" />
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
            <Users className="mb-4 h-16 w-16" />
            <p className="text-sm text-gray-400">اختر مريضاً من القائمة</p>
            <p className="mt-1 text-xs text-gray-300">أو أضف مريضاً جديداً</p>
          </div>
        )}
      </div>

      {/* ══ COLUMN 3 (LEFT) — Vertical Tabs ══════════════════════ */}
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

      {/* ══ ADD PATIENT MODAL ════════════════════════════════════ */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">إضافة مريض جديد</h2>
              <button type="button" onClick={() => setAddOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="الاسم الكامل *" placeholder="محمد أحمد" value={addForm.name} onChange={(e) => setAdd("name", e.target.value)} />
                <Input label="رقم الملف" placeholder="001" value={addForm.fileNumber} onChange={(e) => setAdd("fileNumber", e.target.value)} />
              </div>
              <Input label="رقم الهاتف" placeholder="0599xxxxxx (لإرسال رسائل SMS للدفعات والديون)" value={addForm.whatsapp} onChange={(e) => setAdd("whatsapp", e.target.value)} dir="ltr" />
              <Input label="البريد الإلكتروني" type="email" placeholder="email@example.com" value={addForm.email} onChange={(e) => setAdd("email", e.target.value)} dir="ltr" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الجنس</label>
                  <select value={addForm.gender} onChange={(e) => setAdd("gender", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— اختر —</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <Input label="تاريخ الميلاد" type="date" value={addForm.dateOfBirth} onChange={(e) => setAdd("dateOfBirth", e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">فصيلة الدم</label>
                  <select value={addForm.bloodType} onChange={(e) => setAdd("bloodType", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— اختر —</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <Input label="العنوان" placeholder="الخليل، حي البلد" value={addForm.address} onChange={(e) => setAdd("address", e.target.value)} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الحساسيات / التنبيهات</label>
                <input placeholder="مثل: حساسية من البنسلين..." value={addForm.allergies} onChange={(e) => setAdd("allergies", e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات / أدوية حالية</label>
                <textarea value={addForm.notes} onChange={(e) => setAdd("notes", e.target.value)} rows={2}
                  placeholder="أي معلومات إضافية..."
                  className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={addLoading}>
                  {addLoading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري الحفظ...</> : "إضافة المريض"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ EDIT PATIENT MODAL (clinic only) ═══════════════════════ */}
      {editOpen && selectedPatient?.source === "clinic" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">تعديل بيانات المريض</h2>
              <button type="button" onClick={() => setEditOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditPatient} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="الاسم الكامل *" placeholder="محمد أحمد" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                <Input label="رقم الملف" placeholder="001" value={editForm.fileNumber} onChange={(e) => setEditForm((p) => ({ ...p, fileNumber: e.target.value }))} />
              </div>
              <Input label="رقم الهاتف" placeholder="0599xxxxxx (لإرسال رسائل SMS)" value={editForm.whatsapp} onChange={(e) => setEditForm((p) => ({ ...p, whatsapp: e.target.value }))} dir="ltr" />
              <Input label="البريد الإلكتروني" type="email" placeholder="email@example.com" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} dir="ltr" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الجنس</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— اختر —</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <Input label="تاريخ الميلاد" type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">فصيلة الدم</label>
                  <select value={editForm.bloodType} onChange={(e) => setEditForm((p) => ({ ...p, bloodType: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— اختر —</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <Input label="العنوان" placeholder="الخليل، حي البلد" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الحساسيات / التنبيهات</label>
                <input placeholder="مثل: حساسية من البنسلين..." value={editForm.allergies} onChange={(e) => setEditForm((p) => ({ ...p, allergies: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات / أدوية حالية</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={2}
                  placeholder="أي معلومات إضافية..."
                  className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={editLoading}>
                  {editLoading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري الحفظ...</> : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DELETE MODAL ════════════════════════════════ */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 bg-red-50 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">تأكيد الحذف</p>
                <p className="text-xs text-gray-500">هذه العملية لا يمكن التراجع عنها</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700">
                هل أنت متأكد من حذف هذه المعاملة؟ لن تتمكن من استرجاعها لاحقاً.
              </p>
            </div>
            {/* Actions */}
            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={deleteTransaction}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "جاري الحذف..." : "نعم، احذف"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
