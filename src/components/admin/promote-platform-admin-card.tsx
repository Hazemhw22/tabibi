"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Row = { id: string; name: string | null; email: string | null; phone: string | null; role: string };

export function PromotePlatformAdminCard({
  initialAdmins,
}: {
  initialAdmins: Row[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<Row[]>(initialAdmins);

  const disabled = useMemo(() => {
    const e = email.trim();
    const p = phone.trim();
    return saving || (!e && !p);
  }, [saving, email, phone]);

  const promote = async () => {
    if (disabled) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/platform-admins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          createIfMissing: Boolean(email.trim() && password.trim()),
          password: password.trim() || undefined,
          name: name.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { user?: Row; promoted?: boolean; error?: string }
        | Record<string, unknown>;
      if (!res.ok) {
        toast.error(String((data as { error?: string }).error ?? "فشل إضافة مشرف"));
        return;
      }
      const u = (data as { user?: Row }).user;
      if (!u) {
        toast.success("تمت العملية");
        return;
      }
      setAdmins((prev) => {
        const map = new Map(prev.map((x) => [x.id, x]));
        map.set(u.id, u);
        return Array.from(map.values());
      });
      toast.success((data as { promoted?: boolean }).promoted ? "تمت ترقية المستخدم إلى مشرف منصة" : "المستخدم مشرف بالفعل");
      setEmail("");
      setPhone("");
      setName("");
      setPassword("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          مشرفو المنصة ({admins.length})
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          إضافة مشرف
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/30">
        <div className="space-y-2">
          {admins.length === 0 && <div className="text-sm text-gray-500">لا يوجد مشرفون.</div>}
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/50"
            >
              <div className="font-medium text-gray-900 dark:text-slate-100">{a.name || "—"}</div>
              <div className="text-gray-600 dark:text-slate-300 flex flex-wrap gap-2">
                <span dir="ltr">{a.email || "—"}</span>
                <span dir="ltr">{a.phone || "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة/ترقية مشرف منصة</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">البريد الإلكتروني</Label>
              <Input
                className="mt-1"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                إذا كان المستخدم موجوداً سيتم ترقيته؛ وإذا لم يكن موجوداً وأدخلت كلمة السر سيتم إنشاء حساب جديد.
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">رقم الهاتف (للترقية فقط – اختياري)</Label>
              <Input
                className="mt-1"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="059xxxxxxx أو +972..."
              />
            </div>
            <div>
              <Label className="text-xs">الاسم (عند إنشاء حساب جديد)</Label>
              <Input
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مشرف منصة"
              />
            </div>
            <div>
              <Label className="text-xs">كلمة السر (عند إنشاء حساب جديد)</Label>
              <Input
                className="mt-1"
                dir="ltr"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => void promote()} disabled={disabled}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

