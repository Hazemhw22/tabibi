"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import IconBuilding from "@/components/icon/icon-building";
import { formatNumber } from "@/lib/utils";

type Invite = {
  id: string;
  centerName: string;
  centerCity: string;
  consultationFee: number;
  doctorClinicFee: number;
  patientFeeServiceType: string;
  createdAt: string;
};

function safeNumString(n: number): string {
  return Number.isFinite(n) ? String(n) : "0";
}

function parseAmount(s: string) {
  const t = s.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
}

function InviteRow({
  inv,
  acting,
  onAccept,
  onReject,
}: {
  inv: Invite;
  acting: boolean;
  onAccept: (id: string, doctorClinicFee: number) => void;
  onReject: (id: string) => void;
}) {
  const [clinicDue, setClinicDue] = useState(() => safeNumString(inv.doctorClinicFee));

  useEffect(() => {
    setClinicDue(safeNumString(inv.doctorClinicFee));
  }, [inv.id, inv.doctorClinicFee]);

  const handleAccept = () => {
    const df = parseAmount(clinicDue);
    if (!Number.isFinite(df) || df < 0) {
      toast.error("أدخل مستحقاتك من العيادة بشكل صحيح");
      return;
    }
    onAccept(inv.id, df);
  };

  const fieldClass =
    "w-full min-h-[44px] rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60";

  return (
    <div
      dir="rtl"
      className="rounded-xl border-2 border-amber-300/90 bg-white p-4 shadow-sm dark:border-amber-800 dark:bg-slate-900"
    >
      <div className="mb-4">
        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{inv.centerName}</p>
        {inv.centerCity ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{inv.centerCity}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor={`invite-clinic-${inv.id}`} className="block text-sm font-bold text-slate-900 dark:text-slate-100">
          مستحقاتك من العيادة (₪)
        </label>
        <input
          id={`invite-clinic-${inv.id}`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          disabled={acting}
          className={fieldClass}
          value={clinicDue}
          onChange={(e) => setClinicDue(e.target.value)}
        />
        <p className="text-xs text-slate-600 dark:text-slate-400">
          اقتراح المركز: ₪{formatNumber(inv.doctorClinicFee, { maximumFractionDigits: 0 })} — يمكنك تعديل المبلغ قبل القبول
        </p>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
        <Button type="button" size="lg" variant="outline" className="flex-1 min-h-11" disabled={acting} onClick={() => onReject(inv.id)}>
          رفض
        </Button>
        <Button
          type="button"
          size="lg"
          className="flex-1 min-h-11 bg-emerald-600 hover:bg-emerald-700"
          disabled={acting}
          onClick={handleAccept}
        >
          {acting ? "جاري المعالجة..." : "قبول والانضمام"}
        </Button>
      </div>
    </div>
  );
}

export default function DoctorMedicalCenterInvitesCard() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/doctor/medical-center-invites")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (r.status !== 404) {
            toast.error(typeof j.error === "string" ? j.error : "تعذر تحميل دعوات المراكز");
          }
          setInvites([]);
          return;
        }
        if (Array.isArray(j.invites)) setInvites(j.invites);
        else setInvites([]);
      })
      .catch(() => {
        setInvites([]);
        toast.error("تعذر الاتصال بالخادم");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const respondReject = async (inviteId: string) => {
    setActing(inviteId);
    try {
      const res = await fetch("/api/doctor/medical-center-invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, action: "reject" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر تنفيذ الطلب");
        return;
      }
      toast.success(data.message || "تم");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  const respondAccept = async (inviteId: string, doctorClinicFee: number) => {
    setActing(inviteId);
    try {
      const res = await fetch("/api/doctor/medical-center-invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId,
          action: "accept",
          doctorClinicFee,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر تنفيذ الطلب");
        return;
      }
      toast.success(data.message || "تم");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      window.location.reload();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  if (loading || invites.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/40 overflow-visible dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-950 dark:text-amber-100">
          <IconBuilding className="h-5 w-5 text-amber-700 shrink-0" />
          دعوة للانضمام لمركز طبي
        </CardTitle>
        <p className="text-xs text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
          يظهر لك هنا <strong>مستحقاتك من العيادة</strong> فقط للمراجعة والتعديل قبل القبول. رسوم المريض ونوع الخدمة يحددهما المركز في الدعوة.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 overflow-visible">
        {invites.map((inv) => (
          <InviteRow
            key={inv.id}
            inv={inv}
            acting={acting === inv.id}
            onAccept={respondAccept}
            onReject={respondReject}
          />
        ))}
      </CardContent>
    </Card>
  );
}
