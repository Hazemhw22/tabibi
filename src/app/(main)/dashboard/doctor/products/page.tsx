"use client";

import Image from "next/image";
import { LayoutGrid, Store, Table2, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  price: number;
  currency?: string | null;
  stock: number;
  isActive: boolean;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
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

export default function DoctorProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addStock, setAddStock] = useState("0");
  const [addPickup, setAddPickup] = useState(true);
  const [addDelivery, setAddDelivery] = useState(true);
  const [addFile, setAddFile] = useState<File | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRow, setEditRow] = useState<ProductRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("0");
  const [editPickup, setEditPickup] = useState(true);
  const [editDelivery, setEditDelivery] = useState(true);
  const [editFile, setEditFile] = useState<File | null>(null);

  const canAdd = useMemo(() => addName.trim().length >= 2 && addFile != null, [addName, addFile]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/products", { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل تحميل المنتجات");
        return;
      }
      setProducts((j.products ?? []) as ProductRow[]);
      if (j.warning) toast.message(String(j.warning));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetAdd = () => {
    setAddName("");
    setAddPrice("");
    setAddStock("0");
    setAddPickup(true);
    setAddDelivery(true);
    setAddFile(null);
  };

  const submitAdd = async () => {
    if (!canAdd || !addFile) return;
    setAddSaving(true);
    try {
      const url = await uploadMarketplaceImage(addFile);
      if (!url) return;

      const res = await fetch("/api/doctor/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          imageUrl: url,
          price: parseFloat(addPrice) || 0,
          stock: parseInt(addStock || "0", 10) || 0,
          pickupAvailable: addPickup,
          deliveryAvailable: addDelivery,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل إضافة المنتج");
        return;
      }
      toast.success("تمت إضافة المنتج");
      setAddOpen(false);
      resetAdd();
      await load();
    } finally {
      setAddSaving(false);
    }
  };

  const toggleActive = async (row: ProductRow) => {
    const next = !row.isActive;
    setProducts((prev) => prev.map((p) => (p.id === row.id ? { ...p, isActive: next } : p)));
    const res = await fetch(`/api/doctor/products/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل التحديث");
      setProducts((prev) => prev.map((p) => (p.id === row.id ? row : p)));
    }
  };

  const remove = async (row: ProductRow) => {
    if (!confirm("حذف المنتج؟")) return;
    const prev = products;
    setProducts((p) => p.filter((x) => x.id !== row.id));
    const res = await fetch(`/api/doctor/products/${row.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل الحذف");
      setProducts(prev);
      return;
    }
    toast.success("تم الحذف");
  };

  const toggleFulfillment = async (row: ProductRow, key: "pickupAvailable" | "deliveryAvailable") => {
    const nextVal = !row[key];
    const nextRow = { ...row, [key]: nextVal };
    setProducts((prev) => prev.map((p) => (p.id === row.id ? nextRow : p)));
    const res = await fetch(`/api/doctor/products/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: nextVal }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "فشل التحديث");
      setProducts((prev) => prev.map((p) => (p.id === row.id ? row : p)));
    }
  };

  const openEdit = (row: ProductRow) => {
    setEditRow(row);
    setEditName(row.name);
    setEditPrice(String(row.price ?? 0));
    setEditStock(String(row.stock ?? 0));
    setEditPickup(Boolean(row.pickupAvailable));
    setEditDelivery(Boolean(row.deliveryAvailable));
    setEditFile(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    const n = editName.trim();
    if (n.length < 2) {
      toast.error("أدخل اسم المنتج");
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

      const res = await fetch(`/api/doctor/products/${editRow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          imageUrl,
          price: parseFloat(editPrice) || 0,
          stock: parseInt(editStock || "0", 10) || 0,
          pickupAvailable: editPickup,
          deliveryAvailable: editDelivery,
        }),
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
          <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setAddOpen(true)}>
          إضافة منتج
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">قائمة المنتجات</h2>
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
        ) : products.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center">لا يوجد منتجات بعد.</div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
                {products.map((p) => (
                  <div key={p.id} className={cn("rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm", !p.isActive && "opacity-60")}>
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-cover object-center"
                        sizes="(max-width:640px) 50vw, 160px"
                        unoptimized
                      />
                    </div>
                    <div className="p-2 space-y-1.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug">{p.name}</p>
                        <span className="shrink-0 text-[11px] font-bold text-green-600 tabular-nums">₪{Number(p.price ?? 0).toFixed(0)}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center justify-between gap-1">
                        <span>مخزون {p.stock ?? 0}</span>
                        <span>{p.isActive ? "ظاهر" : "مخفي"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px]" onClick={() => openEdit(p)}>
                          تعديل
                        </Button>
                        <Button size="sm" variant={p.isActive ? "outline" : "default"} className="h-7 px-2 text-[11px]" onClick={() => void toggleActive(p)}>
                          {p.isActive ? "إخفاء" : "إظهار"}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant={p.pickupAvailable ? "outline" : "secondary"}
                          className={cn("h-7 w-7 shrink-0", !p.pickupAvailable && "opacity-70")}
                          title={p.pickupAvailable ? "إيقاف الاستلام من العيادة" : "تفعيل الاستلام"}
                          aria-label={p.pickupAvailable ? "إيقاف الاستلام" : "تفعيل الاستلام"}
                          onClick={() => void toggleFulfillment(p, "pickupAvailable")}
                        >
                          <Store className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant={p.deliveryAvailable ? "outline" : "secondary"}
                          className={cn("h-7 w-7 shrink-0", !p.deliveryAvailable && "opacity-70")}
                          title={p.deliveryAvailable ? "إيقاف التوصيل" : "تفعيل التوصيل"}
                          aria-label={p.deliveryAvailable ? "إيقاف التوصيل" : "تفعيل التوصيل"}
                          onClick={() => void toggleFulfillment(p, "deliveryAvailable")}
                        >
                          <Truck className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]" onClick={() => void remove(p)}>
                          حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr className="text-right">
                      <th className="py-2 px-3 font-medium w-[4.5rem]">صورة</th>
                      <th className="py-2 px-3 font-medium">المنتج</th>
                      <th className="py-2 px-3 font-medium">السعر</th>
                      <th className="py-2 px-3 font-medium">المخزون</th>
                      <th className="py-2 px-3 font-medium">الاستلام/التوصيل</th>
                      <th className="py-2 px-3 font-medium">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => (
                      <tr key={`row-${p.id}`}>
                        <td className="py-2 px-3 align-middle">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <Image
                              src={p.imageUrl}
                              alt={p.name}
                              fill
                              className="object-cover object-center"
                              sizes="56px"
                              unoptimized
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">{p.name}</td>
                        <td className="py-2 px-3 align-middle tabular-nums">₪{Number(p.price ?? 0).toFixed(0)}</td>
                        <td className="py-2 px-3 align-middle tabular-nums">{p.stock ?? 0}</td>
                        <td className="py-2 px-3 align-middle">
                          {(p.pickupAvailable ? "استلام" : "") +
                            (p.pickupAvailable && p.deliveryAvailable ? " + " : "") +
                            (p.deliveryAvailable ? "توصيل" : "")}
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                              تعديل
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void toggleActive(p)}>
                              تبديل الظهور
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => void remove(p)}>
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
            <DialogTitle>إضافة منتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="اسم المنتج" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="مثال: شامبو علاجي" />
            <div className="grid grid-cols-2 gap-3">
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
              <Input
                label="المخزون"
                type="number"
                min={0}
                step={1}
                value={addStock}
                onChange={(e) => setAddStock(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">صورة المنتج</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-600 file:mr-0 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white"
                onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={addPickup} onChange={(e) => setAddPickup(e.target.checked)} />
                استلام من العيادة
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={addDelivery} onChange={(e) => setAddDelivery(e.target.checked)} />
                توصيل للمنزل
              </label>
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
            <DialogTitle>تعديل المنتج</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {editRow?.imageUrl ? (
              <div className="relative h-36 w-full overflow-hidden rounded-xl bg-gray-100">
                <Image src={editRow.imageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            ) : null}
            <Input label="اسم المنتج" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="السعر (₪)" type="number" min={0} step={1} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} dir="ltr" />
              <Input label="المخزون" type="number" min={0} step={1} value={editStock} onChange={(e) => setEditStock(e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">تغيير الصورة (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-600 file:mr-0 file:rounded-lg file:border-0 file:bg-gray-200 file:px-3 file:py-1.5"
                onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={editPickup} onChange={(e) => setEditPickup(e.target.checked)} />
                استلام من العيادة
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={editDelivery} onChange={(e) => setEditDelivery(e.target.checked)} />
                توصيل للمنزل
              </label>
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
