import Link from "next/link";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const faqs = [
  { q: "كيف أحجز موعداً؟", a: "سجّل الدخول أو أنشئ حساباً، ثم اذهب إلى صفحة الأطباء واختر الطبيب والتاريخ والوقت المناسبين وأكمل الحجز والدفع." },
  { q: "هل يمكن إلغاء الموعد؟", a: "نعم، يمكنك إلغاء أو تعديل الموعد من لوحة تحكمك تحت «مواعيدي» قبل موعد الزيارة بوقت كافٍ حسب سياسة العيادة." },
  { q: "ما طرق الدفع المتاحة؟", a: "نقبل الدفع الإلكتروني عبر البطاقات والطرق المتاحة في المنصة عند إتمام الحجز." },
  { q: "كيف أتصل بالدعم؟", a: "يمكنك استخدام صفحة «تواصل معنا» أو البريد الإلكتروني المذكور في الموقع وسنرد في أقرب وقت." },
];

export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="h-10 w-10 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الأسئلة الشائعة</h1>
          <p className="text-gray-500 mt-1">إجابات عن الاستفسارات الأكثر تكراراً</p>
        </div>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <h2 className="font-semibold text-gray-900">{faq.q}</h2>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
