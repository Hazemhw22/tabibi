import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Calendar,
  CreditCard,
  Star,
  CheckCircle,
  ArrowLeft,
  Shield,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getStats() {
  const [doctorsCount, appointmentsCount, specialtiesCount] = await Promise.all([
    prisma.doctor.count({ where: { status: "APPROVED" } }),
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.specialty.count(),
  ]);
  return { doctorsCount, appointmentsCount, specialtiesCount };
}

async function getSpecialties() {
  return await prisma.specialty.findMany({
    include: { _count: { select: { doctors: true } } },
    take: 8,
  });
}

async function getFeaturedDoctors() {
  return await prisma.doctor.findMany({
    where: { status: "APPROVED" },
    include: {
      user: true,
      specialty: true,
      clinics: { take: 1 },
    },
    orderBy: { rating: "desc" },
    take: 6,
  });
}

const SPECIALTY_ICONS: Record<string, string> = {
  "طب عام": "🩺",
  "طب أسنان": "🦷",
  "طب أطفال": "👶",
  "طب قلب": "❤️",
  "طب جلدية": "🌿",
  "جراحة عظام": "🦴",
  "نسائية وتوليد": "🌸",
  "طب أعصاب": "🧠",
  "طب عيون": "👁️",
  "أنف وأذن وحنجرة": "👂",
};

export default async function HomePage() {
  const [stats, specialties, doctors] = await Promise.all([
    getStats(),
    getSpecialties(),
    getFeaturedDoctors(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-indigo-300 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/30">
              <MapPin className="h-4 w-4" />
              الخليل، فلسطين
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              احجز موعدك مع
              <br />
              <span className="text-yellow-300">أفضل الأطباء</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              منصة Tabibi تربطك بأفضل الأطباء والعيادات في الخليل.
              احجز موعدك بسهولة وادفع بأمان.
            </p>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-3 shadow-2xl max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search className="h-5 w-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="ابحث عن طبيب أو تخصص..."
                  className="w-full text-gray-800 placeholder-gray-400 outline-none text-sm"
                />
              </div>
              <Link href="/doctors">
                <Button size="lg" className="w-full sm:w-auto rounded-xl">
                  ابحث الآن
                </Button>
              </Link>
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {["طب أسنان", "طب أطفال", "طب عام", "طب قلب"].map((spec) => (
                <Link
                  key={spec}
                  href={`/doctors?specialty=${spec}`}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-sm px-4 py-1.5 rounded-full transition-colors"
                >
                  {spec}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, value: `${stats.doctorsCount}+`, label: "طبيب مسجّل", color: "text-blue-600 bg-blue-50" },
              { icon: Calendar, value: `${stats.appointmentsCount}+`, label: "موعد منجز", color: "text-green-600 bg-green-50" },
              { icon: Star, value: "4.9", label: "تقييم المنصة", color: "text-yellow-600 bg-yellow-50" },
              { icon: Shield, value: "100%", label: "دفع آمن", color: "text-purple-600 bg-purple-50" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`inline-flex p-3 rounded-xl ${stat.color} mb-3`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">تصفح التخصصات</h2>
            <p className="text-gray-500">اختر التخصص المناسب للعثور على الطبيب الأمثل</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {specialties.map((specialty) => (
              <Link
                key={specialty.id}
                href={`/doctors?specialtyId=${specialty.id}`}
                className="group"
              >
                <Card className="hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer">
                  <CardContent className="p-5 text-center">
                    <div className="text-4xl mb-3">
                      {SPECIALTY_ICONS[specialty.nameAr] || "🏥"}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">
                      {specialty.nameAr}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {specialty._count.doctors} طبيب
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Doctors */}
      {doctors.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">أطباء مميزون</h2>
                <p className="text-gray-500">الأطباء الأعلى تقييماً على المنصة</p>
              </div>
              <Link href="/doctors">
                <Button variant="outline" className="gap-2">
                  عرض الكل
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <Link key={doctor.id} href={`/doctors/${doctor.id}`}>
                  <Card className="hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
                          {doctor.user.name?.charAt(0) || "D"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            د. {doctor.user.name}
                          </h3>
                          <p className="text-sm text-blue-600 font-medium">
                            {doctor.specialty.nameAr}
                          </p>
                          {doctor.clinics[0] && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <p className="text-xs text-gray-500 truncate">
                                {doctor.clinics[0].address}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-gray-800">
                            {doctor.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({doctor.totalReviews})
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          ₪{doctor.consultationFee}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {doctor.experienceYears} سنوات
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">كيف يعمل Tabibi؟</h2>
            <p className="text-gray-500">احجز موعدك في 3 خطوات بسيطة</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
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
                title: "ادفع بأمان",
                desc: "ادفع عبر Stripe أو PayPal بكل أمان وستصلك تأكيد الحجز فوراً",
                color: "bg-purple-600",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <Card className="border-0 shadow-md hover:shadow-xl transition-shadow">
                  <CardContent className="p-8 text-center">
                    <div
                      className={`${item.color} text-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg`}
                    >
                      <item.icon className="h-7 w-7" />
                    </div>
                    <div className="text-5xl font-bold text-gray-100 absolute top-4 left-4">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-5" />
          <h2 className="text-3xl font-bold mb-4">هل أنت طبيب؟</h2>
          <p className="text-gray-400 mb-8 text-lg leading-relaxed">
            انضم إلى منصة Tabibi واستقبل مرضى جدد من الخليل. سجّل عيادتك وحدد مواعيدك بكل سهولة.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=doctor">
              <Button size="xl" className="w-full sm:w-auto">
                سجّل كطبيب الآن
              </Button>
            </Link>
            <Link href="/about">
              <Button size="xl" variant="outline" className="w-full sm:w-auto border-gray-600 text-white hover:bg-gray-800">
                اعرف المزيد
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
