"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // يمكن ربطه لاحقاً بـ API أو خدمة بريد
      await new Promise((r) => setTimeout(r, 800));
      toast.success("تم إرسال رسالتك. سنتواصل معك قريباً.");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("حدث خطأ. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">تواصل معنا</h1>
      <p className="text-gray-500 mb-10">نسعد بتلقي استفساراتك واقتراحاتك</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">العنوان</h3>
                <p className="text-gray-600 text-sm">الخليل، فلسطين</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">البريد الإلكتروني</h3>
                <p className="text-gray-600 text-sm" dir="ltr">info@t.ps</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">الهاتف</h3>
                <p className="text-gray-600 text-sm" dir="ltr">+970 2 222 0000</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">أرسل رسالة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="الاسم"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
              required
            />
            <Input
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الرسالة</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
