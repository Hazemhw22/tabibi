"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import IconUser from "@/components/icon/icon-user";
import IconCalendar from "@/components/icon/icon-calendar";
import IconReceipt from "@/components/icon/icon-receipt";
import IconBarChart from "@/components/icon/icon-bar-chart";
import IconPlus from "@/components/icon/icon-plus";
import IconLoader from "@/components/icon/icon-loader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabId = "info" | "appointments" | "transactions" | "summary";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "info", label: "البيانات الأساسية", icon: IconUser },
  { id: "appointments", label: "المواعيد", icon: IconCalendar },
  { id: "transactions", label: "المعاملات", icon: IconReceipt },
  { id: "summary", label: "الملخص", icon: IconBarChart },
];

interface PatientData {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  fileNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  notes?: string | null;
  source: "platform" | "clinic";
}

interface AppointmentRow {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  fee?: number;
  title?: string;
}

interface TransactionRow {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  notes?: string | null;
}

interface Props {
  patient: PatientData;
  appointments: AppointmentRow[];
  transactions: TransactionRow[];
  balance: number;
  doctorId?: string;
  defaultFee?: number;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  CONFIRMED: "مؤكد",
  COMPLETED: "منجز",
  CANCELLED: "ملغي",
  NO_SHOW: "لم يحضر",
  SCHEDULED: "مجدول",
};

export default function PatientTabs({
  patient,
  appointments,
  transactions,
  balance,
  doctorId,
  defaultFee = 0,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("info");

  // إضافة دفعة
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDesc, setPaymentDesc] = useState("دفعة نقدية");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // إضافة خدمة
  const [showService, setShowService] = useState(false);
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [savingService, setSavingService] = useState(false);

  // إضافة موعد
  const [showAppointment, setShowAppointment] = useState(false);
  const [aptTitle, setAptTitle] = useState("");
  const [aptDate, setAptDate] = useState("");
  const [aptTime, setAptTime] = useState("09:00");
  const [aptDuration, setAptDuration] = useState("30");
  const [aptNotes, setAptNotes] = useState("");
  const [aptStartTime, setAptStartTime] = useState("09:00");
  const [aptEndTime, setAptEndTime] = useState("09:30");
  const [aptFee, setAptFee] = useState(String(defaultFee || ""));
  const [savingApt, setSavingApt] = useState(false);
  const [bookingChannel, setBookingChannel] = useState<"CENTER" | "CLINIC">("CLINIC");
  const [doctorClinics, setDoctorClinics] = useState<{ id: string; name: string; medicalCenterId?: string | null }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [centerClinicId, setCenterClinicId] = useState<string | null>(null);
  const ownClinics = doctorClinics.filter((c) => !c.medicalCenterId);
  const canChooseChannel = Boolean(centerClinicId) && ownClinics.length > 0;

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

  const handleAddPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("المبلغ مطلوب ويجب أن يكون موجباً");
      return;
    }
    setSavingPayment(true);
    const url =
      patient.source === "platform"
        ? `/api/doctor/patients/${patient.id}/platform-transactions`
        : `/api/clinic/patients/${patient.id}/transactions`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT",
          description: paymentDesc.trim() || "دفعة نقدية",
          amount,
          notes: paymentNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("تم تسجيل الدفعة ✓");
        if (data.smsSent === false) {
          toast.warning("لم تُرسل رسالة SMS للمريض. تحقق من رقم الهاتف وإعدادات SMS في .env");
        }
        setShowPayment(false);
        setPaymentAmount("");
        setPaymentNotes("");
        router.refresh();
      } else toast.error(data.error || "حدث خطأ");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleAddService = async () => {
    const amount = Number(serviceAmount);
    if (!serviceDesc.trim()) {
      toast.error("وصف الخدمة مطلوب (مثل: خلع سن، تقويم)");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("المبلغ مطلوب ويجب أن يكون موجباً");
      return;
    }
    setSavingService(true);
    const url =
      patient.source === "platform"
        ? `/api/doctor/patients/${patient.id}/platform-transactions`
        : `/api/clinic/patients/${patient.id}/transactions`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SERVICE",
          description: serviceDesc.trim(),
          amount,
          notes: serviceNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("تم إضافة الخدمة ✓");
        if (data.smsSent === false) {
          toast.warning("لم تُرسل رسالة SMS للمريض. تحقق من رقم الهاتف وإعدادات SMS في .env");
        }
        setShowService(false);
        setServiceDesc("");
        setServiceAmount("");
        setServiceNotes("");
        router.refresh();
      } else toast.error(data.error || "حدث خطأ");
    } finally {
      setSavingService(false);
    }
  };

  const handleAddAppointment = async () => {
    if (patient.source === "clinic") {
      if (!aptTitle.trim() || !aptDate || !aptTime) {
        toast.error("العنوان والتاريخ والوقت مطلوبة");
        return;
      }
      setSavingApt(true);
      try {
        const res = await fetch(`/api/clinic/patients/${patient.id}/appointments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: aptTitle.trim(),
            date: aptDate,
            time: aptTime,
            duration: Number(aptDuration) || 30,
            notes: aptNotes.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success("تم إضافة الموعد ✓");
          setShowAppointment(false);
          setAptTitle("");
          setAptDate("");
          setAptNotes("");
          router.refresh();
        } else toast.error(data.error || "حدث خطأ");
      } finally {
        setSavingApt(false);
      }
    } else {
        if (!doctorId || !aptDate || !aptStartTime || !aptEndTime) {
        toast.error("التاريخ ووقت البداية والنهاية مطلوبة");
        return;
      }
      const viaMedicalCenter = canChooseChannel ? bookingChannel === "CENTER" : Boolean(centerClinicId);
      const resolvedClinicId = viaMedicalCenter ? centerClinicId : selectedClinicId;
      if (!resolvedClinicId) {
        toast.error("يرجى اختيار عيادة صالحة");
        return;
      }
      const fee = Number(aptFee);
      if (!fee || fee <= 0) {
        toast.error("رسوم الكشف مطلوبة");
        return;
      }
      setSavingApt(true);
      try {
        const res = await fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId,
            patientId: patient.id,
            clinicId: resolvedClinicId,
            appointmentDate: aptDate,
            startTime: aptStartTime,
            endTime: aptEndTime,
            fee,
            notes: aptNotes.trim() || undefined,
            viaMedicalCenter,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success("تم إضافة الموعد ✓");
          setShowAppointment(false);
          setAptDate("");
          setAptFee(String(defaultFee || ""));
          setAptNotes("");
          router.refresh();
        } else toast.error(data.error || "حدث خطأ");
      } finally {
        setSavingApt(false);
      }
    }
  };

  return (
    <Card>
      <div className="border-b border-gray-200 px-4">
        <nav className="flex gap-1" aria-label="تابات الملف">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <CardContent className="p-6">
        {activeTab === "info" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">الاسم</p>
                <p className="font-medium text-gray-900">{patient.name}</p>
              </div>
              {patient.fileNumber && patient.fileNumber !== "—" && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">رقم الملف</p>
                  <p className="font-medium text-gray-900">{patient.fileNumber}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-0.5">الهاتف</p>
                <p className="font-medium text-gray-900" dir="ltr">{patient.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">البريد</p>
                <p className="font-medium text-gray-900" dir="ltr">{patient.email ?? "—"}</p>
              </div>
              {patient.gender && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">الجنس</p>
                  <p className="font-medium text-gray-900">{patient.gender === "male" ? "ذكر" : "أنثى"}</p>
                </div>
              )}
              {patient.bloodType && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">فصيلة الدم</p>
                  <p className="font-medium text-gray-900">{patient.bloodType}</p>
                </div>
              )}
              {patient.address && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">العنوان</p>
                  <p className="font-medium text-gray-900">{patient.address}</p>
                </div>
              )}
              {patient.allergies && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">الحساسيات / التنبيهات</p>
                  <p className="font-medium text-gray-900">{patient.allergies}</p>
                </div>
              )}
              {patient.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">ملاحظات</p>
                  <p className="font-medium text-gray-900">{patient.notes}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400">المصدر: {patient.source === "platform" ? "منصة (حجز إلكتروني)" : "عيادة"}</p>
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowAppointment(true)}
              >
                <IconPlus className="h-4 w-4" />
                إضافة موعد
              </Button>
            </div>
            {showAppointment && (
              <Card className="bg-gray-50 border-2 border-dashed p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">إضافة موعد جديد</h4>
                {patient.source === "clinic" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>عنوان الموعد</Label>
                      <Input
                        value={aptTitle}
                        onChange={(e) => setAptTitle(e.target.value)}
                        placeholder="مثال: كشف، متابعة"
                      />
                    </div>
                    <div>
                      <Label>التاريخ</Label>
                      <Input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>الوقت</Label>
                      <Input type="time" value={aptTime} onChange={(e) => setAptTime(e.target.value)} />
                    </div>
                    <div>
                      <Label>المدة (دقيقة)</Label>
                      <Input type="number" value={aptDuration} onChange={(e) => setAptDuration(e.target.value)} placeholder="30" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>ملاحظات</Label>
                      <Input value={aptNotes} onChange={(e) => setAptNotes(e.target.value)} placeholder="اختياري" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {canChooseChannel && (
                      <div>
                        <Label>قناة الحجز</Label>
                        <select
                          value={bookingChannel}
                          onChange={(e) => setBookingChannel(e.target.value as "CENTER" | "CLINIC")}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="CENTER">المركز الطبي (يظهر في حجوزات المركز)</option>
                          <option value="CLINIC">عيادتي الخاصة (لا يظهر في المركز)</option>
                        </select>
                      </div>
                    )}
                    {canChooseChannel ? (
                      <div>
                        <Label>العيادة</Label>
                        <select
                          value={bookingChannel === "CENTER" ? (centerClinicId ?? "") : selectedClinicId}
                          onChange={(e) => setSelectedClinicId(e.target.value)}
                          disabled={bookingChannel === "CENTER"}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:bg-gray-100"
                        >
                          {(bookingChannel === "CENTER"
                            ? doctorClinics.filter((c) => c.id === centerClinicId)
                            : ownClinics
                          ).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div>
                      <Label>التاريخ</Label>
                      <Input type="date" value={aptDate} onChange={(e) => setAptDate(e.target.value)} />
                    </div>
                    <div>
                      <Label>وقت البداية</Label>
                      <Input type="time" value={aptStartTime} onChange={(e) => setAptStartTime(e.target.value)} />
                    </div>
                    <div>
                      <Label>وقت النهاية</Label>
                      <Input type="time" value={aptEndTime} onChange={(e) => setAptEndTime(e.target.value)} />
                    </div>
                    <div>
                      <Label>رسوم الكشف (₪)</Label>
                      <Input type="number" min={0} step="0.01" value={aptFee} onChange={(e) => setAptFee(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>ملاحظات</Label>
                      <Input value={aptNotes} onChange={(e) => setAptNotes(e.target.value)} placeholder="اختياري" />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAddAppointment} disabled={savingApt} className="gap-2">
                    {savingApt && <IconLoader className="h-4 w-4 animate-spin" />}
                    حفظ
                  </Button>
                  <Button variant="outline" onClick={() => setShowAppointment(false)}>إلغاء</Button>
                </div>
              </Card>
            )}
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد مواعيد مسجلة</p>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {appointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-gray-50/80 transition-colors text-sm"
                    >
                      <span className="text-gray-700 min-w-[100px]">
                        {format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: ar })}
                      </span>
                      <span className="text-gray-600">{apt.startTime}{apt.endTime ? ` - ${apt.endTime}` : ""}</span>
                      <Badge variant="secondary" className="shrink-0">{STATUS_LABELS[apt.status] ?? apt.status}</Badge>
                      <span className="font-semibold text-emerald-600 mr-auto">{apt.fee != null ? `₪${apt.fee}` : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { setShowPayment(true); setShowService(false); }}
              >
                <IconPlus className="h-4 w-4" />
                إضافة دفعة
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => { setShowService(true); setShowPayment(false); }}
              >
                <IconPlus className="h-4 w-4" />
                إضافة خدمة
              </Button>
            </div>
            {showPayment && (
              <Card className="bg-green-50/50 border-green-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">إضافة دفعة (مبلغ موجب)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>الوصف</Label>
                    <Input value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} placeholder="دفعة نقدية" />
                  </div>
                  <div>
                    <Label>المبلغ (₪)</Label>
                    <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>ملاحظات</Label>
                    <Input value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="اختياري" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAddPayment} disabled={savingPayment} className="gap-2">
                    {savingPayment && <IconLoader className="h-4 w-4 animate-spin" />}
                    حفظ الدفعة
                  </Button>
                  <Button variant="outline" onClick={() => setShowPayment(false)}>إلغاء</Button>
                </div>
              </Card>
            )}
            {showService && (
              <Card className="bg-amber-50/50 border-amber-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">إضافة خدمة (مبلغ سالب — مثل خلع سن، تقويم)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>وصف الخدمة</Label>
                    <Input value={serviceDesc} onChange={(e) => setServiceDesc(e.target.value)} placeholder="مثال: خلع سن، تقويم" />
                  </div>
                  <div>
                    <Label>المبلغ (₪)</Label>
                    <Input type="number" min="0" step="0.01" value={serviceAmount} onChange={(e) => setServiceAmount(e.target.value)} placeholder="0" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>ملاحظات</Label>
                    <Input value={serviceNotes} onChange={(e) => setServiceNotes(e.target.value)} placeholder="اختياري" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleAddService} disabled={savingService} className="gap-2">
                    {savingService && <IconLoader className="h-4 w-4 animate-spin" />}
                    حفظ الخدمة
                  </Button>
                  <Button variant="outline" onClick={() => setShowService(false)}>إلغاء</Button>
                </div>
              </Card>
            )}
            {transactions.length === 0 && !showPayment && !showService ? (
              <p className="text-gray-500 text-center py-8">لا توجد معاملات مسجلة. استخدم &quot;إضافة دفعة&quot; أو &quot;إضافة خدمة&quot;</p>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-gray-50/80 transition-colors text-sm"
                    >
                      <span className="text-gray-700 min-w-[100px]">
                        {format(new Date(tx.date), "d MMM yyyy", { locale: ar })}
                      </span>
                      <span className="text-gray-900 flex-1">{tx.description}</span>
                      <Badge variant={tx.type === "PAYMENT" ? "default" : "secondary"} className="shrink-0">
                        {tx.type === "PAYMENT" ? "دفعة" : "خدمة"}
                      </Badge>
                      <span className={`font-semibold shrink-0 ${tx.type === "PAYMENT" ? "text-green-600" : "text-red-600"}`}>
                        {tx.type === "PAYMENT" ? "+" : "-"}₪{Math.abs(Number(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">عدد المواعيد</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </CardContent>
            </Card>
            <Card className={balance >= 0 ? "bg-green-50" : "bg-red-50"}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">الرصيد</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 sm:col-span-2">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">المصدر</p>
                <p className="font-medium text-gray-900">
                  {patient.source === "platform" ? "مريض من المنصة (حجز مواعيد إلكتروني)" : "مريض مسجل في العيادة"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
