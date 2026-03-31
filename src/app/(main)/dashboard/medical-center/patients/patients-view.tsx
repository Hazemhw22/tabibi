"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import IconUsers from "@/components/icon/icon-users";
import IconSearch from "@/components/icon/icon-search";
import IconX from "@/components/icon/icon-x";
import IconPlus from "@/components/icon/icon-plus";
import IconPhone from "@/components/icon/icon-phone";
import IconMail from "@/components/icon/icon-mail";
import IconClipboardText from "@/components/icon/icon-clipboard-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateMedium } from "@/lib/utils";

export type CenterPatientRow = {
  patient?: { id?: string; name?: string; phone?: string; email?: string };
  lastVisit?: string;
};

type Props = {
  rows: CenterPatientRow[];
};

export default function CenterPatientsView({ rows }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");

  useEffect(() => {
    // يحافظ على اختيار آخر مريض إذا كان الرابط يحتوي /patients/{id}
    const parts = pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "patients");
    const id = idx >= 0 ? parts[idx + 1] : null;
    if (id && id !== "patients") setSelectedId(id);
  }, [pathname]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const n = (r.patient?.name ?? "").toLowerCase();
      const p = r.patient?.phone ?? "";
      const e = (r.patient?.email ?? "").toLowerCase();
      return n.includes(q) || p.includes(q) || e.includes(q);
    });
  }, [rows, search]);

  const selected = useMemo(() => rows.find((r) => r.patient?.id && r.patient.id === selectedId) ?? null, [rows, selectedId]);

  const openPatient = (id: string) => {
    setSelectedId(id);
    router.push(`/dashboard/medical-center/patients/${id}`);
  };

  const submitAdd = async () => {
    if (addName.trim().length < 2 || addPhone.trim().length < 6) {
      toast.error("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/medical-center/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), phone: addPhone.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل إضافة المريض");
        return;
      }
      toast.success("تمت إضافة المريض");
      setAddOpen(false);
      setAddName("");
      setAddPhone("");
      if (j.patientUserId) router.push(`/dashboard/medical-center/patients/${String(j.patientUserId)}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="box-border flex h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px))] min-h-0 min-w-0 flex-col overflow-hidden py-3 sm:h-[calc(100dvh-6rem-env(safe-area-inset-bottom,0px))] sm:py-4 -mx-3 w-auto max-w-none sm:-mx-4 md:-mx-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:rounded-2xl lg:h-full">

        {/* COLUMN 1 — list */}
        <div className="order-1 flex w-full shrink-0 flex-col border-b border-gray-200 dark:border-slate-700 lg:order-none lg:h-full lg:w-72 lg:border-b-0 lg:border-l">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">مرضى المركز</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{filtered.length} مريض</p>
            </div>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setAddOpen(true)}>
              <IconPlus className="h-4 w-4" /> إضافة
            </Button>
          </div>

          <div className="px-4 py-3">
            <div className="relative">
              <IconSearch className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم، الهاتف، البريد..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-white py-2 pr-8 pl-8 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <ul className="space-y-2">
              {filtered.length === 0 ? (
                <li className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <IconUsers className="mb-2 h-10 w-10 text-gray-200 dark:text-slate-600" />
                  <p className="text-sm text-gray-400 dark:text-slate-500">{search ? "لا توجد نتائج" : "لا يوجد مرضى"}</p>
                </li>
              ) : (
                filtered.map((r, i) => {
                  const id = r.patient?.id;
                  if (!id) return null;
                  const active = selectedId === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => openPatient(id)}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-xl border border-gray-200/95 py-2.5 pe-3 ps-3 text-right shadow-sm transition-colors dark:border-slate-600",
                          active ? "border-gray-200/30 bg-blue-600" : "bg-white hover:bg-gray-50/90 dark:bg-slate-800/80 dark:hover:bg-slate-800"
                        )}
                      >
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold", active ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300")}>
                          {(i + 1).toString()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-semibold", active ? "text-white" : "text-gray-900 dark:text-white")}>
                            {r.patient?.name ?? "—"}
                          </p>
                          <p className={cn("mt-0.5 truncate text-xs", active ? "text-blue-100" : "text-gray-500 dark:text-slate-400")}>
                            آخر زيارة: {r.lastVisit ? formatDateMedium(r.lastVisit) : "—"}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        {/* COLUMN 2 — details */}
        <div className="order-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                {selected?.patient?.name ? `ملف المريض: ${selected.patient.name}` : "اختر مريضاً"}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {selected?.patient?.phone ? `هاتف: ${selected.patient.phone}` : " "}
              </p>
            </div>
            <Link href="/dashboard/medical-center" className="text-sm text-blue-600 dark:text-blue-400">
              الرئيسية
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-gray-300">
                <IconUsers className="mb-4 h-16 w-16" />
                <p className="text-sm text-gray-400">اختر مريضاً من القائمة</p>
                <p className="mt-1 text-xs text-gray-300">أو أضف مريضاً جديداً</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-50">
                  {selected.patient?.phone ? (
                    <div className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="text-gray-400 flex items-center gap-2"><IconPhone className="h-4 w-4" /> الهاتف</span>
                      <span dir="ltr" className="font-medium text-gray-900">{selected.patient.phone}</span>
                    </div>
                  ) : null}
                  {selected.patient?.email ? (
                    <div className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="text-gray-400 flex items-center gap-2"><IconMail className="h-4 w-4" /> البريد</span>
                      <span dir="ltr" className="font-medium text-gray-900">{selected.patient.email}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-gray-400 flex items-center gap-2"><IconClipboardText className="h-4 w-4" /> تفاصيل</span>
                    <Link href={`/dashboard/medical-center/patients/${selected.patient?.id}`} className="font-medium text-blue-700 hover:underline">
                      فتح ملف المريض
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مريض للمركز</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="اسم المريض" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="مثال: محمد أحمد" />
            <Input label="رقم الهاتف" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="05xxxxxxxx" dir="ltr" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => void submitAdd()} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

