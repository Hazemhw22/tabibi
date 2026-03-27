"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import IconClipboardText from "@/components/icon/icon-clipboard-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { toast } from "sonner";
import { CENTER_ROLE_ADMIN, CENTER_ROLE_LAB } from "@/lib/medical-center-roles";
import LoadingScreen from "@/components/ui/loading-screen";
import { formatDateMedium } from "@/lib/utils";

type PatientOpt = { id: string; label: string };

type DocRow = {
  id: string;
  category: string;
  title: string;
  fileUrl: string;
  fileName?: string | null;
  createdAt?: string | null;
  patientUserId?: string;
};

export default function LabResultsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const allowed = role === CENTER_ROLE_ADMIN || role === CENTER_ROLE_LAB;

  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [patientUserId, setPatientUserId] = useState("");
  const [category, setCategory] = useState("LAB");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const loadDocs = useCallback(() => {
    fetch("/api/medical-center/patient-documents")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) toast.error(j.error);
        else setDocs(j.documents ?? []);
      })
      .catch(() => toast.error("تعذر تحميل المستندات"));
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) {
      router.replace("/dashboard/medical-center");
      return;
    }
    let cancelled = false;
    setListLoading(true);
    void (async () => {
      try {
        const [pr, dr] = await Promise.all([
          fetch("/api/medical-center/patients").then((r) => r.json()),
          fetch("/api/medical-center/patient-documents").then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (!pr.error) {
          const rows = (pr.patients ?? []) as { patient?: { id?: string; name?: string; phone?: string } }[];
          const opts: PatientOpt[] = [];
          const seen = new Set<string>();
          for (const row of rows) {
            const p = row.patient;
            const id = p?.id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            opts.push({
              id,
              label: `${p?.name ?? "مريض"}${p?.phone ? ` — ${p.phone}` : ""}`,
            });
          }
          setPatients(opts);
        }
        if (!dr.error) setDocs(dr.documents ?? []);
        else toast.error(dr.error);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, status, router]);

  const patientOptions = useMemo(
    () => [{ value: "", label: "— اختر المريض —" }, ...patients.map((p) => ({ value: p.id, label: p.label }))],
    [patients]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientUserId || !file || !title.trim()) {
      toast.error("اختر المريض والملف والعنوان");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("patientUserId", patientUserId);
      fd.append("category", category);
      fd.append("title", title.trim());
      if (notes.trim()) fd.append("notes", notes.trim());
      const res = await fetch("/api/medical-center/patient-documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "فشل الرفع");
        return;
      }
      toast.success(data.message || "تم الرفع");
      setTitle("");
      setNotes("");
      setFile(null);
      loadDocs();
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setUploading(false);
    }
  };

  if (status === "loading" || !allowed) {
    return <LoadingScreen label="جاري التحميل..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>

      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        <IconClipboardText className="h-7 w-7 text-teal-600 shrink-0" />
        التحاليل والأشعة
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        ارفع ملفات PDF أو صوراً لنتائج التحاليل أو الأشعة. تُربَط بحساب المريض على المنصة بعد التحقق من وجود حجز أو سجل
        له عند أطباء المركز.
      </p>

      <Card className="mb-8 dark:border-gray-700">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>المريض</Label>
              <div className="mt-1 max-w-md">
                <DropdownSelect
                  value={patientUserId}
                  onChange={setPatientUserId}
                  options={patientOptions}
                  placeholder="اختر المريض"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>النوع</Label>
                <div className="mt-1">
                  <DropdownSelect
                    value={category}
                    onChange={setCategory}
                    options={[
                      { value: "LAB", label: "تحاليل" },
                      { value: "IMAGING", label: "أشعة / تصوير" },
                    ]}
                    placeholder="النوع"
                  />
                </div>
              </div>
              <div>
                <Label>عنوان المستند</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="مثال: CBP — 2025" />
              </div>
            </div>
            <div>
              <Label>ملاحظات (اختياري)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>ملف</Label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                className="mt-1 max-w-md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={uploading} className="bg-teal-600 hover:bg-teal-700">
              {uploading ? "جاري الرفع..." : "رفع للملف"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">آخر المرفوعات</h2>
      {listLoading ? (
        <p className="text-gray-500">جاري التحميل...</p>
      ) : docs.length === 0 ? (
        <p className="text-gray-500 text-sm">لا توجد مستندات بعد.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium">{d.title}</span>
                <span className="text-gray-500 mr-2">
                  ({d.category === "LAB" ? "تحاليل" : "أشعة"}) — {d.createdAt ? formatDateMedium(d.createdAt) : ""}
                </span>
              </div>
              <a
                href={d.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline shrink-0"
              >
                فتح الملف
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
