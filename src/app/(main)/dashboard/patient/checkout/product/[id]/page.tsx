"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  currency?: string | null;
  stock: number;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  doctor?: {
    id?: string;
    user?: { name?: string | null };
    locationId?: string | null;
    whatsapp?: string | null;
    userPhone?: string | null;
  } | null;
};

export default function PatientProductCheckoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [quantity, setQuantity] = useState("1");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");

  const qty = useMemo(() => Math.max(1, parseInt(quantity || "1", 10) || 1), [quantity]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/doctor-products/${encodeURIComponent(productId)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.product) {
          toast.error(j.error || "المنتج غير متاح");
          router.replace("/dashboard/patient");
          return;
        }
        if (!cancelled) setProduct(j.product as ProductRow);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, router]);

  useEffect(() => {
    if (!product) return;
    if (product.pickupAvailable && !product.deliveryAvailable) setFulfillment("PICKUP");
    if (!product.pickupAvailable && product.deliveryAvailable) setFulfillment("DELIVERY");
  }, [product]);

  const submit = async () => {
    if (!product) return;
    if (fulfillment === "DELIVERY" && !address.trim()) {
      toast.error("أدخل عنوان التوصيل");
      return;
    }
    if (product.stock != null && product.stock < qty) {
      toast.error("الكمية غير متوفرة");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/product-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: qty,
          fulfillmentMethod: fulfillment,
          deliveryAddress: fulfillment === "DELIVERY" ? address.trim() : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل إنشاء الطلب");
        return;
      }
      toast.success("تم إرسال الطلب (الدفع عند الاستلام)");
      router.push("/dashboard/patient");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !product) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-sm text-gray-500">جارٍ التحميل...</div>
    );
  }

  const total = (Number(product.price) || 0) * qty;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
        <div className="relative h-48 bg-gray-100">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" unoptimized />
        </div>
        <div className="p-4 space-y-2">
          <h1 className="text-lg font-bold text-gray-900">{product.name}</h1>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">السعر</span>
            <span className="text-lg font-bold text-green-600">₪{Number(product.price).toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>المخزون المتاح: {product.stock ?? 0}</span>
            <span>الدفع: عند الاستلام</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <Input
          label="الكمية"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          dir="ltr"
        />

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">طريقة التسليم</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!product.pickupAvailable}
              onClick={() => setFulfillment("PICKUP")}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                fulfillment === "PICKUP"
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-white text-gray-700",
                !product.pickupAvailable && "opacity-40 cursor-not-allowed",
              )}
            >
              استلام من العيادة
            </button>
            <button
              type="button"
              disabled={!product.deliveryAvailable}
              onClick={() => setFulfillment("DELIVERY")}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                fulfillment === "DELIVERY"
                  ? "border-blue-600 bg-blue-50 text-blue-800"
                  : "border-gray-200 bg-white text-gray-700",
                !product.deliveryAvailable && "opacity-40 cursor-not-allowed",
              )}
            >
              توصيل للمنزل
            </button>
          </div>
        </div>

        {fulfillment === "DELIVERY" ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">عنوان التوصيل</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full min-h-[88px] rounded-lg border border-gray-300 p-2 text-sm"
              placeholder="المدينة، الحي، الشارع، تفاصيل إضافية..."
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-gray-600">الإجمالي</span>
          <span className="text-lg font-bold text-gray-900">₪{total.toFixed(0)}</span>
        </div>

        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => void submit()} disabled={submitting}>
          {submitting ? "جارٍ الطلب..." : "تأكيد الطلب"}
        </Button>
      </div>
    </div>
  );
}
