"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n-context";
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
import IconPencil from "@/components/icon/icon-pencil";
import IconCheck from "@/components/icon/icon-check";
import IconPhone from "@/components/icon/icon-phone";
import IconExclamationTriangle from "@/components/icon/icon-exclamation-triangle";
import IconHeart from "@/components/icon/icon-heart";
import IconReceipt from "@/components/icon/icon-receipt";
import IconPrinter from "@/components/icon/icon-printer";
import IconClipboardText from "@/components/icon/icon-clipboard-text";
import IconCaretDown from "@/components/icon/icon-caret-down";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClinicPatientPhoneLookupField } from "@/components/clinic-patient-phone-lookup";
import type { PatientListItem, SelectedPatient, AppointmentRow, TransactionRow } from "./page";
import type { CarePlanType } from "@/lib/specialty-plan-registry";
import { carePlanShowsDentalToothChart } from "@/lib/specialty-plan-registry";
import { CarePlanPanel } from "@/components/doctor-care-plans/care-plan-panel";
import { DentalToothChartBlock } from "@/components/doctor-care-plans/dental-tooth-chart-block";
import { MedicalFilesCarePlanTable } from "@/components/doctor-care-plans/medical-files-care-plan-table";
import { amountSignedColorClass, formatSignedShekel } from "@/lib/money-display";
import { transactionSignedDelta } from "@/lib/patient-transaction-math";
import { buildFinancialReportPrintHtml } from "@/lib/financial-report-print-html";
import { printHtmlDocument } from "@/lib/print-html";
import { buildMedicalReportPrintHtml } from "@/lib/medical-report-print-html";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ─── Tab definitions ────────────────────────────────────────────── */
const getBaseTabs = (t: any) => [
  { id: "info",         label: t("doctor_dashboard.patients.tabs.info"),         icon: IconUser },
  { id: "visits",       label: t("doctor_dashboard.patients.tabs.visits"),       icon: IconCalendar },
  { id: "transactions", label: t("doctor_dashboard.patients.tabs.transactions"), icon: IconReceipt },
  { id: "medical",      label: t("doctor_dashboard.patients.tabs.medical"),      icon: IconDocument },
];

const getEmergencyTabs = (t: any) => [
  { id: "info", label: t("doctor_dashboard.patients.tabs.info"), icon: IconUser },
  { id: "report", label: t("doctor_dashboard.patients.tabs.report"), icon: IconClipboardText },
];

const getAptStatus = (t: any): Record<string, { label: string; color: string; icon: React.ElementType }> => ({
  SCHEDULED:  { label: t("doctor_dashboard.patients.apt_status.scheduled"),   color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-300",    icon: IconClock },
  DRAFT:      { label: t("doctor_dashboard.patients.apt_status.draft"),       color: "text-gray-600 bg-gray-100 dark:bg-slate-700 dark:text-slate-200",   icon: IconClock },
  CONFIRMED:  { label: t("doctor_dashboard.patients.apt_status.confirmed"),   color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300", icon: IconCircleCheck },
  COMPLETED:  { label: t("doctor_dashboard.patients.apt_status.completed"),   color: "text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-300",  icon: IconCircleCheck },
  CANCELLED:  { label: t("doctor_dashboard.patients.apt_status.cancelled"),   color: "text-red-500 bg-red-50 dark:bg-red-950/40 dark:text-red-300",      icon: IconXCircle },
  NO_SHOW:    { label: t("doctor_dashboard.patients.apt_status.no_show"),    color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 dark:text-yellow-200", icon: IconXCircle },
});

/* ─── Props ──────────────────────────────────────────────────────── */
type Props = {
  initialPatients: PatientListItem[];
  initialQ?: string;
  selectedPatient: SelectedPatient | null;
  selectedId: string | null;
  doctorId: string;
  defaultFee: number;
  isDentist: boolean;
  /** طبيب أسنان أو تخصص زراعة (يعرض مخطط الـ32 سنّاً) */
  showDentalToothChart: boolean;
  carePlanType: CarePlanType;
  doctorDisplayName?: string;
  centerDisplayName?: string;
  /** موظف عيادة: واجهة مبسطة */
  isStaff?: boolean;
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
  isDentist,
  showDentalToothChart,
  carePlanType,
  doctorDisplayName = "",
  centerDisplayName: propCenterDisplayName,
  isStaff = false,
}: Props) {
  const { t } = useTranslation();
  const centerDisplayName = propCenterDisplayName || t("common.medical_center");
  const router   = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  /* ── State ─────────────────────────────────────────────────────── */
  const [search,    setSearch]    = useState(initialQ);
  const [activeTab, setActiveTab] = useState("info");
  /** الجوال: البحث والقائمة تظهر بعد الضغط على شريط عدد المرضى */
  const [mobilePatientPickerOpen, setMobilePatientPickerOpen] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    setEditTx(null);
    const allowed = new Set(["info", "visits", "transactions"]);
    if (!allowed.has(activeTab)) setActiveTab("info");
  }, [isStaff, activeTab]);

  useEffect(() => {
    if (!selectedPatient || selectedPatient.source !== "emergency") return;
    const allowed = new Set(["info", "report"]);
    if (!allowed.has(activeTab)) setActiveTab("info");
  }, [selectedPatient, activeTab]);

  /* add-patient modal */
  const [addOpen,    setAddOpen]    = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addExistingUserId, setAddExistingUserId] = useState<string | null>(null);
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

  /* add appointment (يُستخدم أيضاً لتسجيل الملاحظات الطبية للزيارة) */
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
  const [bookingChannel, setBookingChannel] = useState<"CENTER" | "CLINIC">("CLINIC");
  const [doctorClinics, setDoctorClinics] = useState<{ id: string; name: string; medicalCenterId?: string | null }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [centerClinicId, setCenterClinicId] = useState<string | null>(null);
  const ownClinics = doctorClinics.filter((c) => !c.medicalCenterId);
  const canChooseChannel = Boolean(centerClinicId) && ownClinics.length > 0;

  /* medical notes (inside الملفات الطبية) — clinic patients only */
  const [addingMedical, setAddingMedical] = useState(false);
  const [medicalAllergies, setMedicalAllergies] = useState("");
  const [medicalDiagnosis, setMedicalDiagnosis] = useState("");
  const [medicalTreatment, setMedicalTreatment] = useState("");
  const [savingMedical, setSavingMedical] = useState(false);
  const [editingMedicalId, setEditingMedicalId] = useState<string | null>(null);
  const [editMedicalAllergies, setEditMedicalAllergies] = useState("");
  const [editMedicalDiagnosis, setEditMedicalDiagnosis] = useState("");
  const [editMedicalTreatment, setEditMedicalTreatment] = useState("");
  // Structured Report Fields
  const [medicalReport, setMedicalReport] = useState({
    presentingComplaints: "",
    medicalHistory: "",
    bp: "",
    temp: "",
    pulse: "",
    physicalExamination: "",
    investigations: "",
    diagnosis: "",
    icd10: "",
    recommendations: "",
    sickLeaveDays: "",
    sickLeaveNotes: "",
  });
  const [editMedicalReport, setEditMedicalReport] = useState<any>(null);
  const [savingMedicalEdit, setSavingMedicalEdit] = useState(false);
  const [hasCarePlanSummary, setHasCarePlanSummary] = useState(false);
  const onCarePlanSummaryLoaded = useCallback((has: boolean) => {
    setHasCarePlanSummary(has);
  }, []);
  const [imagingOpen, setImagingOpen] = useState(false);
  const [imagingSubmitting, setImagingSubmitting] = useState(false);
  const [imagingReloadKey, setImagingReloadKey] = useState(0);
  const [imagingForm, setImagingForm] = useState({
    title: "أشعة",
    notes: "",
    file: null as File | null,
  });

  const printPatientTransactionsPdf = useCallback(() => {
    if (!selectedPatient?.transactions.length) return;
    const html = buildFinancialReportPrintHtml({
      mode: "single-patient",
      doctorName: doctorDisplayName || "—",
      patientLine: selectedPatient.name,
      patientChannelLabel:
        selectedPatient.source === "clinic" ? t("common.patient_source.clinic") : selectedPatient.source === "emergency" ? t("common.patient_source.emergency") : t("common.patient_source.platform"),
      issuedAtLabel: new Date().toLocaleString("ar", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
      rows: selectedPatient.transactions.map((t) => ({
        date: t.date,
        type: t.type as "SERVICE" | "PAYMENT",
        description: t.description,
        notes: t.notes,
        amount: t.amount,
      })),
    });
    printHtmlDocument(html, `معاملات — ${selectedPatient.name}`);
  }, [selectedPatient, doctorDisplayName]);

  const printMedicalReportPdf = useCallback(() => {
    if (!selectedPatient) return;
    const notes = selectedPatient.medicalNotes ?? [];
    const latest = notes
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const issuedAtLabel = new Date().toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" });
    const html = buildMedicalReportPrintHtml({
      doctorName: doctorDisplayName || "—",
      issuedAtLabel,
      reportTitle: "تقرير طبي للمريض",
      patient: {
        name: selectedPatient.name,
        fileNumber: selectedPatient.fileNumber ?? null,
        gender: selectedPatient.gender ?? null,
        dateOfBirth: selectedPatient.dateOfBirth ?? null,
        phone: selectedPatient.whatsapp ?? null,
      },
      note: {
        allergies: latest?.allergies ?? null,
        diagnosis: latest?.diagnosis ?? null,
        treatment: latest?.treatment ?? null,
        createdAt: latest?.createdAt ?? null,
      },
    });
    printHtmlDocument(html, `تقرير طبي — ${selectedPatient.name}`);
  }, [selectedPatient, doctorDisplayName]);

  /* reset tab when patient changes */
  useEffect(() => {
    setActiveTab("info");
    setHasCarePlanSummary(false);
  }, [selectedId]);

  useEffect(() => {
    fetch("/api/doctor/profile")
      .then((r) => r.json())
      .then((j) => {
        const clinics = (j?.doctor?.clinics ?? []) as { id: string; name: string; medicalCenterId?: string | null }[];
        setDoctorClinics(clinics);
        const centerClinic = clinics.find((c) => Boolean(c.medicalCenterId));
        const ownClinic = clinics.find((c) => !c.medicalCenterId);
        setCenterClinicId(centerClinic?.id ?? null);
        setSelectedClinicId((ownClinic ?? clinics[0])?.id ?? "");
        if (centerClinic?.id) setBookingChannel("CENTER");
      })
      .catch(() => {});
  }, []);

  const tabs = useMemo(() => {
    if (selectedPatient?.source === "emergency") {
      return getEmergencyTabs(t);
    }
    if (isStaff) {
      return [
        { id: "info", label: t("doctor_dashboard.patients.tabs.info"), icon: IconUser },
        { id: "visits", label: t("doctor_dashboard.patients.tabs.visits"), icon: IconCalendar },
        { id: "transactions", label: t("doctor_dashboard.patients.tabs.transactions"), icon: IconReceipt },
      ];
    }
    const bt = getBaseTabs(t);
    /* خطة العلاج حسب التخصص — مريض عيادة أو مريض منصة */
    if (!showDentalToothChart) {
      bt.push({ id: "careplan", label: t("doctor_dashboard.patients.tabs.careplan"), icon: IconClipboardText });
    }
    if (showDentalToothChart && !isDentist) {
      bt.push({ id: "careplan", label: t("doctor_dashboard.patients.tabs.careplan"), icon: IconClipboardText });
      /* تخصصات الزراعة: المخطط داخل تبويبة خطة العلاج فقط — لا تكرار */
      if (!carePlanShowsDentalToothChart(carePlanType)) {
        bt.push({ id: "dental", label: t("doctor_dashboard.patients.tabs.dental_scheme"), icon: IconDocument });
      }
    }
    if (isDentist) {
      bt.push({ id: "dental", label: t("doctor_dashboard.patients.tabs.dental_plan"), icon: IconDocument });
    }
    return bt;
  }, [selectedPatient?.source, isStaff, isDentist, showDentalToothChart, carePlanType, t]);

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
    if (!editForm.name.trim()) { toast.error(t("doctor_dashboard.patients.toasts.name_required")); return; }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/clinic/patients/${selectedPatient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast.success(t("doctor_dashboard.patients.toasts.update_success"));
        setEditOpen(false);
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || t("doctor_dashboard.patients.toasts.error"));
      }
    } catch {
      toast.error(t("doctor_dashboard.patients.toasts.conn_error"));
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
    setMobilePatientPickerOpen(false);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("id", p.id);
    params.set("source", p.source);
    params.set("owner", p.ownership);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    const params = new URLSearchParams();
    if (v) params.set("q", v);
    if (selectedId && selectedPatient) {
      params.set("id", selectedId);
      params.set("source", selectedPatient.source);
      params.set("owner", selectedPatient.ownership);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  /* ── Add patient ───────────────────────────────────────────────── */
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) { toast.error(t("doctor_dashboard.patients.toasts.name_required")); return; }
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
        toast.success(t("doctor_dashboard.patients.toasts.add_success"));
        if (data.setupSmsSent === true) {
          toast.message(t("doctor_dashboard.patients.toasts.sms_sent"));
        } else if (data.setupSmsSent === false) {
          toast.warning(
            t("doctor_dashboard.patients.toasts.sms_not_sent"),
          );
        }
        setAddOpen(false);
        setAddExistingUserId(null);
        setAddForm({ name:"",email:"",whatsapp:"",gender:"",dateOfBirth:"",address:"",bloodType:"",allergies:"",notes:"",fileNumber:"" });
        router.refresh();
        openPatient({ id: data.patient.id, name: data.patient.name, source: "clinic", ownership: "LOCAL", appointmentCount: 0 });
      } else { toast.error(data.error || t("doctor_dashboard.patients.toasts.error")); }
    } catch { toast.error(t("doctor_dashboard.patients.toasts.conn_error")); }
    finally  { setAddLoading(false); }
  };

  /* ── Transactions / appointments ───────────────────────────────── */
  const txUrl = (id: string, src: string) =>
    src === "platform"
      ? `/api/doctor/patients/${id}/platform-transactions`
      : `/api/clinic/patients/${id}/transactions`;

  const saveService = async () => {
    if (!serviceDesc || !serviceAmount) { toast.error(t("doctor_dashboard.patients.toasts.desc_amount_required")); return; }
    setSavingService(true);
    try {
      const res = await fetch(txUrl(selectedPatient!.id, selectedPatient!.source), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SERVICE",
          description: serviceDesc,
          amount: Math.abs(Number(serviceAmount)),
          notes: serviceNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success(t("doctor_dashboard.patients.toasts.service_added"));
        setAddingService(false); setServiceDesc(""); setServiceAmount(""); setServiceNotes("");
        router.refresh();
      } else { const d = await res.json(); toast.error(d.error || t("doctor_dashboard.patients.toasts.error")); }
    } finally { setSavingService(false); }
  };

  const savePayment = async () => {
    if (!paymentAmount) { toast.error(t("doctor_dashboard.patients.toasts.desc_amount_required")); return; }
    setSavingPayment(true);
    try {
      const res = await fetch(txUrl(selectedPatient!.id, selectedPatient!.source), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT",
          description: paymentDesc,
          amount: Math.abs(Number(paymentAmount)),
          notes: paymentNotes || undefined,
        }),
      });
      if (res.ok) {
        toast.success(t("doctor_dashboard.patients.toasts.payment_added"));
        setAddingPayment(false); setPaymentAmount(""); setPaymentNotes("");
        router.refresh();
      } else { const d = await res.json(); toast.error(d.error || t("doctor_dashboard.patients.toasts.error")); }
    } finally { setSavingPayment(false); }
  };

  const saveApt = async () => {
    if (!selectedPatient) return;
    setSavingApt(true);
    try {
      let res: Response;
      if (selectedPatient.source === "clinic") {
        if (!aptTitle || !aptDate || !aptTime) { toast.error(t("doctor_dashboard.patients.toasts.desc_amount_required")); setSavingApt(false); return; }
        res = await fetch(`/api/clinic/patients/${selectedPatient.id}/appointments`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title:aptTitle, date:aptDate, time:aptTime, duration:Number(aptDuration)||30, notes:aptNotes||undefined }),
        });
      } else {
        if (!aptDate || !aptTime || !aptEndTime) { toast.error(t("doctor_dashboard.patients.toasts.desc_amount_required")); setSavingApt(false); return; }
        const viaMedicalCenter = canChooseChannel ? bookingChannel === "CENTER" : Boolean(centerClinicId);
        const resolvedClinicId = viaMedicalCenter ? centerClinicId : selectedClinicId;
        if (!resolvedClinicId) { toast.error(t("doctor_dashboard.patients.toasts.clinic_required")); setSavingApt(false); return; }
        res = await fetch("/api/appointments", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId,
            patientId:selectedPatient.id,
            clinicId: resolvedClinicId,
            appointmentDate:aptDate,
            startTime:aptTime,
            endTime:aptEndTime,
            fee:Number(aptFee)||defaultFee,
            notes:aptNotes||undefined,
            viaMedicalCenter,
          }),
        });
      }
      if (res.ok) {
        toast.success(t("doctor_dashboard.patients.toasts.apt_added"));
        setAddingApt(false); setAptTitle(""); setAptDate(""); setAptNotes("");
        router.refresh();
      } else { const d = await res.json(); toast.error(d.error || t("doctor_dashboard.patients.toasts.error")); }
    } finally { setSavingApt(false); }
  };

  /* confirm-delete modal */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteTransaction = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      // حذف ملاحظات طبية عامة (notes على ClinicPatient)
      if (confirmDeleteId === "clear-notes" && selectedPatient?.source === "clinic") {
        const res = await fetch(`/api/clinic/patients/${selectedPatient.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: "" }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || t("doctor_dashboard.patients.toasts.error"));
        } else {
          toast.success(t("doctor_dashboard.patients.toasts.delete_success"));
          setConfirmDeleteId(null);
          router.refresh();
        }
        return;
      }

      // حذف ملاحظة طبية مفصلة
      if (selectedPatient?.source === "clinic" && confirmDeleteId.startsWith("note_")) {
        const id = confirmDeleteId.replace("note_", "");
        const res = await fetch(`/api/clinic/medical-notes/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || t("doctor_dashboard.patients.toasts.error"));
        } else {
          toast.success(t("doctor_dashboard.patients.toasts.delete_success"));
          setConfirmDeleteId(null);
          router.refresh();
        }
        return;
      }

      // حذف معاملة مالية (السلوك السابق)
      const isClinic = selectedPatient?.source === "clinic";
      const res = await fetch(
        isClinic ? `/api/clinic/transactions/${confirmDeleteId}` : `/api/doctor/transactions/${confirmDeleteId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success(t("doctor_dashboard.patients.toasts.delete_success"));
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          (data as { error?: string }).error || t("doctor_dashboard.patients.toasts.error"),
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  /* edit transaction */
  type EditState = {
    id: string;
    type: string;
    description: string;
    amount: string;
    notes: string;
  };
  const [editTx, setEditTx] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (t: TransactionRow) =>
    setEditTx({
      id: t.id,
      type: t.type,
      description: t.description,
      amount: String(t.type === "SERVICE" ? Math.abs(Number(t.amount)) : Number(t.amount)),
      notes: t.notes ?? "",
    });

  const saveEdit = async () => {
    if (!editTx) return;
    const amount = Number(editTx.amount);
    if (!editTx.description.trim() || !Number.isFinite(amount) || Math.abs(amount) === 0) {
      toast.error(t("doctor_dashboard.patients.toasts.desc_amount_required"));
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
          amount: Math.abs(amount),
          notes: editTx.notes.trim() || null,
        }),
      });
      if (res.ok) { toast.success(t("doctor_dashboard.patients.toasts.update_success")); setEditTx(null); router.refresh(); }
      else { const d = await res.json(); toast.error(d.error || t("doctor_dashboard.patients.toasts.error")); }
    } finally { setSavingEdit(false); }
  };

  /* ── Derived data ──────────────────────────────────────────────── */
  const age = selectedPatient?.dateOfBirth
    ? differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth))
    : null;

  const services      = selectedPatient?.transactions.filter((t) => t.type === "SERVICE") ?? [];
  const pmts          = selectedPatient?.transactions.filter((t) => t.type === "PAYMENT") ?? [];
  const totalServices = services.reduce((s, t) => s + transactionSignedDelta(t), 0);
  const totalPayments = pmts.reduce((s, t) => s + transactionSignedDelta(t), 0);
  const lastVisit     = selectedPatient?.appointments?.[0];

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:rounded-2xl lg:h-full">

      {/* ══ COLUMN 1 (RIGHT) — Patient List ══════════════════════ */}
        <div className="order-1 flex w-full shrink-0 flex-col border-b border-gray-200 dark:border-slate-700 lg:order-none lg:h-full lg:max-h-none lg:w-60 lg:border-b-0 lg:border-l">
        {(() => {
          const openAddPatientModal = () => {
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
            setAddOpen(true);
          };

          const searchField = (
            <div className="relative">
              <IconSearch className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t("doctor_dashboard.patients.search_placeholder")}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white py-2 pr-8 pl-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );

          const renderPatientListItems = () =>
            filtered.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <IconUsers className="mb-2 h-10 w-10 text-gray-200 dark:text-slate-600" />
                <p className="text-sm text-gray-400 dark:text-slate-500">{search ? t("common.no_results") : t("doctor_dashboard.patients.no_patients")}</p>
              </li>
            ) : (
              filtered.map((p) => {
                const rowKey = `${p.id}:${p.source}:${p.ownership}`;
                const active =
                  selectedId === p.id &&
                  selectedPatient?.source === p.source &&
                  selectedPatient?.ownership === p.ownership;
                const isClinic = p.source === "clinic";
                return (
                  <li key={rowKey}>
                    <button
                      type="button"
                      onClick={() => openPatient(p)}
                      className={cn(
                        "relative flex w-full items-center gap-3 rounded-xl border border-gray-200/95 py-2.5 pe-3 ps-3 text-right shadow-sm transition-colors dark:border-slate-600",
                        active
                          ? isClinic
                            ? "border-s-[3px] border-s-emerald-200 dark:border-s-emerald-600"
                            : "border-s-[3px] border-s-blue-200 dark:border-s-blue-500"
                          : isClinic
                            ? "border-s-[3px] border-s-emerald-500"
                            : "border-s-[3px] border-s-blue-500",
                        active ? "border-gray-200/30 bg-blue-600" : "bg-white hover:bg-gray-50/90 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300"
                        )}
                      >
                        <IconUser className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-sm font-medium", active ? "text-white" : "text-gray-900 dark:text-slate-100")}>
                          {p.name}
                        </p>
                        <p className={cn("truncate text-xs", active ? "text-blue-100" : "text-gray-400 dark:text-slate-500")}>
                          {isClinic
                            ? (p.fileNumber ? t("doctor_dashboard.patients.file_label", { num: p.fileNumber }) : p.whatsapp ?? "—")
                            : t("doctor_dashboard.patients.apt_count", { count: p.appointmentCount })}
                        </p>
                      </div>
                      <Badge
                        variant={p.ownership === "CENTER" ? "default" : "secondary"}
                        className={cn("shrink-0 px-1.5 text-[10px]", active && "border-white/30 bg-white/15 text-white")}
                      >
                        {p.ownership === "CENTER" ? centerDisplayName : t("doctor_dashboard.patients.ownership_local")}
                      </Badge>
                    </button>
                  </li>
                );
              })
            );

          return (
            <>
              {/* الجوال: شريط بعدد المرضى + إضافة؛ الضغط يفتح البحث والقائمة */}
              <div className="shrink-0 lg:hidden">
                <div className="flex items-center gap-2 border-b border-gray-100 p-3 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setMobilePatientPickerOpen((o) => !o)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-right text-sm font-medium text-gray-800 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100"
                    aria-expanded={mobilePatientPickerOpen}
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-gray-600 dark:text-slate-300">{t("doctor_dashboard.patients.patient_count", { count: filtered.length })}</span>
                      {selectedPatient && (
                        <span className="mr-1 text-xs font-normal text-gray-500 dark:text-slate-400">
                          {" "}
                          — {selectedPatient.name}
                        </span>
                      )}
                    </span>
                    <IconCaretDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-slate-400",
                        mobilePatientPickerOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={openAddPatientModal}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <IconPlus className="h-3.5 w-3.5" /> {t("common.add")}
                  </button>
                </div>
                {mobilePatientPickerOpen && (
                  <div className="flex max-h-[min(52vh,420px)] flex-col border-b border-gray-100 dark:border-slate-700">
                    <div className="shrink-0 space-y-2 p-3 pt-2">{searchField}</div>
                    <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-2 pb-3">{renderPatientListItems()}</ul>
                  </div>
                )}
              </div>

              {/* سطح المكتب والتابلت (lg+): القائمة والبحث دائماً */}
              <div className="hidden min-h-0 flex-1 flex-col lg:flex">
                <div className="shrink-0 space-y-2 border-b border-gray-100 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 dark:text-slate-500">{t("doctor_dashboard.patients.patient_count", { count: filtered.length })}</span>
                    <button
                      type="button"
                      onClick={openAddPatientModal}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      <IconPlus className="h-3.5 w-3.5" /> {t("common.add")}
                    </button>
                  </div>
                  {searchField}
                </div>
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-2 py-2">{renderPatientListItems()}</ul>
              </div>
            </>
          );
        })()}
      </div>

      {/* ══ COLUMN 2 (CENTER) — Patient Details ══════════════════ */}
      <div className="order-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gray-50/40 dark:bg-slate-950/50 lg:order-none">
        {selectedPatient ? (
          <>
            {/* على الجوال: رأس المريض وبطاقات الملخص تظهر فقط في تبويب «البيانات»؛ على الشاشات الكبيرة تبقى مرئية دائماً */}
            <div
              className={cn(
                "shrink-0 border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900/90",
                activeTab !== "info" && "hidden lg:block"
              )}
            >
            {/* شريط لوني أعلى التفاصيل (نفس منطق القائمة) */}
            <div
              className={cn(
                "h-1 shrink-0",
                selectedPatient.ownership === "CENTER" ? "bg-blue-500" : "bg-emerald-500"
              )}
              aria-hidden
            />
            {/* Header */}
            <div className="space-y-3 px-3 py-3 sm:space-y-4 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 text-lg font-bold text-blue-600 dark:from-blue-900/60 dark:to-indigo-900/60 dark:text-blue-300 sm:h-14 sm:w-14 sm:text-xl">
                  {selectedPatient.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-bold text-gray-900 dark:text-slate-100 sm:text-lg">{selectedPatient.name}</h2>
                    <Badge variant={selectedPatient.ownership === "CENTER" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {selectedPatient.ownership === "CENTER" ? centerDisplayName : t("doctor_dashboard.patients.ownership_local")}
                    </Badge>
                    {selectedPatient.source === "clinic" && !isStaff && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openEdit}
                        className="hidden gap-1 lg:inline-flex"
                      >
                        <IconPencil className="h-3.5 w-3.5" /> {t("common.edit")}
                      </Button>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-slate-400 sm:text-sm">
                    {age != null && <span>{t("doctor_dashboard.patients.info_card.age", { age })}</span>}
                    {selectedPatient.whatsapp && (
                      <span className="flex min-w-0 items-center gap-1" dir="ltr">
                        <IconPhone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <span className="truncate">{selectedPatient.whatsapp}</span>
                      </span>
                    )}
                    {selectedPatient.allergies && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <IconExclamationTriangle className="h-3.5 w-3.5" />{selectedPatient.allergies}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4 info cards */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-0.5 text-xs text-gray-400 dark:text-slate-500">{t("doctor_dashboard.patients.info_card.last_visit_label")}</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {lastVisit
                      ? format(new Date(lastVisit.appointmentDate), "d MMM yyyy")
                      : "—"}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5",
                    selectedPatient.balance < 0
                      ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
                      : selectedPatient.balance > 0
                        ? "border-green-200 bg-green-50 dark:border-emerald-900/50 dark:bg-emerald-950/30"
                        : "border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60",
                  )}
                >
                  <div className="mb-0.5 text-xs text-gray-400 dark:text-slate-500">{t("doctor_dashboard.patients.info_card.balance_label")}</div>
                  <div
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      amountSignedColorClass(selectedPatient.balance),
                    )}
                  >
                    {formatSignedShekel(selectedPatient.balance)}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-0.5 text-xs text-gray-400 dark:text-slate-500">{t("doctor_dashboard.patients.info_card.file_type_label")}</div>
                  <div className="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
                    {selectedPatient.ownership === "CENTER" ? t("doctor_dashboard.patients.info_card.file_type_center", { name: centerDisplayName }) : t("doctor_dashboard.patients.info_card.file_type_local")}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="mb-0.5 text-xs text-gray-400 dark:text-slate-500">{t("doctor_dashboard.patients.info_card.visit_count_label")}</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    {selectedPatient.appointments.length}
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Tab content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">

              {/* ── البيانات ──────────────────────────────────── */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">{t("doctor_dashboard.patients.info_section.title")}</h3>
                    {selectedPatient.source === "clinic" && !isStaff && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openEdit}
                        className="h-7 px-3 text-xs gap-1"
                      >
                        <IconPencil className="h-3.5 w-3.5" />
                        {t("doctor_dashboard.patients.info_section.edit_btn")}
                      </Button>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                    {(
                      [
                        { label: t("doctor_dashboard.patients.info_section.file_number"),      value: selectedPatient.fileNumber },
                        { label: t("doctor_dashboard.patients.info_section.gender"),           value: selectedPatient.gender === "male" ? t("common.gender.male") : selectedPatient.gender === "female" ? t("common.gender.female") : null },
                        { label: t("doctor_dashboard.patients.info_section.dob"),            value: selectedPatient.dateOfBirth ? format(new Date(selectedPatient.dateOfBirth), "dd/MM/yyyy") : null },
                        { label: t("doctor_dashboard.patients.info_section.blood_type"),      value: selectedPatient.bloodType },
                        { label: t("doctor_dashboard.patients.info_section.address"),         value: selectedPatient.address },
                        { label: t("doctor_dashboard.patients.info_section.email"),           value: selectedPatient.email },
                        { label: t("doctor_dashboard.patients.info_section.phone"),           value: selectedPatient.whatsapp },
                      ] as { label: string; value: string | null | undefined }[]
                    ).filter((f) => f.value).map((field) => (
                      <div key={field.label} className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="text-gray-400">{field.label}</span>
                        <span className="font-medium text-gray-900 whitespace-pre-line text-right">{field.value}</span>
                      </div>
                    ))}
                    {!selectedPatient.fileNumber &&
                      !selectedPatient.gender &&
                      !selectedPatient.dateOfBirth &&
                      !selectedPatient.bloodType &&
                      !selectedPatient.address &&
                      !selectedPatient.email &&
                      !selectedPatient.whatsapp && (
                      <div className="px-5 py-8 text-center text-sm text-gray-400">{t("doctor_dashboard.patients.info_section.no_data")}</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Report Tab (Emergency) ─────────────────────── */}
              {activeTab === "report" && selectedPatient.source === "emergency" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">{t("doctor_dashboard.patients.report_section.title")}</h3>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                    {(
                      [
                        { label: t("doctor_dashboard.patients.report_section.complaint"), value: selectedPatient.emergencyReport?.complaint ?? null },
                        { label: t("doctor_dashboard.patients.report_section.notes"), value: selectedPatient.emergencyReport?.notes ?? null },
                        {
                          label: t("doctor_dashboard.patients.report_section.created_at"),
                          value: selectedPatient.emergencyReport?.createdAt
                            ? format(new Date(selectedPatient.emergencyReport.createdAt), "dd/MM/yyyy HH:mm")
                            : null,
                        },
                        {
                          label: t("doctor_dashboard.patients.report_section.amount"),
                          value:
                            selectedPatient.emergencyReport?.amount != null
                              ? `₪${Number(selectedPatient.emergencyReport.amount).toFixed(0)}`
                              : null,
                        },
                        { label: t("doctor_dashboard.patients.report_section.payment_status"), value: selectedPatient.emergencyReport?.paymentStatus ?? null },
                        { label: t("doctor_dashboard.patients.report_section.payment_method"), value: selectedPatient.emergencyReport?.paymentMethod ?? null },
                      ] as { label: string; value: string | null | undefined }[]
                    )
                      .filter((f) => f.value)
                      .map((field) => (
                        <div key={field.label} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                          <span className="text-gray-400 shrink-0">{field.label}</span>
                          <span className="font-medium text-gray-900 whitespace-pre-line text-right">{field.value}</span>
                        </div>
                      ))}

                    {!selectedPatient.emergencyReport?.complaint &&
                      !selectedPatient.emergencyReport?.notes &&
                      !selectedPatient.emergencyReport?.createdAt &&
                      selectedPatient.emergencyReport?.amount == null &&
                      !selectedPatient.emergencyReport?.paymentStatus &&
                      !selectedPatient.emergencyReport?.paymentMethod && (
                        <div className="px-5 py-8 text-center text-sm text-gray-400">{t("doctor_dashboard.patients.report_section.no_report")}</div>
                      )}
                  </div>
                </div>
              )}

              {/* ── Visits Tab ──────────────────────────────── */}
              {activeTab === "visits" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {t("doctor_dashboard.patients.visits_section.title", { count: selectedPatient.appointments.length })}
                    </h3>
                    {!addingApt && (
                      <Button size="sm" variant="outline" onClick={() => setAddingApt(true)}
                        className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50">
                        <IconPlus className="h-3.5 w-3.5" /> {t("doctor_dashboard.patients.visits_section.new_apt_btn")}
                      </Button>
                    )}
                  </div>

                  {addingApt && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                      {selectedPatient.source === "clinic" ? (
                        <>
                          <input placeholder={t("doctor_dashboard.patients.visits_section.form.title_placeholder")} value={aptTitle} onChange={(e) => setAptTitle(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <div className="grid grid-cols-3 gap-3">
                            <input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)}
                              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)}
                              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                            <select value={aptDuration} onChange={(e) => setAptDuration(e.target.value)}
                              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                              {[15,20,30,45,60,90].map((d) => <option key={d} value={d}>{t("common.time.minutes", { count: d })}</option>)}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          {canChooseChannel && (
                            <div className="grid grid-cols-2 gap-3">
                              <select value={bookingChannel} onChange={(e) => setBookingChannel(e.target.value as "CENTER" | "CLINIC")}
                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400">
                                <option value="CENTER">{t("doctor_dashboard.patients.visits_section.form.channel_center")}</option>
                                <option value="CLINIC">{t("doctor_dashboard.patients.visits_section.form.channel_clinic")}</option>
                              </select>
                              <select
                                value={bookingChannel === "CENTER" ? (centerClinicId ?? "") : selectedClinicId}
                                onChange={(e) => setSelectedClinicId(e.target.value)}
                                disabled={bookingChannel === "CENTER"}
                                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100"
                              >
                                {(bookingChannel === "CENTER"
                                  ? doctorClinics.filter((c) => c.id === centerClinicId)
                                  : ownClinics
                                ).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-3">
                            <input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)}
                              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="التاريخ" />
                            <input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)}
                              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="بداية" />
                            <input type="time" value={aptEndTime} onChange={(e) => setAptEndTime(e.target.value)}
                              className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="نهاية" />
                          </div>
                        </div>
                      )}
                      <input
                        placeholder={t("doctor_dashboard.patients.visits_section.form.notes_placeholder")}
                        value={aptNotes}
                        onChange={(e) => setAptNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveApt} disabled={savingApt}>
                          {savingApt ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : t("common.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingApt(false)}>{t("common.cancel")}</Button>
                      </div>
                    </div>
                  )}

                  {selectedPatient.appointments.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
                      {t("doctor_dashboard.patients.visits_section.no_visits")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedPatient.appointments.map((apt) => {
                        const dateStr = apt.appointmentDate;
                        const statusMap = getAptStatus(t);
                        const cfg = statusMap[apt.status] ?? statusMap.SCHEDULED;
                        const Icon = cfg.icon;
                        return (
                          <div key={apt.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 hover:border-blue-100 transition-colors">
                            <div className="min-w-[52px] text-center">
                              <div className="text-xs font-bold text-gray-700">{format(new Date(dateStr), "dd/MM")}</div>
                              <div className="text-xs text-blue-500">{apt.startTime?.slice(0,5) ?? ""}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {apt.title ?? t("doctor_dashboard.patients.visits_section.default_title", { date: format(new Date(dateStr), "dd/MM/yyyy") })}
                              </p>
                              <p className="text-xs text-gray-400">
                                {apt.duration ? t("common.time.minutes", { count: apt.duration }) : apt.fee ? t("doctor_dashboard.patients.visits_section.fee_label", { amount: apt.fee }) : ""}
                              </p>
                              {apt.notes && (
                                <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                                  {apt.notes}
                                </p>
                              )}
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

              {/* ── Transactions Tab ─────────────────────────────────── */}
              {activeTab === "transactions" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center dark:border-red-900/40 dark:bg-red-950/25">
                      <div className="text-xs text-red-500 dark:text-red-400">{t("doctor_dashboard.patients.tx_section.summary.services")}</div>
                      <div className={cn("mt-0.5 text-base font-bold tabular-nums", amountSignedColorClass(totalServices))}>
                        {formatSignedShekel(totalServices)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/25">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">{t("doctor_dashboard.patients.tx_section.summary.payments")}</div>
                      <div className={cn("mt-0.5 text-base font-bold tabular-nums", amountSignedColorClass(totalPayments))}>
                        {formatSignedShekel(totalPayments)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-3 text-center",
                        selectedPatient.balance < 0
                          ? "border-red-100 bg-red-50 dark:border-red-900/40 dark:bg-red-950/25"
                          : "border-green-100 bg-green-50 dark:border-emerald-900/40 dark:bg-emerald-950/25",
                      )}
                    >
                      <div className="text-xs text-gray-400 dark:text-slate-500">{t("doctor_dashboard.patients.tx_section.summary.balance")}</div>
                      <div className={cn("mt-0.5 text-base font-bold tabular-nums", amountSignedColorClass(selectedPatient.balance))}>
                        {formatSignedShekel(selectedPatient.balance)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={printPatientTransactionsPdf}
                        disabled={!selectedPatient.transactions.length}
                        className="gap-1"
                      >
                        <IconPrinter className="h-3.5 w-3.5" />
                        {t("doctor_dashboard.patients.tx_section.print_btn")}
                      </Button>
                      {!isStaff && !addingService && (
                        <Button size="sm" variant="outline" onClick={() => setAddingService(true)}
                          className="gap-1 border-red-200 text-red-600 hover:bg-red-50">
                          <IconPlus className="h-3.5 w-3.5" /> {t("doctor_dashboard.patients.tx_section.new_service_btn")}
                        </Button>
                      )}
                      {!isStaff && !addingPayment && (
                        <Button size="sm" variant="outline" onClick={() => setAddingPayment(true)}
                          className="gap-1 border-green-200 text-green-600 hover:bg-green-50">
                          <IconPlus className="h-3.5 w-3.5" /> {t("doctor_dashboard.patients.tx_section.new_payment_btn")}
                        </Button>
                      )}
                  </div>

                  {!isStaff && addingService && (
                    <div className="rounded-xl border border-red-200 bg-red-50/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder={t("doctor_dashboard.patients.tx_section.form.service_placeholder")} value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                        <div className="flex gap-1">
                          <span className="flex items-center shrink-0 rounded-lg border border-gray-200 bg-gray-100 px-2 text-sm text-gray-600">₪</span>
                          <input type="number" placeholder={t("doctor_dashboard.patients.tx_section.form.amount_placeholder")} value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                        </div>
                      </div>
                      <input placeholder={t("common.notes")} value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveService} disabled={savingService} className="bg-red-600 hover:bg-red-700">
                          {savingService ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : t("common.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingService(false)}>{t("common.cancel")}</Button>
                      </div>
                    </div>
                  )}

                  {!isStaff && addingPayment && (
                    <div className="rounded-xl border border-green-200 bg-green-50/30 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder={t("doctor_dashboard.patients.tx_section.form.payment_placeholder")} value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)}
                          className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                        <div className="flex gap-1">
                          <span className="flex items-center shrink-0 rounded-lg border border-gray-200 bg-gray-100 px-2 text-sm text-gray-600">₪</span>
                          <input type="number" placeholder={t("doctor_dashboard.patients.tx_section.form.amount_placeholder")} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                        </div>
                      </div>
                      <input placeholder={t("common.notes")} value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={savePayment} disabled={savingPayment} className="bg-green-600 hover:bg-green-700">
                          {savingPayment ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : t("common.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAddingPayment(false)}>{t("common.cancel")}</Button>
                      </div>
                    </div>
                  )}

                  {selectedPatient.transactions.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-400">
                      {t("doctor_dashboard.patients.tx_section.no_transactions")}
                    </div>
                  ) : (
                    <div className="table-scroll-mobile -mx-2 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2 sm:mx-0 sm:px-0 dark:border-slate-700 dark:bg-slate-900/90">
                      <table className={cn("w-full text-sm", isStaff ? "min-w-[480px]" : "min-w-[520px]")}>
                        <thead className="border-b border-gray-100 bg-gray-50 text-right text-xs text-gray-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium">{t("common.date")}</th>
                            <th className="px-4 py-3 font-medium">{t("common.description")}</th>
                            <th className="px-4 py-3 text-center font-medium text-red-500 dark:text-red-400">{t("doctor_dashboard.patients.tx_section.table.debts")}</th>
                            <th className="px-4 py-3 text-center font-medium text-emerald-600 dark:text-emerald-400">{t("doctor_dashboard.patients.tx_section.table.payments")}</th>
                            {!isStaff && <th className="w-20 px-4 py-3" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/80">
                          {selectedPatient.transactions.map((tx) => {
                            const isEditing = editTx?.id === tx.id;
                            const svcSigned =
                              tx.type === "SERVICE" ? transactionSignedDelta(tx) : 0;
                            const paySigned = tx.type === "PAYMENT" ? transactionSignedDelta(tx) : 0;
                            return (
                              <tr
                                key={tx.id}
                                className={cn(
                                  "transition-colors",
                                  isEditing ? "bg-blue-50/40 dark:bg-blue-950/30" : "hover:bg-gray-50/50 dark:hover:bg-slate-800/50",
                                )}
                              >
                                {isEditing && !isStaff ? (
                                  /* ── Inline edit row ── */
                                  <>
                                    <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                                      {format(new Date(tx.date), "dd/MM/yyyy")}
                                    </td>
                                    <td className="px-4 py-2" colSpan={2}>
                                      <div className="flex flex-col gap-1.5">
                                        <input
                                          value={editTx.description}
                                          onChange={(e) => setEditTx((p) => p && ({ ...p, description: e.target.value }))}
                                          className="h-8 w-full rounded-lg border border-blue-300 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                                          placeholder={t("common.description")}
                                        />
                                        <input
                                          value={editTx.notes}
                                          onChange={(e) => setEditTx((p) => p && ({ ...p, notes: e.target.value }))}
                                          className="h-7 w-full rounded-lg border border-gray-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                                          placeholder={t("common.notes_optional")}
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
                                          title={t("common.save")}>
                                          {savingEdit ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : <IconCheck className="h-3.5 w-3.5" />}
                                        </button>
                                        <button onClick={() => setEditTx(null)}
                                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                          title={t("common.cancel")}>
                                          <IconX className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  /* ── Normal row ── */
                                  <>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400 dark:text-slate-500">
                                      {format(new Date(tx.date), "dd/MM/yyyy")}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        {tx.type === "SERVICE"
                                          ? <IconTrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400 dark:text-red-400" />
                                          : <IconTrendingUp   className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />}
                                        <span className="font-medium text-gray-900 dark:text-slate-100">{tx.description}</span>
                                      </div>
                                      {tx.notes && <p className="mr-5 mt-0.5 text-xs text-gray-400 dark:text-slate-500">{tx.notes}</p>}
                                    </td>
                                    <td className={cn("px-4 py-3 text-center font-bold tabular-nums", tx.type === "SERVICE" ? amountSignedColorClass(svcSigned) : "text-slate-400 dark:text-slate-600")}>
                                      {tx.type === "SERVICE" ? formatSignedShekel(svcSigned) : "—"}
                                    </td>
                                    <td className={cn("px-4 py-3 text-center font-bold tabular-nums", tx.type === "PAYMENT" ? amountSignedColorClass(paySigned) : "text-slate-400 dark:text-slate-600")}>
                                      {tx.type === "PAYMENT" ? formatSignedShekel(paySigned) : "—"}
                                    </td>
                                    {!isStaff && (
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => startEdit(tx)}
                                            title={t("common.edit")}
                                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                                          >
                                            <IconPencil className="h-3 w-3" />
                                            {t("common.edit")}
                                          </button>
                                          <button
                                            onClick={() => setConfirmDeleteId(tx.id)}
                                            title={t("common.delete")}
                                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100"
                                          >
                                            <IconTrash className="h-3 w-3" />
                                            {t("common.delete")}
                                          </button>
                                        </div>
                                      </td>
                                    )}
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

              {activeTab === "medical" && selectedPatient && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-gray-50 bg-gray-50/30 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconClipboardText className="h-4 w-4 text-blue-600" />
                          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{t("doctor_dashboard.patients.medical_section.title")}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setImagingOpen(true);
                              setImagingForm({ title: t("doctor_dashboard.patients.medical_section.imaging_new_title"), notes: "", file: null });
                            }}
                            className="gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                            title={t("doctor_dashboard.patients.medical_section.imaging_btn_title")}
                          >
                            <IconPlus className="h-3.5 w-3.5" />
                            {t("doctor_dashboard.patients.medical_section.imaging_btn")}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              printMedicalReportPdf();
                            }}
                            className="gap-1 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            disabled={!selectedPatient.medicalNotes || selectedPatient.medicalNotes.length === 0}
                            title={t("doctor_dashboard.patients.medical_section.report_btn_title")}
                          >
                            <IconPrinter className="h-3.5 w-3.5" />
                            {t("doctor_dashboard.patients.medical_section.report_btn")}
                          </Button>

                          {!addingMedical && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAddingMedical(true);
                                setMedicalAllergies("");
                                setMedicalDiagnosis("");
                                setMedicalTreatment("");
                                setMedicalReport({
                                  presentingComplaints: "",
                                  medicalHistory: "",
                                  bp: "",
                                  temp: "",
                                  pulse: "",
                                  physicalExamination: "",
                                  investigations: "",
                                  diagnosis: "",
                                  icd10: "",
                                  recommendations: "",
                                  sickLeaveDays: "",
                                  sickLeaveNotes: "",
                                });
                              }}
                              className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <IconPlus className="h-3.5 w-3.5" /> {t("doctor_dashboard.patients.medical_section.add_notes_btn")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-4 space-y-4">
                      {/* Care Plan & Imaging Grid Section */}
                      <div className="mb-6">
                        <MedicalFilesCarePlanTable
                          patientId={selectedPatient.id}
                          patientSource={selectedPatient.source === "clinic" ? "clinic" : "platform"}
                          carePlanType={carePlanType}
                          patientName={selectedPatient.name}
                          doctorDisplayName={doctorDisplayName || ""}
                          reloadKey={imagingReloadKey}
                          onPlanLoaded={onCarePlanSummaryLoaded}
                          patientPrintDemographics={{
                            fileNumber: selectedPatient.fileNumber,
                            gender: selectedPatient.gender,
                            dateOfBirth: selectedPatient.dateOfBirth,
                          }}
                        />
                      </div>

                      {addingMedical && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4 text-right" dir="rtl">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                               <label className="mb-1 block text-[11px] font-bold text-gray-600">{t("doctor_dashboard.patients.medical_section.form.allergies_label")}</label>
                               <input
                                 value={medicalAllergies}
                                 onChange={(e) => setMedicalAllergies(e.target.value)}
                                 placeholder={t("doctor_dashboard.patients.medical_section.form.allergies_placeholder")}
                                 className="h-9 w-full rounded-lg border border-red-200 bg-red-50/20 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                               />
                            </div>
                            <div>
                               <label className="mb-1 block text-[11px] font-bold text-gray-600">{t("doctor_dashboard.patients.medical_section.form.complaints_label")}</label>
                               <input
                                 value={medicalReport.presentingComplaints}
                                 onChange={(e) => setMedicalReport(p => ({...p, presentingComplaints: e.target.value}))}
                                 placeholder={t("doctor_dashboard.patients.medical_section.form.complaints_placeholder")}
                                 className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                               />
                            </div>
                          </div>
                          <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-3 space-y-3">
                            <div className="flex items-center gap-2 mb-1 text-[11px] font-bold text-indigo-800">{t("doctor_dashboard.patients.medical_section.form.vitals_section")}</div>
                            <div className="grid grid-cols-3 gap-3">
                              <input placeholder={t("doctor_dashboard.patients.medical_section.form.vitals.bp")} value={medicalReport.bp} onChange={e => setMedicalReport(p => ({...p, bp: e.target.value}))} className="h-8 rounded-lg border border-indigo-200 px-2 text-[11px] text-center" />
                              <input placeholder={t("doctor_dashboard.patients.medical_section.form.vitals.temp")} value={medicalReport.temp} onChange={e => setMedicalReport(p => ({...p, temp: e.target.value}))} className="h-8 rounded-lg border border-indigo-200 px-2 text-[11px] text-center" />
                              <input placeholder={t("doctor_dashboard.patients.medical_section.form.vitals.pulse")} value={medicalReport.pulse} onChange={e => setMedicalReport(p => ({...p, pulse: e.target.value}))} className="h-8 rounded-lg border border-indigo-200 px-2 text-[11px] text-center" />
                            </div>
                            <textarea
                              value={medicalReport.physicalExamination}
                              onChange={(e) => setMedicalReport(p => ({...p, physicalExamination: e.target.value}))}
                              rows={2}
                              placeholder={t("doctor_dashboard.patients.medical_section.form.physical_exam_placeholder")}
                              className="w-full resize-none rounded-lg border border-indigo-200 p-2 text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-gray-600">{t("doctor_dashboard.patients.medical_section.form.investigations_label")}</label>
                              <textarea
                                value={medicalReport.investigations}
                                onChange={(e) => setMedicalReport(p => ({...p, investigations: e.target.value}))}
                                rows={2}
                                placeholder={t("doctor_dashboard.patients.medical_section.form.investigations_placeholder")}
                                className="w-full resize-none rounded-lg border border-gray-300 p-2 text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-gray-600">{t("doctor_dashboard.patients.medical_section.form.diagnosis_label")}</label>
                              <textarea
                                value={medicalReport.diagnosis}
                                onChange={(e) => setMedicalReport(p => ({...p, diagnosis: e.target.value}))}
                                rows={2}
                                placeholder={t("doctor_dashboard.patients.medical_section.form.diagnosis_placeholder")}
                                className="w-full resize-none rounded-lg border border-emerald-300 p-2 text-xs"
                              />
                              <input
                                value={medicalReport.icd10}
                                onChange={(e) => setMedicalReport(p => ({...p, icd10: e.target.value}))}
                                placeholder="ICD-10 Code"
                                className="h-7 w-full mt-1.5 rounded-lg border border-gray-200 px-3 text-[10px] text-left"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-[11px] font-bold text-gray-600">{t("doctor_dashboard.patients.medical_section.form.treatment_label")}</label>
                              <textarea
                                value={medicalReport.recommendations}
                                onChange={(e) => setMedicalReport(p => ({...p, recommendations: e.target.value}))}
                                rows={3}
                                placeholder={t("doctor_dashboard.patients.medical_section.form.treatment_placeholder")}
                                className="w-full resize-none rounded-lg border border-amber-300 p-2 text-xs bg-amber-50/30"
                              />
                            </div>
                            <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-3">
                              <label className="mb-1 block text-[11px] font-bold text-rose-800">{t("doctor_dashboard.patients.medical_section.form.sick_leave_title")}</label>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px]">{t("doctor_dashboard.patients.medical_section.form.days_label")}</span>
                                <input type="number" min={0} value={medicalReport.sickLeaveDays} onChange={(e) => setMedicalReport(p => ({...p, sickLeaveDays: e.target.value}))} className="h-7 w-12 rounded border border-rose-200 text-center text-xs" />
                              </div>
                              <textarea value={medicalReport.sickLeaveNotes} onChange={(e) => setMedicalReport(p => ({...p, sickLeaveNotes: e.target.value}))} rows={1} placeholder={t("common.notes")} className="w-full resize-none rounded-lg border border-rose-200 p-2 text-[10px]" />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-gray-100">
                            <Button size="sm" onClick={async () => {
                              setSavingMedical(true);
                              try {
                                const reportTag = "STRUCTURED_REPORT_V1:";
                                const reportJson = JSON.stringify(medicalReport);
                                const res = await fetch(`/api/clinic/patients/${selectedPatient.id}/medical-notes`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    allergies: medicalAllergies,
                                    diagnosis: reportTag + reportJson,
                                    treatment: medicalReport.recommendations,
                                  }),
                                });
                                if (res.ok) {
                                  toast.success(t("common.saved_success"));
                                  setAddingMedical(false);
                                  router.refresh();
                                }
                              } finally { setSavingMedical(false); }
                            }} disabled={savingMedical}>
                              {savingMedical ? <IconLoader className="h-3.5 w-3.5 animate-spin" /> : t("common.save")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setAddingMedical(false)}>{t("common.cancel")}</Button>
                          </div>
                        </div>
                      )}

                      {selectedPatient.medicalNotes && selectedPatient.medicalNotes.length > 0 && (
                        <div className="space-y-3">
                          {selectedPatient.medicalNotes.map((note) => {
                            const isEditing = editingMedicalId === note.id;
                            const isStructured = note.diagnosis?.startsWith("STRUCTURED_REPORT_V1:");
                            let structuredData: any = null;
                            if (isStructured && note.diagnosis) {
                              try { structuredData = JSON.parse(note.diagnosis.replace("STRUCTURED_REPORT_V1:", "")); } catch(e) {}
                            }
                            return (
                              <div key={note.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-right" dir="rtl">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-[11px] text-gray-400">
                                    {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                                    {isStructured && <span className="mr-2 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600">{t("doctor_dashboard.patients.medical_section.official_report_tag")}</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {!isEditing && (
                                      <button onClick={() => {
                                        setEditingMedicalId(note.id);
                                        setEditMedicalAllergies(note.allergies ?? "");
                                        if (isStructured) { setEditMedicalReport(structuredData); }
                                        else { setEditMedicalReport(null); setEditMedicalDiagnosis(note.diagnosis ?? ""); setEditMedicalTreatment(note.treatment ?? ""); }
                                      }} className="text-gray-600 hover:text-blue-600"><IconPencil className="h-3 w-3" /></button>
                                    )}
                                    <button onClick={() => setConfirmDeleteId(`note_${note.id}`)} className="text-red-400 hover:text-red-600"><IconTrash className="h-3 w-3" /></button>
                                  </div>
                                </div>

                                {isEditing ? (
                                  <div className="space-y-3">
                                    {editMedicalReport ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/20">
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-bold text-blue-700">{t("doctor_dashboard.patients.medical.allergies_label")}</label>
                                          <input value={editMedicalAllergies} onChange={e => setEditMedicalAllergies(e.target.value)} className="h-8 w-full rounded border px-2 text-xs"/>
                                          <label className="text-[10px] font-bold text-blue-700">{t("doctor_dashboard.patients.medical.complaint_label")}</label>
                                          <textarea value={editMedicalReport.presentingComplaints} onChange={e => setEditMedicalReport({...editMedicalReport, presentingComplaints: e.target.value})} rows={2} className="w-full rounded border p-1.5 text-xs"/>
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-bold text-blue-700">{t("doctor_dashboard.patients.medical.diagnosis_label")}</label>
                                          <textarea value={editMedicalReport.diagnosis} onChange={e => setEditMedicalReport({...editMedicalReport, diagnosis: e.target.value})} rows={2} className="w-full rounded border p-1.5 text-xs"/>
                                          <label className="text-[10px] font-bold text-blue-700">{t("doctor_dashboard.patients.medical.treatment_label")}</label>
                                          <textarea value={editMedicalReport.recommendations} onChange={e => setEditMedicalReport({...editMedicalReport, recommendations: e.target.value})} rows={2} className="w-full rounded border p-1.5 text-xs"/>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <input value={editMedicalAllergies} onChange={e => setEditMedicalAllergies(e.target.value)} className="h-8 w-full rounded border px-2"/>
                                        <textarea value={editMedicalDiagnosis} onChange={e => setEditMedicalDiagnosis(e.target.value)} rows={2} className="w-full rounded border p-2"/>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={async () => {
                                        setSavingMedicalEdit(true);
                                        try {
                                          const finalDiag = editMedicalReport ? "STRUCTURED_REPORT_V1:" + JSON.stringify(editMedicalReport) : editMedicalDiagnosis;
                                          const res = await fetch(`/api/clinic/medical-notes/${note.id}`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ allergies: editMedicalAllergies, diagnosis: finalDiag }),
                                          });
                                          if (res.ok) { setEditingMedicalId(null); router.refresh(); }
                                        } finally { setSavingMedicalEdit(false); }
                                      }}>{t("doctor_dashboard.patients.medical.save_edits")}</Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingMedicalId(null)}>{t("common.cancel")}</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {isStructured && structuredData ? (
                                      <div className="space-y-3">
                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-right" dir="rtl">
                                           <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-2.5">
                                             <div className="font-bold text-blue-700 text-[11px] mb-1.5 border-b border-blue-100 pb-1">{t("doctor_dashboard.patients.medical.complaints_full")}</div>
                                             <div className="text-[11px] leading-relaxed">{structuredData.presentingComplaints || "—"}</div>
                                           </div>
                                           
                                           <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5">
                                             <div className="font-bold text-indigo-700 text-[11px] mb-1.5 border-b border-indigo-100 pb-1">{t("doctor_dashboard.patients.medical.vitals_title")}</div>
                                             <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                               {structuredData.bp && <div><span className="text-gray-400">{t("doctor_dashboard.patients.medical.bp")}</span> <span className="font-bold">{structuredData.bp}</span></div>}
                                               {structuredData.temp && <div><span className="text-gray-400">{t("doctor_dashboard.patients.medical.temp")}</span> <span className="font-bold text-red-600">{structuredData.temp}°C</span></div>}
                                               {structuredData.pulse && <div><span className="text-gray-400">{t("doctor_dashboard.patients.medical.pulse")}</span> <span className="font-bold text-blue-600">{structuredData.pulse}</span></div>}
                                             </div>
                                             <div className="mt-2 pt-2 border-t border-indigo-50 text-[10px] italic text-gray-500 line-clamp-2">{structuredData.physicalExamination}</div>
                                           </div>

                                           <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 border-r-4 border-r-emerald-500">
                                             <div className="font-bold text-emerald-700 text-[11px] mb-1.5 border-b border-emerald-100 pb-1">{t("doctor_dashboard.patients.medical.diagnosis_and_icd")}</div>
                                             <div className="text-[11px] font-bold text-gray-900">{structuredData.diagnosis || "—"}</div>
                                             {structuredData.icd10 && <div className="mt-1 text-[9px] bg-emerald-100 w-fit px-1.5 py-0.5 rounded font-mono">ICD: {structuredData.icd10}</div>}
                                           </div>
                                         </div>

                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-right" dir="rtl">
                                           <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
                                             <div className="font-bold text-amber-700 text-[11px] mb-1 border-b border-amber-100 pb-1">{t("doctor_dashboard.patients.medical.treatment_label")}</div>
                                             <div className="text-[11px] whitespace-pre-line leading-relaxed">{structuredData.recommendations || "—"}</div>
                                           </div>
                                           
                                           {(structuredData.sickLeaveDays || structuredData.investigations) && (
                                             <div className="rounded-lg border border-gray-100 bg-white p-2.5">
                                               {structuredData.investigations && (
                                                 <div className="mb-2">
                                                   <div className="font-bold text-gray-600 text-[11px] mb-1">{t("doctor_dashboard.patients.medical.investigations_label")}</div>
                                                   <div className="text-[11px] text-gray-500">{structuredData.investigations}</div>
                                                 </div>
                                               )}
                                               {structuredData.sickLeaveDays && (
                                                 <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-2 py-1 rounded-md w-fit">
                                                   <IconClock className="h-3 w-3" />
                                                   <span className="text-[10px] font-bold">{t("doctor_dashboard.patients.medical.sick_leave_count", { count: structuredData.sickLeaveDays })}</span>
                                                 </div>
                                               )}
                                             </div>
                                           )}
                                         </div>
                                      </div>
                                    ) : (
                                      <div className="whitespace-pre-line bg-white/50 p-3 rounded-lg border border-gray-200">{note.diagnosis}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedPatient.appointments.some((a) => a.notes) && (
                      <div className="px-5 py-4 border-t border-gray-50">
                        <div className="text-sm font-semibold text-gray-900 mb-2">{t("doctor_dashboard.patients.medical.visits_history")}</div>
                        <div className="space-y-3">
                          {selectedPatient.appointments.filter((a) => a.notes).map((apt) => (
                            <div key={apt.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                              <div className="font-semibold mb-1">{format(new Date(apt.appointmentDate), "dd/MM/yyyy")}</div>
                              <div className="whitespace-pre-line">{apt.notes}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── خطة العلاج حسب التخصص (عيادة + منصة؛ أطباء الأسنان العامون يستخدمون تبويب مخطط الأسنان فقط) ─ */}
              {activeTab === "careplan" && !isDentist && selectedPatient.source !== "emergency" && (
                <div className="space-y-4">
                  <CarePlanPanel
                    patientId={selectedPatient.id}
                    patientSource={selectedPatient.source === "clinic" ? "clinic" : "platform"}
                    carePlanType={carePlanType}
                    patientName={selectedPatient.name}
                    doctorDisplayName={doctorDisplayName}
                    patientPrintDemographics={{
                      fileNumber: selectedPatient.fileNumber,
                      gender: selectedPatient.gender,
                      dateOfBirth: selectedPatient.dateOfBirth,
                      guardian: null,
                    }}
                  />
                </div>
              )}

              {/* ── مخطط الأسنان (طبيب أسنان عام — تبويب منفصل) ───────── */}
              {activeTab === "dental" && showDentalToothChart && selectedPatient && selectedPatient.source !== "emergency" && (
                <DentalToothChartBlock
                  clinicPatientId={selectedPatient.id}
                  patientSource={selectedPatient.source === "clinic" ? "clinic" : "platform"}
                  heading="خطة علاج الأسنان"
                />
              )}

            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-300">
            <IconUsers className="mb-4 h-16 w-16" />
            <p className="text-sm text-gray-400">اختر مريضاً من القائمة</p>
            <p className="mt-1 text-xs text-gray-300">أو أضف مريضاً جديداً</p>
          </div>
        )}
      </div>

      {/* ══ COLUMN 3 (LEFT) — Tabs: شريط أفقي على الجوال، عمودي على الشاشات الكبيرة ══════════════════════ */}
      <div className="order-2 flex w-full shrink-0 flex-col border-b border-gray-200 bg-white lg:order-none lg:h-full lg:w-44 lg:border-b-0 lg:border-r">
        <div className="hidden shrink-0 border-b border-gray-100 px-4 py-3 lg:block">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">القائمة</span>
        </div>
        <div className="flex gap-1 overflow-x-auto overscroll-x-contain px-1.5 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={!selectedPatient}
              onClick={() => selectedPatient && setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-right text-xs font-medium transition-colors lg:w-full lg:gap-3 lg:rounded-none lg:border-0 lg:border-r-[3px] lg:px-4 lg:py-4 lg:text-sm",
                !selectedPatient
                  ? "cursor-not-allowed border-transparent text-gray-300"
                  : activeTab === tab.id
                    ? "border-blue-200 bg-blue-50 text-blue-600 lg:border-blue-600"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 lg:border-transparent",
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Dialog
        open={imagingOpen}
        onOpenChange={(o) => {
          setImagingOpen(o);
          if (!o) setImagingSubmitting(false);
        }}
      >
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("doctor_dashboard.patients.dialogs.imaging.title")}</DialogTitle>
            <DialogDescription>
              {t("doctor_dashboard.patients.dialogs.imaging.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{t("common.title")}</label>
              <input
                value={imagingForm.title}
                onChange={(e) => setImagingForm((p) => ({ ...p, title: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder={t("doctor_dashboard.patients.dialogs.imaging.title_placeholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{t("common.notes_optional")}</label>
              <input
                value={imagingForm.notes}
                onChange={(e) => setImagingForm((p) => ({ ...p, notes: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder={t("doctor_dashboard.patients.dialogs.imaging.notes_placeholder")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-200">{t("common.file")}</label>
              <input
                type="file"
                accept="image/*,application/pdf,.dcm,application/dicom,application/octet-stream"
                onChange={(e) => setImagingForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                className="block w-full text-sm text-gray-700 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-slate-200"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                {t("doctor_dashboard.patients.dialogs.imaging.dicom_note")}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImagingOpen(false)}
              disabled={imagingSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={imagingSubmitting || !selectedPatient || !imagingForm.file || !imagingForm.title.trim()}
              onClick={async () => {
                if (!selectedPatient) return;
                if (!imagingForm.file?.size) {
                  toast.error(t("doctor_dashboard.patients.dialogs.imaging.error_no_file"));
                  return;
                }
                if (!imagingForm.title.trim()) {
                  toast.error(t("doctor_dashboard.patients.dialogs.imaging.error_no_title"));
                  return;
                }
                setImagingSubmitting(true);
                try {
                  const fd = new FormData();
                  fd.append("patientSource", selectedPatient.source);
                  fd.append("patientId", selectedPatient.id);
                  fd.append("planType", carePlanType);
                  fd.append("title", imagingForm.title.trim());
                  if (imagingForm.notes.trim()) fd.append("notes", imagingForm.notes.trim());
                  fd.append("file", imagingForm.file);
                  const res = await fetch("/api/doctor/patient-imaging", { method: "POST", body: fd });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    toast.error(j.error || t("doctor_dashboard.patients.dialogs.imaging.error_upload"));
                    return;
                  }
                  toast.success(t("doctor_dashboard.patients.dialogs.imaging.success_upload"));
                  setImagingOpen(false);
                  setImagingReloadKey((k) => k + 1);
                } catch {
                  toast.error(t("doctor_dashboard.patients.toasts.conn_error"));
                } finally {
                  setImagingSubmitting(false);
                }
              }}
              className="gap-2"
            >
              {imagingSubmitting ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
              رفع وربط بالملف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ ADD PATIENT MODAL ════════════════════════════════════ */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("doctor_dashboard.patients.dialogs.add.title")}</h2>
              <button type="button" onClick={() => setAddOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddPatient} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label={t("doctor_dashboard.patients.dialogs.add.name_label")} placeholder={t("doctor_dashboard.patients.dialogs.add.name_placeholder")} value={addForm.name} onChange={(e) => setAdd("name", e.target.value)} />
                <Input label={t("doctor_dashboard.patients.dialogs.add.file_number_label")} placeholder={t("doctor_dashboard.patients.dialogs.add.file_number_placeholder")} value={addForm.fileNumber} onChange={(e) => setAdd("fileNumber", e.target.value)} />
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
              <Input label={t("common.email")} type="email" placeholder="email@example.com" value={addForm.email} onChange={(e) => setAdd("email", e.target.value)} dir="ltr" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("doctor_dashboard.patients.info_section.gender")}</label>
                  <select value={addForm.gender} onChange={(e) => setAdd("gender", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— {t("common.choose")} —</option>
                    <option value="male">{t("common.gender.male")}</option>
                    <option value="female">{t("common.gender.female")}</option>
                  </select>
                </div>
                <Input label={t("doctor_dashboard.patients.info_section.dob")} type="date" value={addForm.dateOfBirth} onChange={(e) => setAdd("dateOfBirth", e.target.value)} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("doctor_dashboard.patients.info_section.blood_type")}</label>
                  <select value={addForm.bloodType} onChange={(e) => setAdd("bloodType", e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— {t("common.choose")} —</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <Input label={t("doctor_dashboard.patients.info_section.address")} placeholder={t("doctor_dashboard.patients.dialogs.add.address_placeholder")} value={addForm.address} onChange={(e) => setAdd("address", e.target.value)} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={addLoading}>
                  {addLoading ? <><IconLoader className="ml-2 h-4 w-4 animate-spin" />{t("common.saving")}...</> : t("doctor_dashboard.patients.dialogs.add.submit_btn")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
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
              <h2 className="text-lg font-semibold text-gray-900">{t("doctor_dashboard.patients.dialogs.edit.title")}</h2>
              <button type="button" onClick={() => setEditOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditPatient} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label={t("doctor_dashboard.patients.dialogs.edit.name_label")} placeholder={t("doctor_dashboard.patients.dialogs.edit.name_placeholder")} value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                <Input label={t("doctor_dashboard.patients.dialogs.edit.file_number_label")} placeholder={t("doctor_dashboard.patients.dialogs.edit.file_number_placeholder")} value={editForm.fileNumber} onChange={(e) => setEditForm((p) => ({ ...p, fileNumber: e.target.value }))} />
              </div>
              <Input label={t("common.phone")} placeholder={t("doctor_dashboard.patients.dialogs.edit.phone_placeholder")} value={editForm.whatsapp} onChange={(e) => setEditForm((p) => ({ ...p, whatsapp: e.target.value }))} dir="ltr" />
              <Input label={t("common.email")} type="email" placeholder="email@example.com" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} dir="ltr" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("doctor_dashboard.patients.info_section.gender")}</label>
                  <select value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— {t("common.choose")} —</option>
                    <option value="male">{t("common.gender.male")}</option>
                    <option value="female">{t("common.gender.female")}</option>
                  </select>
                </div>
                <Input label={t("doctor_dashboard.patients.info_section.dob")} type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("doctor_dashboard.patients.info_section.blood_type")}</label>
                  <select value={editForm.bloodType} onChange={(e) => setEditForm((p) => ({ ...p, bloodType: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— {t("common.choose")} —</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <Input label={t("doctor_dashboard.patients.info_section.address")} placeholder={t("doctor_dashboard.patients.dialogs.edit.address_placeholder")} value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={editLoading}>
                  {editLoading ? <><IconLoader className="ml-2 h-4 w-4 animate-spin" />{t("common.saving")}...</> : t("common.save_changes")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
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
                <IconTrash className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{t("common.confirm_delete")}</p>
                <p className="text-xs text-gray-500">{t("common.cannot_undo")}</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700">
                {confirmDeleteId === "clear-notes"
                  ? t("doctor_dashboard.patients.dialogs.delete.confirm_clear_notes")
                  : confirmDeleteId?.startsWith("note_")
                  ? t("doctor_dashboard.patients.dialogs.delete.confirm_note")
                  : t("doctor_dashboard.patients.dialogs.delete.confirm_tx")}
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
                {deleting ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                {deleting ? `${t("common.deleting")}...` : t("common.yes_delete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

