"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IconUser from "@/components/icon/icon-user";
import IconLoader from "@/components/icon/icon-loader";
import { toast } from "sonner";

type Props = {
  defaultName: string;
  defaultPhone: string;
  defaultImage?: string | null;
};

export function PatientSettingsForm({ defaultName, defaultPhone, defaultImage }: Props) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [image, setImage] = useState<string | null>(defaultImage ?? null);

  const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/avatar", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || "فشل رفع الصورة");
    return data.url as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    setLoading(true);
    try {
      const payload = { name: name.trim(), phone: phone.trim() || undefined, image: image || undefined };
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof data.name === "string") setName(data.name);
        if (data.phone !== undefined) setPhone(data.phone ?? "");
        if (data.image !== undefined) setImage(data.image ?? null);
        toast.success("تم حفظ التعديلات بنجاح.");
        await updateSession({ image: data.image ?? null, name: data.name });
        router.refresh();
      } else {
        toast.error(data.error || "فشل الحفظ");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUser className="h-5 w-5" />
          تعديل بياناتي
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              {image ? (
                <Image src={image} alt="صورة المستخدم" fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <IconUser className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  const input = e.currentTarget;
                  if (!file) return;
                  try {
                    setUploading(true);
                    const url = await uploadAvatar(file);
                    setImage(url);
                    toast.success("تم رفع الصورة بنجاح، اضغط حفظ لتثبيتها");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
                  } finally {
                    setUploading(false);
                    if (input) input.value = "";
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
                {uploading ? "جاري الرفع..." : "تغيير الصورة"}
              </Button>
              {image ? (
                <Button type="button" variant="ghost" onClick={() => setImage(null)}>
                  إزالة
                </Button>
              ) : null}
            </div>
          </div>
          <Input
            label="الاسم"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
            required
            minLength={2}
            maxLength={100}
          />
          <Input
            label="رقم الهاتف / الواتساب (اختياري)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="مثال: 0599123456"
            dir="ltr"
          />
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <IconLoader className="h-4 w-4 animate-spin" /> : null}
            حفظ التعديلات
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
