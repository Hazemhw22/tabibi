"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import IconArchive from "@/components/icon/icon-archive";
import { isDoctorStaffRole } from "@/lib/doctor-team-roles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateMedium } from "@/lib/utils";

type Row = {
  id: string;
  createdAt: string;
  to: string;
  body: string;
  status: string;
};

export default function DoctorMessagesHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (session?.user?.role && isDoctorStaffRole(session.user.role)) {
      router.replace("/dashboard/doctor/appointments");
    }
  }, [session?.user?.role, status, router]);

  useEffect(() => {
    if (status === "loading" || (session?.user?.role && isDoctorStaffRole(session.user.role))) return;
    fetch("/api/messages/history")
      .then((r) => r.json())
      .then((j) => setRows(j.messages ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [status, session?.user?.role]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.to.toLowerCase().includes(s) || r.body.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <Link href="/dashboard/doctor" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IconArchive className="h-7 w-7 text-indigo-600 shrink-0" />
          سجل الرسائل
        </h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالرقم أو النص..." className="max-w-xs" />
      </div>

      {loading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-gray-500">لا توجد رسائل بعد.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium" dir="ltr">{r.to}</div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "SENT" ? "default" : r.status === "FAILED" ? "destructive" : "secondary"}>
                    {r.status}
                  </Badge>
                  <span className="text-xs text-gray-500">{formatDateMedium(r.createdAt)}</span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-gray-700 dark:text-gray-300">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

