import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <FileText className="h-10 w-10 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">شروط الاستخدام</h1>
          <p className="text-gray-500 mt-1">آخر تحديث: 2025</p>
        </div>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. القبول</h2>
          <p className="text-sm leading-relaxed">
            باستخدامك منصة طبيبي فإنك توافق على هذه الشروط. إن كنت لا توافق عليها، يرجى عدم استخدام الخدمة.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. الخدمة</h2>
          <p className="text-sm leading-relaxed">
            توفر المنصة وسيلة لحجز المواعيد الطبية وإدارةها. العلاقة العلاجية هي بين المريض والطبيب، والمنصة لا تقدم استشارات طبية.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. المسؤولية</h2>
          <p className="text-sm leading-relaxed">
            المستخدم مسؤول عن صحة البيانات التي يقدمها. المنصة تسعى لتوفير خدمة مستقرة وآمنة دون ضمان عدم حدوث أخطاء أو انقطاع.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. التعديلات</h2>
          <p className="text-sm leading-relaxed">
            نحتفظ بحق تعديل هذه الشروط. استمرار استخدامك للخدمة بعد التعديل يعني موافقتك على النسخة المحدثة.
          </p>
        </section>
      </div>
    </div>
  );
}
