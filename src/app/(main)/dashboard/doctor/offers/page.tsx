"use client";

import Image from "next/image";
import { LayoutGrid, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type OfferRow = {
  id: string;
  title: string;
  imageUrl: string;
  price: number;
  currency?: string | null;
  isActive: boolean;
  createdAt?: string;
};

async function uploadMarketplaceImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/marketplace-image", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(j.error || "فشل رفع الصورة");
    return null;
  }
  return typeof j.url === "string" ? j.url : null;
}

export default function DoctorOffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addFile, setAddFile] = useState<File | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRow, setEditRow] = useState<OfferRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);

  const canAdd = useMemo(() => addTitle.trim().length >= 2 && addFile != null, [addTitle, addFile]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/offers", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل تحميل العروضات");
        return;
      }
      setOffers((j.offers ?? []) as OfferRow[]);
      if (j.warning) toast.message(String(j.warning));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetAdd = () => {
    setAddTitle("");
    setAddPrice("");
    setAddFile(null);
  };

  const submitAdd = async () => {
    if (!canAdd || !addFile) return;
    setAddSaving(true);
    try {
      const url = await uploadMarketplaceImage(addFile);
      if (!url) return;

      const res = await fetch("/api/doctor/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          imageUrl: url,
          price: parseFloat(addPrice) || 0,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل إضافة العرض");
        return;
      }
      toast.success("تمت إضافة العرض");
      setAddOpen(false);
      resetAdd();
      await load();
    } finally {
      setAddSaving(false);
    }
  };

  const toggleActive = async (row: OfferRow) => {
    const next = !row.isActive;
    setOffers((prev) => prev.map((o) => (o.id === row.id ? { ...o, isActive: next } : o)));
    const res = await fetch(`/api/doctor/offers/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل التحديث");
      setOffers((prev) => prev.map((o) => (o.id === row.id ? row : o)));
    }
  };

  const remove = async (row: OfferRow) => {
    if (!confirm("حذف العرض؟")) return;
    const prev = offers;
    setOffers((p) => p.filter((x) => x.id !== row.id));
    const res = await fetch(`/api/doctor/offers/${row.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل الحذف");
      setOffers(prev);
      return;
    }
    toast.success("تم الحذف");
  };

  const openEdit = (row: OfferRow) => {
    setEditRow(row);
    setEditTitle(row.title);
    setEditPrice(String(row.price ?? 0));
    setEditFile(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const t = editTitle.trim();
    if (t.length < 2) {
      toast.error("أدخل عنواناً للعرض");
      return;
    }
    setEditSaving(true);
    try {
      let imageUrl = editRow.imageUrl;
      if (editFile) {
        const url = await uploadMarketplaceImage(editFile);
        if (!url) return;
        imageUrl = url;
      }

      const res = await fetch(`/api/doctor/offers/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, imageUrl, price: parseFloat(editPrice) || 0 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل التعديل");
        return;
      }
      toast.success("تم حفظ التعديل");
      setEditOpen(false);
      setEditRow(null);
      setEditFile(null);
      await load();
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العروضات</h1>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setAddOpen(true)}>
          إضافة عرض
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">قائمة العروض</h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/80 p-0.5" role="group" aria-label="طريقة العرض">
              <Button
                type="button"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setViewMode("grid")}
                aria-pressed={viewMode === "grid"}
                aria-label="عرض شبكي"
                title="عرض شبكي"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setViewMode("table")}
                aria-pressed={viewMode === "table"}
                aria-label="عرض جدول"
                title="عرض جدول"
              >
                <Table2 className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              تحديث
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-8 text-center">جارٍ التحميل...</div>
        ) : offers.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center">لا يوجد عروضات بعد.</div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
                {offers.map((o) => (
                  <div key={o.id} className={cn("rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm", !o.isActive && "opacity-60")}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      <Image
                        src={o.imageUrl}
                        alt={o.title}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width:640px) 50vw, 160px"
                        unoptimized
                      />
                    </div>
                    <div className="p-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{o.title}</p>
                        <span className="shrink-0 text-[11px] font-bold text-green-600 tabular-nums">₪{Number(o.price ?? 0).toFixed(0)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px]" onClick={() => openEdit(o)}>
                          تعديل
                        </Button>
                        <Button size="sm" variant={o.isActive ? "outline" : "default"} className="h-7 px-2 text-[11px]" onClick={() => void toggleActive(o)}>
                          {o.isActive ? "إخفاء" : "إظهار"}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]" onClick={() => void remove(o)}>
                          حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="text-right">
                      <th className="py-2 px-3 font-medium w-[4.5rem]">صورة</th>
                      <th className="py-2 px-3 font-medium">العرض</th>
                      <th className="py-2 px-3 font-medium">السعر</th>
                      <th className="py-2 px-3 font-medium">الحالة</th>
                      <th className="py-2 px-3 font-medium">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {offers.map((o) => (
                      <tr key={`row-${o.id}`}>
                        <td className="py-2 px-3 align-middle">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <Image
                              src={o.imageUrl}
                              alt={o.title}
                              fill
                              className="object-cover object-center"
                              sizes="56px"
                              unoptimized
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">{o.title}</td>
                        <td className="py-2 px-3 align-middle tabular-nums">₪{Number(o.price ?? 0).toFixed(0)}</td>
                        <td className="py-2 px-3 align-middle">{o.isActive ? "ظاهر" : "مخفي"}</td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(o)}>
                              تعديل
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void toggleActive(o)}>
                              تبديل
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void remove(o)}>
                              حذف
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) resetAdd();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة عرض</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="اسم العرض" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} placeholder="مثال: تنظيف وتلميع" />
            <Input
              label="السعر (₪)"
              type="number"
              min={0}
              step={1}
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              placeholder="0"
              dir="ltr"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">صورة العرض</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-600 file:mr-0 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white"
                onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-[11px] text-gray-500">صيغ مسموحة: JPG, PNG, WebP — حتى 5 ميجا تقريباً.</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => void submitAdd()} disabled={!canAdd || addSaving}>
              {addSaving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل العرض</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editRow?.imageUrl ? (
              <div className="relative h-36 w-full overflow-hidden rounded-xl bg-gray-100">
                <Image src={editRow.imageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : null}
            <Input label="اسم العرض" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <Input label="السعر (₪)" type="number" min={0} step={1} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} dir="ltr" />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">تغيير الصورة (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-600 file:mr-0 file:rounded-lg file:border-0 file:bg-gray-200 file:px-3 file:py-1.5"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={editSaving}>
              {editSaving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
