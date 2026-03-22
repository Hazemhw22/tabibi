import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, CreditCard } from "lucide-react";

const STEPS = [
  {
    step: "١",
    icon: Search,
    title: "ابحث عن طبيب",
    desc: "ابحث بالتخصص، الموقع، أو التقييم للعثور على الطبيب المناسب لك",
    color: "bg-blue-600",
  },
  {
    step: "٢",
    icon: Calendar,
    title: "احجز موعدك",
    desc: "اختر الوقت المناسب من المواعيد المتاحة وأضف ملاحظاتك",
    color: "bg-indigo-600",
  },
  {
    step: "٣",
    icon: CreditCard,
    title: "تابع دفعاتك والديون",
    desc: "تابع دفعاتك والديون الخاصة بك من لوحة تحكمك بكل وضوح",
    color: "bg-purple-600",
  },
];

/** قسم «كيف يعمل Tabibi» — متناسق مع الوضع الداكن */
export function HowItWorksSection() {
  return (
    <section className="py-10 sm:py-16 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-[#060818] dark:to-[#0a0f1a] dark:border-y dark:border-white/5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
            كيف يعمل Tabibi؟
          </h2>
          <p className="text-gray-500 dark:text-slate-400">احجز موعدك في 3 خطوات بسيطة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((item, i) => (
            <div key={i} className="relative">
              <Card className="border-0 shadow-md hover:shadow-xl transition-shadow dark:bg-slate-800/90 dark:border dark:border-slate-700/80">
                <CardContent className="p-8 text-center">
                  <div
                    className={`${item.color} text-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg`}
                  >
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div className="text-5xl font-bold text-gray-100 dark:text-slate-700/80 absolute top-4 left-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-gray-500 dark:text-slate-400 leading-relaxed text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
