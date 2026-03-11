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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PatientListItem, SelectedPatient, AppointmentRow, TransactionRow } from "./page";

/* ─── Tab definitions ────────────────────────────────────────────── */
const BASE_TABS = [
  { id: "info",         label: "البيانات",       icon: User },
  { id: "visits",       label: "سجل الزيارات",   icon: Calendar },
  { id: "transactions", label: "المعاملات",       icon: Receipt },
  { id: "medical",      label: "الملفات الطبية", icon: FileText },
];

const DENTAL_PROBLEMS: { id: string; label: string; color: string }[] = [
  { id: "FILLING",    label: "حشوة",   color: "bg-green-500" },
  { id: "RCT",        label: "عصب",    color: "bg-red-500" },
  { id: "CROWN",      label: "تاج",    color: "bg-purple-500" },
  { id: "IMPLANT",    label: "زرعة",   color: "bg-orange-500" },
  { id: "EXTRACTION", label: "خلع",    color: "bg-rose-500" },
  { id: "ORTHO",      label: "تقويم",  color: "bg-blue-500" },
  { id: "BLEACHING",  label: "تبييض",  color: "bg-cyan-500" },
  { id: "SCALING",    label: "تنظيف",  color: "bg-teal-500" },
  { id: "OTHER",      label: "أخرى",  color: "bg-yellow-500" },
];

/* أيقونة السن الموحدة — icon666.com — لجميع الأسنان */
const TOOTH_ICON_PATH = "m328.179 0c-24.301 0-48.562 5.537-72.166 16.464-23.604-10.927-47.865-16.464-72.166-16.464-29.214 0-61.277 7.795-85.958 27.465-3.239 2.582-3.772 7.301-1.191 10.54 2.583 3.24 7.3 3.772 10.54 1.19 31.705-25.27 87.139-34.248 141.276-9.669v3.223c0 4.143 3.358 7.5 7.5 7.5s7.5-3.357 7.5-7.5v-3.223c21.235-9.641 42.968-14.526 64.665-14.526 121.121 0 157.052 139.411 88.845 231.763-8.882 11.845-10.82 46.142-12.09 64.017-3.276 46.125-10.624 115.807-33.228 156.168-11.212 20.02-24.335 29.85-40.021 30.053-23.798 0-41.207-46.824-45.424-71.976-11.587-69.101-10.841-64.882-11.075-65.633-2.662-8.581-10.188-14.125-19.173-14.125h-21.924c-4.142 0-7.5 3.357-7.5 7.5s3.358 7.5 7.5 7.5h2.543c-.007.036-.019.07-.025.106-11.282 67.278-12.088 83.621-25.835 109.293-9.848 18.393-19.802 27.334-30.333 27.335-56.745-.733-69.361-130.144-73.346-186.223-2.057-28.947-4.387-53.744-12.056-63.971-45.677-61.846-43.077-140.02-7.303-187.478 2.494-3.308 1.833-8.01-1.474-10.504-3.309-2.493-8.011-1.835-10.503 1.475-40.329 53.498-41.894 138.926 7.247 205.463 5.68 7.573 8.008 40.334 9.127 56.078 4.915 69.17 18.85 199.266 88.211 200.158 33.799 0 54.643-51.251 60.218-84.495l10.742-64.059c1.623-4.259 7.802-4.259 9.425 0l10.742 64.059c5.591 33.341 26.433 84.496 60.314 84.494 69.186-.893 83.216-131.189 88.115-200.156.725-10.198 3.036-47.959 9.16-56.123 75.374-102.059 33.234-255.719-100.879-255.719z";

const TOOTH_BOUNDS: Record<"incisor" | "canine" | "premolar" | "molar", { w: number; h: number; tx: number; ty: number }> = {
  incisor: { w: 512, h: 512, tx: -256, ty: -256 },
  canine: { w: 512, h: 512, tx: -256, ty: -256 },
  premolar: { w: 512, h: 512, tx: -256, ty: -256 },
  molar: { w: 512, h: 512, tx: -256, ty: -256 },
};

function getToothType(n: number): "incisor" | "canine" | "premolar" | "molar" {
  if ([1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32].includes(n)) return "molar";
  if ([4, 5, 12, 13, 20, 21, 28, 29].includes(n)) return "premolar";
  if ([6, 11, 22, 27].includes(n)) return "canine";
  return "incisor";
}

function getToothPath(): string {
  return TOOTH_ICON_PATH;
}

const DENTAL_VIEW = { w: 800, h: 400 };
const DENTAL_CHART_LAYOUT: { num: number; cx: number; cy: number; w: number; h: number; type: "incisor" | "canine" | "premolar" | "molar" }[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num, i) => {
    const cx = 80 + (i * 640) / 15;
    const cy = 95;
    const w = [42, 40, 38, 30, 30, 26, 22, 22, 22, 22, 26, 30, 30, 38, 40, 42][i];
    const h = 48;
    return { num, cx, cy, w, h, type: getToothType(num) };
  }),
  ...[17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32].map((num, i) => {
    const cx = 80 + (i * 640) / 15;
    const cy = 298;
    const w = [42, 40, 38, 30, 30, 26, 22, 22, 22, 22, 26, 30, 30, 38, 40, 42][i];
    const h = 48;
    return { num, cx, cy, w, h, type: getToothType(num) };
  }),
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
  isDentist: boolean;
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
  const [savingMedicalEdit, setSavingMedicalEdit] = useState(false);

  /* dental plan (dentist only, per-session state) */
  const [activeTooth, setActiveTooth] = useState<string | null>(null);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [toothProblems, setToothProblems] = useState<Record<string, string | null>>({});
  const [toothNotes, setToothNotes] = useState<Record<string, string>>({}); // للـ OTHER: اسم المشكلة
  const [toothPrices, setToothPrices] = useState<Record<string, number>>({});
  const [toothCharged, setToothCharged] = useState<Record<string, boolean>>({}); // تم خصم السعر للرصيد
  const [toothDone, setToothDone] = useState<Record<string, boolean>>({});
  const [dentalSaving, setDentalSaving] = useState(false);
  const [otherModalOpen, setOtherModalOpen] = useState(false);
  const [otherModalName, setOtherModalName] = useState("");
  const [otherModalPrice, setOtherModalPrice] = useState("");

  /* reset tab when patient changes */
  useEffect(() => { setActiveTab("info"); }, [selectedId]);

  /* تحميل خطة الأسنان عند اختيار مريض عيادة */
  useEffect(() => {
    if (!selectedPatient || selectedPatient.source !== "clinic" || !isDentist) {
      setToothProblems({});
      setToothNotes({});
      setToothPrices({});
      setToothCharged({});
      setToothDone({});
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/clinic/patients/${selectedPatient.id}/dental-plan`);
      if (cancelled) return;
      const data = await res.json().catch(() => ({ items: [] }));
      const items = data.items ?? [];
      const problems: Record<string, string | null> = {};
      const notes: Record<string, string> = {};
      const prices: Record<string, number> = {};
      const charged: Record<string, boolean> = {};
      const done: Record<string, boolean> = {};
      for (const it of items) {
        const id = String(it.toothNumber);
        problems[id] = it.problemType;
        notes[id] = it.note ?? "";
        prices[id] = Number(it.price) || 0;
        charged[id] = !!(it as { chargedToBalance?: boolean }).chargedToBalance;
        done[id] = it.isDone ?? false;
      }
      setToothProblems(problems);
      setToothNotes(notes);
      setToothPrices(prices);
      setToothCharged(charged);
      setToothDone(done);
    })();
    return () => { cancelled = true; };
  }, [selectedPatient?.id, selectedPatient?.source, isDentist]);

  const tabs = useMemo(() => {
    if (!isDentist) return BASE_TABS;
    return [
      ...BASE_TABS,
      { id: "dental", label: "خطة علاج الأسنان", icon: Stethoscope },
    ];
  }, [isDentist]);

  const handleToothClick = (id: string) => {
    setSelectedTeeth((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [id],
    );
    setActiveTooth(id);
  };

  const handleToothNoteChange = (value: string) => {
    if (!activeTooth) return;
    setToothNotes((prev) => ({ ...prev, [activeTooth]: value }));
  };

  const getToothColors = (id: string) => {
    const problem = toothProblems[id];
    const isSelected = selectedTeeth.includes(id);

    let fill: string = "#ffffff";
    let stroke = "#4A4A4A";

    switch (problem) {
      case "FILLING":
        fill = "#4ade80"; stroke = "#16a34a"; break;
      case "RCT":
        fill = "#f87171"; stroke = "#dc2626"; break;
      case "CROWN":
        fill = "#c084fc"; stroke = "#9333ea"; break;
      case "IMPLANT":
        fill = "#fb923c"; stroke = "#ea580c"; break;
      case "EXTRACTION":
        fill = "#fda4af"; stroke = "#e11d48"; break;
      case "ORTHO":
        fill = "#60a5fa"; stroke = "#2563eb"; break;
      case "BLEACHING":
        fill = "#67e8f9"; stroke = "#0891b2"; break;
      case "SCALING":
        fill = "#5eead4"; stroke = "#0d9488"; break;
      default:
        if (problem?.startsWith("OTHER:")) {
          fill = "#facc15"; stroke = "#ca8a04"; break;
        }
        if (toothNotes[id]) {
          fill = "#60a5fa"; // blue-400
          stroke = "#2563eb"; // blue-600
        }
    }

    if (isSelected) {
      stroke = "#1d4ed8"; // أزرق أغمق للحد
      if (!problem && !toothNotes[id]) fill = "#93c5fd"; // blue-300 أغمق
    }

    return { fill, stroke };
  };

  const applyProblemToSelected = (problemId: string) => {
    if (selectedTeeth.length === 0) {
      toast.error("اختر سناً واحدة على الأقل من المخطط أولاً");
      return;
    }
    if (problemId === "OTHER") {
      setOtherModalName("");
      setOtherModalPrice("");
      setOtherModalOpen(true);
      return;
    }
    setToothProblems((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = problemId;
      });
      return next;
    });
  };

  const confirmOtherModal = () => {
    const name = otherModalName.trim();
    if (!name) {
      toast.error("أدخل اسم المشكلة");
      return;
    }
    const problemType = `OTHER:${name}`;
    setToothProblems((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = problemType;
      });
      return next;
    });
    const price = parseFloat(otherModalPrice) || 0;
    if (price > 0) {
      setToothPrices((prev) => {
        const next = { ...prev };
        selectedTeeth.forEach((id) => {
          next[id] = price;
        });
        return next;
      });
    }
    setToothNotes((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = name;
      });
      return next;
    });
    setOtherModalOpen(false);
  };

  const toggleToothDone = () => {
    if (selectedTeeth.length === 0) {
      toast.error("اختر سنّاً من المخطط أولاً");
      return;
    }
    setToothDone((prev) => {
      const next = { ...prev };
      selectedTeeth.forEach((id) => {
        next[id] = !prev[id];
      });
      return next;
    });
  };

  const saveDentalPlan = async () => {
    if (!selectedPatient || selectedPatient.source !== "clinic") return;
    setDentalSaving(true);
    try {
      const items = Object.entries(toothProblems)
        .filter(([, problem]) => problem)
        .map(([id, problem]) => {
          const toothNum = parseInt(id, 10);
          if (Number.isNaN(toothNum) || toothNum < 1 || toothNum > 32) return null;
          return {
            toothNumber: toothNum,
            problemType: problem as string,
            note: toothNotes[id] ?? "",
            isDone: toothDone[id] ?? false,
            price: toothPrices[id] ?? 0,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item != null);

      const res = await fetch(`/api/clinic/patients/${selectedPatient.id}/dental-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, chargeToBalance: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "فشل حفظ مخطط الأسنان");
        toast.error(msg);
      } else {
        toast.success("تم حفظ مخطط الأسنان لهذا المريض ✓");
        router.refresh();
        const res2 = await fetch(`/api/clinic/patients/${selectedPatient.id}/dental-plan`);
        const data2 = await res2.json().catch(() => ({ items: [] }));
        const items2 = data2.items ?? [];
        const charged: Record<string, boolean> = {};
        for (const it of items2) {
          const tid = String(it.toothNumber);
          charged[tid] = !!(it as { chargedToBalance?: boolean }).chargedToBalance;
        }
        setToothCharged((prev) => ({ ...prev, ...charged }));
      }
    } catch {
      toast.error("خطأ في الاتصال أثناء حفظ مخطط الأسنان");
    } finally {
      setDentalSaving(false);
    }
  };

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
          toast.error(data.error || "فشل مسح الملاحظات الطبية");
        } else {
          toast.success("تم مسح الملاحظات الطبية");
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
          toast.error(data.error || "فشل حذف الملاحظة الطبية");
        } else {
          toast.success("تم حذف الملاحظة الطبية");
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
        toast.success("تم الحذف");
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        toast.error("حدث خطأ");
      }
    } finally {
      setDeleting(false);
    }
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openEdit}
                        className="gap-1"
                      >
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
                  <div className="text-xs text-gray-400 mb-0.5">نوع الملف</div>
                  <div className="text-sm font-semibold text-gray-800 truncate">
                    {selectedPatient.source === "clinic" ? "مريض عيادة" : "مريض منصة"}
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">معلومات المريض</h3>
                    {selectedPatient.source === "clinic" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openEdit}
                        className="h-7 px-3 text-xs gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        تعديل البيانات
                      </Button>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                    {(
                      [
                        { label: "الرقم الطبي",      value: selectedPatient.fileNumber },
                        { label: "الجنس",             value: selectedPatient.gender === "male" ? "ذكر" : selectedPatient.gender === "female" ? "أنثى" : null },
                        { label: "تاريخ الميلاد",     value: selectedPatient.dateOfBirth ? format(new Date(selectedPatient.dateOfBirth), "dd/MM/yyyy") : null },
                        { label: "فصيلة الدم",        value: selectedPatient.bloodType },
                        { label: "العنوان",            value: selectedPatient.address },
                        { label: "البريد الإلكتروني", value: selectedPatient.email },
                        { label: "رقم الهاتف",        value: selectedPatient.whatsapp },
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
                      <input
                        placeholder="الملاحظات الطبية: شكوى المريض، التشخيص، العلاج الموصوف..."
                        value={aptNotes}
                        onChange={(e) => setAptNotes(e.target.value)}
                        className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
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
                    {/* ملاحظات طبية يضيفها الطبيب يدوياً (ClinicMedicalNote) — عيادة فقط */}
                    {selectedPatient.source === "clinic" && (
                      <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900">
                            ملاحظات  طبية جديدة
                          </div>
                          {!addingMedical && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAddingMedical(true);
                                setMedicalAllergies("");
                                setMedicalDiagnosis("");
                                setMedicalTreatment("");
                              }}
                              className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                            >
                              <Plus className="h-3.5 w-3.5" /> إضافة تفاصيل
                            </Button>
                          )}
                        </div>

                        {addingMedical && (
                          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                الحساسيات / التنبيهات
                              </label>
                              <input
                                value={medicalAllergies}
                                onChange={(e) => setMedicalAllergies(e.target.value)}
                                placeholder="مثل: حساسية من البنسلين..."
                                className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                الحالة المرضية الأساسية
                              </label>
                              <textarea
                                value={medicalDiagnosis}
                                onChange={(e) => setMedicalDiagnosis(e.target.value)}
                                rows={2}
                                placeholder="ما هو المرض أو الحالة المزمنة الأساسية للمريض؟"
                                className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-700">
                                ما قام به الطبيب / العلاج
                              </label>
                              <textarea
                                value={medicalTreatment}
                                onChange={(e) => setMedicalTreatment(e.target.value)}
                                rows={2}
                                placeholder="ما الذي قمت به للمريض؟ ما العلاج أو الأدوية التي وصِفت له؟"
                                className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!selectedPatient) return;
                                  if (!medicalDiagnosis.trim() && !medicalTreatment.trim() && !medicalAllergies.trim()) {
                                    toast.error("أضف على الأقل الحاله أو العلاج أو الحساسية");
                                    return;
                                  }
                                  setSavingMedical(true);
                                  try {
                                    const res = await fetch(`/api/clinic/patients/${selectedPatient.id}/medical-notes`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        allergies: medicalAllergies,
                                        diagnosis: medicalDiagnosis,
                                        treatment: medicalTreatment,
                                      }),
                                    });
                                    const data = await res.json();
                                    if (!res.ok) {
                                      toast.error(data.error || "فشل حفظ التفاصيل الطبية");
                                    } else {
                                      toast.success("تم إضافة التفاصيل الطبية ✓");
                                      setAddingMedical(false);
                                      setMedicalAllergies("");
                                      setMedicalDiagnosis("");
                                      setMedicalTreatment("");
                                      router.refresh();
                                    }
                                  } catch {
                                    toast.error("خطأ في الاتصال");
                                  } finally {
                                    setSavingMedical(false);
                                  }
                                }}
                                disabled={savingMedical}
                              >
                                {savingMedical ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "حفظ"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddingMedical(false)}
                              >
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        )}

                        {selectedPatient.medicalNotes && selectedPatient.medicalNotes.length > 0 && (
                          <div className="space-y-3">
                            {selectedPatient.medicalNotes.map((note) => {
                              const isEditing = editingMedicalId === note.id;
                              return (
                                <div
                                  key={note.id}
                                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="text-[11px] text-gray-400">
                                      أضيفت في{" "}
                                      {format(new Date(note.createdAt), "dd/MM/yyyy HH:mm")}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {!isEditing && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMedicalId(note.id);
                                            setEditMedicalAllergies(note.allergies ?? "");
                                            setEditMedicalDiagnosis(note.diagnosis ?? "");
                                            setEditMedicalTreatment(note.treatment ?? "");
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100"
                                        >
                                          <Pencil className="h-3 w-3" /> تعديل
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(`note_${note.id}`)}
                                        className="inline-flex items_center gap-1 rounded-lg border border-red-100 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3 w-3" /> حذف
                                      </button>
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                          الحساسيات / التنبيهات
                                        </label>
                                        <input
                                          value={editMedicalAllergies}
                                          onChange={(e) => setEditMedicalAllergies(e.target.value)}
                                          placeholder="مثل: حساسية من البنسلين..."
                                          className="h-8 w-full rounded-lg border border-gray-300 px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                          الحالة المرضية الأساسية
                                        </label>
                                        <textarea
                                          value={editMedicalDiagnosis}
                                          onChange={(e) => setEditMedicalDiagnosis(e.target.value)}
                                          rows={2}
                                          placeholder="ما هو المرض أو الحالة المزمنة الأساسية للمريض؟"
                                          className="w-full resize-none rounded-lg border border-gray-300 p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-xs font-medium text-gray-700">
                                          ما قام به الطبيب / العلاج
                                        </label>
                                        <textarea
                                          value={editMedicalTreatment}
                                          onChange={(e) => setEditMedicalTreatment(e.target.value)}
                                          rows={2}
                                          placeholder="ما الذي قمت به للمريض؟ ما العلاج أو الأدوية التي وصِفت له؟"
                                          className="w-full resize-none rounded-lg border border-gray-300 p-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            setSavingMedicalEdit(true);
                                            try {
                                              const res = await fetch(`/api/clinic/medical-notes/${note.id}`, {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  allergies: editMedicalAllergies,
                                                  diagnosis: editMedicalDiagnosis,
                                                  treatment: editMedicalTreatment,
                                                }),
                                              });
                                              const data = await res.json();
                                              if (!res.ok) {
                                                toast.error(data.error || "فشل تحديث الملاحظة");
                                              } else {
                                                toast.success("تم تحديث الملاحظة الطبية ✓");
                                                setEditingMedicalId(null);
                                                router.refresh();
                                              }
                                            } catch {
                                              toast.error("خطأ في الاتصال");
                                            } finally {
                                              setSavingMedicalEdit(false);
                                            }
                                          }}
                                          disabled={savingMedicalEdit}
                                        >
                                          {savingMedicalEdit ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            "حفظ"
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingMedicalId(null)}
                                        >
                                          إلغاء
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-2 md:flex-row md:gap-3 text-xs sm:text-sm">
                                      {note.allergies && (
                                        <div className="flex-1 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 flex items-start gap-2">
                                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="text-xs font-semibold text-amber-900 mb-0.5">
                                              الحساسيات / التنبيهات
                                            </div>
                                            <div className="text-xs sm:text-sm text-amber-900/80">
                                              {note.allergies}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {note.diagnosis && (
                                        <div className="flex-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 flex items-start gap-2">
                                          <Stethoscope className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="text-xs font-semibold text-blue-900 mb-0.5">
                                              الحالة المرضية الأساسية
                                            </div>
                                            <div className="text-xs sm:text-sm text-blue-900/80 whitespace-pre-line">
                                              {note.diagnosis}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {note.treatment && (
                                        <div className="flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 flex items-start gap-2">
                                          <FileText className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="text-xs font-semibold text-emerald-900 mb-0.5">
                                              ما قام به الطبيب / العلاج
                                            </div>
                                            <div className="text-xs sm:text-sm text-emerald-900/80 whitespace-pre-line">
                                              {note.treatment}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {!note.allergies && !note.diagnosis && !note.treatment && (
                                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-center text-gray-400 flex-1">
                                          لا توجد تفاصيل في هذه الملاحظة.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ملخص زيارات مع ملاحظات طبية (إن وُجدت) */}
                    {selectedPatient.appointments.some((a) => a.notes) && (
                      <div className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          سجل الزيارات الطبية
                        </div>
                        <div className="space-y-3">
                          {selectedPatient.appointments
                            .filter((a) => a.notes)
                            .map((apt) => (
                              <div
                                key={apt.id}
                                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold">
                                    {format(new Date(apt.appointmentDate), "dd/MM/yyyy")}
                                  </span>
                                  {apt.startTime && (
                                    <span className="text-gray-400">
                                      {apt.startTime.slice(0, 5)}
                                    </span>
                                  )}
                                </div>
                                {apt.title && (
                                  <div className="text-[11px] text-gray-500 mb-1">
                                    {apt.title}
                                  </div>
                                )}
                                <div className="whitespace-pre-line">
                                  {apt.notes}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {!selectedPatient.allergies &&
                      !selectedPatient.notes &&
                      !selectedPatient.appointments.some((a) => a.notes) && (
                        <div className="py-12 text-center text-sm text-gray-400">
                          <Stethoscope className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                          لا توجد ملفات طبية
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* ── خطة علاج الأسنان (أطباء الأسنان فقط) ───────── */}
              {activeTab === "dental" && isDentist && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    مخطط الأسنان وخطة العلاج
                  </h3>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
                    <p className="text-xs text-gray-600">
                      اضغط على السن المطلوبة من المخطط لتحديدها (يمكن اختيار أكثر من سن)، ثم اكتب المشكلة أو خطة العلاج لكل سن في الأسفل.
                    </p>

                    {/* مخطط الأسنان — قواطع، أنياب، ضواحك، طواحن */}
                    <div className="space-y-3">
                      <div className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
                        <svg viewBox={`0 0 ${DENTAL_VIEW.w} ${DENTAL_VIEW.h}`} className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="dentalToothGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#ffffff" />
                              <stop offset="100%" stopColor="#f0f0f0" />
                            </linearGradient>
                            <filter id="dentalSoftShadow" x="-10%" y="-10%" width="120%" height="120%">
                              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                              <feOffset dx="1" dy="1" result="offsetblur" />
                              <feComponentTransfer>
                                <feFuncA type="linear" slope="0.15" />
                              </feComponentTransfer>
                              <feMerge>
                                <feMergeNode />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <rect width={DENTAL_VIEW.w} height={DENTAL_VIEW.h} fill="#ffffff" />
                          <text x="400" y="28" textAnchor="middle" fontSize="14" fontWeight="600" fill="#374151">الفك العلوي</text>
                          <text x="400" y="378" textAnchor="middle" fontSize="14" fontWeight="600" fill="#374151">الفك السفلي</text>
                          <g id="upper-jaw">
                            {DENTAL_CHART_LAYOUT.filter((t) => t.num <= 16).map((t) => {
                              const id = String(t.num);
                              const { fill, stroke } = getToothColors(id);
                              const b = TOOTH_BOUNDS[t.type];
                              const sx = t.w / b.w;
                              const sy = t.h / b.h;
                              return (
                                <g key={`tooth-${t.num}`} id={`tooth-${t.num}`} onClick={() => handleToothClick(id)} className="cursor-pointer" style={{ transition: "fill 0.3s ease" }}>
                                  <path
                                    d={getToothPath()}
                                    fill={fill}
                                    fillOpacity={1}
                                    fillRule="nonzero"
                                    stroke={stroke}
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    filter="url(#dentalSoftShadow)"
                                    transform={`translate(${t.cx},${t.cy}) scale(${sx},${-sy}) translate(${b.tx},${b.ty})`}
                                  />
                                  <text x={t.cx} y={t.cy + (t.num <= 16 ? t.h / 2 + 18 : -t.h / 2 - 6)} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151">
                                    {t.num}
                                  </text>
                                  {toothDone[id] && (
                                    <text x={t.cx} y={t.cy + (t.num <= 16 ? t.h / 2 + 8 : -t.h / 2 - 16)} textAnchor="middle" fontSize="14" fill="#16a34a" fontWeight="bold">✓</text>
                                  )}
                                </g>
                              );
                            })}
                          </g>
                          <g id="lower-jaw">
                            {DENTAL_CHART_LAYOUT.filter((t) => t.num >= 17).map((t) => {
                              const id = String(t.num);
                              const { fill, stroke } = getToothColors(id);
                              const b = TOOTH_BOUNDS[t.type];
                              const sx = t.w / b.w;
                              const sy = t.h / b.h;
                              return (
                                <g key={`tooth-${t.num}`} id={`tooth-${t.num}`} onClick={() => handleToothClick(id)} className="cursor-pointer" style={{ transition: "fill 0.3s ease" }}>
                                  <path
                                    d={getToothPath()}
                                    fill={fill}
                                    fillOpacity={1}
                                    fillRule="nonzero"
                                    stroke={stroke}
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    filter="url(#dentalSoftShadow)"
                                    transform={`translate(${t.cx},${t.cy}) scale(${sx},${sy}) translate(${b.tx},${b.ty})`}
                                  />
                                  <text x={t.cx} y={t.cy - t.h / 2 - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#374151">
                                    {t.num}
                                  </text>
                                  {toothDone[id] && (
                                    <text x={t.cx} y={t.cy - t.h / 2 - 16} textAnchor="middle" fontSize="14" fill="#16a34a" fontWeight="bold">✓</text>
                                  )}
                                </g>
                              );
                            })}
                          </g>
                        </svg>
                      </div>
                    </div>

                    {/* ملاحظات السن المحددة — أسفل المخطط */}
                    <div className="space-y-3 pt-2 border-t border-gray-200 mt-2">
                      <p className="text-xs font-semibold text-gray-700">
                        السن المحددة:{" "}
                        <span className="font-bold text-blue-600">
                          {selectedTeeth.length
                            ? selectedTeeth.join(", ")
                            : "لم يتم اختيار سن بعد"}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DENTAL_PROBLEMS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => applyProblemToSelected(p.id)}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium",
                              "border-gray-200 bg-white hover:bg-gray-50 text-gray-700",
                            )}
                          >
                            <span className={cn("h-3 w-3 rounded-full", p.color)} />
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={toggleToothDone}
                        disabled={selectedTeeth.length === 0}
                        className="gap-1.5"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        {selectedTeeth.some((id) => toothDone[id]) ? "إزالة إشارة الإنجاز" : "تم ✓ إنجاز العلاج"}
                      </Button>
                      {Object.keys(toothProblems).filter((id) => toothProblems[id]).length > 0 && (
                        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2 max-h-48 overflow-auto">
                          <p className="text-[11px] font-semibold text-gray-600 mb-1">
                            الأسنان المعالجة — السعر (يُضاف للرصيد تلقائياً عند الحفظ)
                          </p>
                          {Object.entries(toothProblems)
                            .filter(([, p]) => p)
                            .map(([id]) => {
                              const p = DENTAL_PROBLEMS.find((x) => x.id === toothProblems[id] || x.id === (toothProblems[id]?.startsWith("OTHER:") ? "OTHER" : ""));
                              const label = toothProblems[id]?.startsWith("OTHER:") ? (toothNotes[id] || toothProblems[id]?.replace("OTHER:", "")) : (p?.label ?? toothProblems[id]);
                              return (
                                <div key={id} className="flex items-center gap-2 text-[11px]">
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] shrink-0">
                                    {id}
                                  </span>
                                  <span className="flex-1 text-gray-700">{label}</span>
                                  <span className="text-gray-500">₪</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    placeholder="0"
                                    value={toothPrices[id] || ""}
                                    disabled={toothCharged[id]}
                                    onChange={(e) => {
                                      if (toothCharged[id]) return;
                                      const v = parseFloat(e.target.value) || 0;
                                      setToothPrices((prev) => ({ ...prev, [id]: v }));
                                    }}
                                    className={cn("w-20 h-7 text-xs", toothCharged[id] && "bg-gray-100 cursor-not-allowed")}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={toothDone[id] ? "default" : "outline"}
                                    className={cn(
                                      "h-7 px-2 text-[10px] gap-0.5 shrink-0",
                                      toothDone[id] && "bg-green-600 hover:bg-green-700"
                                    )}
                                    onClick={() => setToothDone((prev) => ({ ...prev, [id]: !prev[id] }))}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    {toothDone[id] ? "تم" : "إنجاز"}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                      <div className="pt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={saveDentalPlan}
                          disabled={dentalSaving || !selectedPatient || selectedPatient.source !== "clinic"}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          {dentalSaving ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              جاري الحفظ...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              حفظ مخطط الأسنان للمريض
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
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
        {tabs.map((tab) => (
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

      {/* ══ OTHER (مشكلة مخصصة) MODAL ════════════════════════════════ */}
      <Dialog open={otherModalOpen} onOpenChange={setOtherModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>مشكلة أخرى — سن {selectedTeeth.join(", ")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">اسم المشكلة</label>
              <Input
                placeholder="مثال: تحنيط، سحب عصب مؤقت..."
                value={otherModalName}
                onChange={(e) => setOtherModalName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">السعر (₪)</label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="0"
                value={otherModalPrice}
                onChange={(e) => setOtherModalPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOtherModalOpen(false)}>إلغاء</Button>
            <Button type="button" onClick={confirmOtherModal}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                {confirmDeleteId === "clear-notes"
                  ? "هل أنت متأكد من مسح الملاحظات الطبية العامة لهذا المريض؟"
                  : confirmDeleteId?.startsWith("note_")
                  ? "هل أنت متأكد من حذف هذه الملاحظة الطبية؟"
                  : "هل أنت متأكد من حذف هذه المعاملة؟ لن تتمكن من استرجاعها لاحقاً."}
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
