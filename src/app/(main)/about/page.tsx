import Link from "next/link";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconHeart from "@/components/icon/icon-heart";
import IconLock from "@/components/icon/icon-lock";
import IconClock from "@/components/icon/icon-clock";
import IconUsers from "@/components/icon/icon-users";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <IconArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-4">عن منصة Tabibi</h1>
      <p className="text-gray-600 leading-relaxed mb-10">
        منصة Tabibi منصة رقمية لتسهيل حجز المواعيد الطبية في الخليل وفلسطين. نربط بين المرضى والأطباء والعيادات لتوفير تجربة حجز بسيطة وآمنة.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[
          { icon: IconHeart, title: "رعاية صحية أسهل", desc: "احجز موعدك مع الطبيب المناسب في دقائق." },
          { icon: IconLock, title: "بياناتك آمنة", desc: "نلتزم بحماية بياناتك وخصوصيتك." },
          { icon: IconClock, title: "مواعيد مرنة", desc: "اختر الوقت والطبيب المناسبين لجدولك." },
          { icon: IconUsers, title: "أطباء معتمدون", desc: "تعاون مع أطباء ومعتمدين في تخصصات متعددة." },
        ].map((item) => (
          <div key={item.title} className="p-6 rounded-xl border border-gray-200 bg-white">
            <item.icon className="h-10 w-10 text-blue-600 mb-3" />
            <h2 className="font-semibold text-gray-900 mb-2">{item.title}</h2>
            <p className="text-gray-600 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <Link href="/doctors">
          <Button>تصفح الأطباء</Button>
        </Link>
        <Link href="/contact">
          <Button variant="outline">تواصل معنا</Button>
        </Link>
      </div>
    </div>
  );
}
