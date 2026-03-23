import Link from "next/link";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconLock from "@/components/icon/icon-lock";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <IconArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <IconLock className="h-10 w-10 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">سياسة الخصوصية</h1>
          <p className="text-gray-500 mt-1">آخر تحديث: 2025</p>
        </div>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">1. البيانات التي نجمعها</h2>
          <p className="text-sm leading-relaxed">
            نجمع البيانات التي تقدمها عند التسجيل والحجز مثل الاسم، البريد الإلكتروني، رقم الهاتف، وبيانات المواعيد والدفع اللازمة لتشغيل الخدمة.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">2. استخدام البيانات</h2>
          <p className="text-sm leading-relaxed">
            نستخدم بياناتك لتقديم خدمة الحجز، إدارة المواعيد، التواصل معك، وتحسين تجربة الاستخدام. لا نبيع بياناتك الشخصية لأطراف ثالثة لأغراض تسويقية.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">3. الحماية والأمان</h2>
          <p className="text-sm leading-relaxed">
            نطبق إجراءات تقنية وإدارية مناسبة لحماية بياناتك من الوصول أو الاستخدام غير المصرح به.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">4. التواصل</h2>
          <p className="text-sm leading-relaxed">
            لأي استفسار بخصوص الخصوصية يمكنك التواصل معنا عبر صفحة «تواصل معنا».
          </p>
        </section>
      </div>
    </div>
  );
}
