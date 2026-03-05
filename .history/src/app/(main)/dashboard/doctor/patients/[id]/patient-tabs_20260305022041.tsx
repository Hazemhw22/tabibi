"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { User, Calendar, Receipt, BarChart3, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabId = "info" | "appointments" | "transactions" | "summary";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "info", label: "البيانات الأساسية", icon: User },
  { id: "appointments", label: "المواعيد", icon: Calendar },
  { id: "transactions", label: "المعاملات", icon: Receipt },
  { id: "summary", label: "الملخص", icon: BarChart3 },
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

  const handleAddPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("المبلغ مطلوب ويجب أن يكون موجباً");
      return;
    }
    setSavingPayment(true);
    try {
      const res = await fetch(`/api/clinic/patients/${patient.id}/transactions`, {
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
    try {
      const res = await fetch(`/api/clinic/patients/${patient.id}/transactions`, {
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
            appointmentDate: aptDate,
            startTime: aptStartTime,
            endTime: aptEndTime,
            fee,
            notes: aptNotes.trim() || undefined,
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
                <Plus className="h-4 w-4" />
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
                    {savingApt && <Loader2 className="h-4 w-4 animate-spin" />}
                    حفظ
                  </Button>
                  <Button variant="outline" onClick={() => setShowAppointment(false)}>إلغاء</Button>
                </div>
              </Card>
            )}
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد مواعيد مسجلة</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-gray-500 border-b">
                      <th className="pb-2 font-medium">التاريخ</th>
                      <th className="pb-2 font-medium">الوقت</th>
                      <th className="pb-2 font-medium">الحالة</th>
                      <th className="pb-2 font-medium">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {appointments.map((apt) => (
                      <tr key={apt.id}>
                        <td className="py-2">{format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: ar })}</td>
                        <td className="py-2">{apt.startTime}{apt.endTime ? ` - ${apt.endTime}` : ""}</td>
                        <td className="py-2">
                          <Badge variant="secondary">{STATUS_LABELS[apt.status] ?? apt.status}</Badge>
                        </td>
                        <td className="py-2 font-medium">{apt.fee != null ? `₪${apt.fee}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            {patient.source === "clinic" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => { setShowPayment(true); setShowService(false); }}
                >
                  <Plus className="h-4 w-4" />
                  إضافة دفعة
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => { setShowService(true); setShowPayment(false); }}
                >
                  <Plus className="h-4 w-4" />
                  إضافة خدمة
                </Button>
              </div>
            )}
            {patient.source === "clinic" && showPayment && (
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
                    {savingPayment && <Loader2 className="h-4 w-4 animate-spin" />}
                    حفظ الدفعة
                  </Button>
                  <Button variant="outline" onClick={() => setShowPayment(false)}>إلغاء</Button>
                </div>
              </Card>
            )}
            {patient.source === "clinic" && showService && (
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
                    {savingService && <Loader2 className="h-4 w-4 animate-spin" />}
                    حفظ الخدمة
                  </Button>
                  <Button variant="outline" onClick={() => setShowService(false)}>إلغاء</Button>
                </div>
              </Card>
            )}
            {patient.source !== "clinic" ? (
              <p className="text-gray-500 text-center py-8">المعاملات المالية متاحة لمرضى العيادة فقط</p>
            ) : transactions.length === 0 && !showPayment && !showService ? (
              <p className="text-gray-500 text-center py-8">لا توجد معاملات مسجلة. استخدم &quot;إضافة دفعة&quot; أو &quot;إضافة خدمة&quot;</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-gray-500 border-b">
                      <th className="pb-2 font-medium">التاريخ</th>
                      <th className="pb-2 font-medium">الوصف</th>
                      <th className="pb-2 font-medium">النوع</th>
                      <th className="pb-2 font-medium">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-2">{format(new Date(tx.date), "d MMM yyyy", { locale: ar })}</td>
                        <td className="py-2">{tx.description}</td>
                        <td className="py-2">
                          <Badge variant={tx.type === "PAYMENT" ? "default" : "secondary"}>
                            {tx.type === "PAYMENT" ? "دفعة" : "خدمة"}
                          </Badge>
                        </td>
                        <td className={`py-2 font-medium ${tx.type === "PAYMENT" ? "text-green-600" : "text-red-600"}`}>
                          {tx.type === "PAYMENT" ? "+" : "-"}₪{tx.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            {patient.source === "clinic" && (
              <Card className={balance >= 0 ? "bg-green-50" : "bg-red-50"}>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">الرصيد</p>
                  <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {balance >= 0 ? "+" : ""}₪{balance.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
            )}
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
