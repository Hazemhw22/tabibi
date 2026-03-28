"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import IconSettings from "@/components/icon/icon-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminMessagesSettingsPage() {
  const [creditRaw, setCreditRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCredit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages/credit");
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل جلب الرصيد");
        setCreditRaw(null);
        return;
      }
      setCreditRaw(j.raw ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCredit();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/admin" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
        <IconSettings className="h-7 w-7 text-blue-600 shrink-0" />
        إعدادات الرسائل (Astra)
      </h1>

      <Card className="mb-4">
        <CardContent className="p-5 space-y-3 text-sm">
          <p className="text-gray-600 dark:text-gray-300">
            يعتمد النظام على متغيرات البيئة:
            <span className="font-mono"> SMS_API_ID</span> و <span className="font-mono">SMS_SENDER</span> و{" "}
            <span className="font-mono">SMS_API_URL</span>.
          </p>
        
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">رصيد SMS</h2>
            <Button type="button" variant="outline" onClick={() => void loadCredit()} disabled={loading}>
              {loading ? "..." : "تحديث"}
            </Button>
          </div>
          <pre className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 p-3 overflow-x-auto">
{creditRaw ?? "—"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

