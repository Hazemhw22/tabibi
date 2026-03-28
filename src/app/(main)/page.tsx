import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import IconSearch from "@/components/icon/icon-search";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconStar from "@/components/icon/icon-star";
import IconMessage from "@/components/icon/icon-message";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconBuilding from "@/components/icon/icon-building";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth } from "@/lib/auth";
import { isMedicalCenterStaffRole } from "@/lib/medical-center-roles";
import FavoriteButton from "@/components/ui/favorite-button";
import { getDoctorAvatar } from "@/lib/avatar";

const SPECIALTY_ICONS: Record<string, string> = {
  "طب عام": "🩺", "طب أسنان": "🦷", "طب أطفال": "👶", "طب قلب": "❤️",
  "طب جلدية": "🌿", "جراحة عظام": "🦴", "نسائية وتوليد": "🌸",
  "طب أعصاب": "🧠", "طب عيون": "👁️", "أنف وأذن وحنجرة": "👂",
};

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600", "from-teal-500 to-cyan-600",
  "from-violet-500 to-purple-600", "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-emerald-500 to-green-600",
];

async function getSpecialties() {
  const { data } = await supabaseAdmin.from("Specialty").select("id, nameAr, icon").limit(10);
  return data ?? [];
}

type DoctorRow = {
  id: string; locationId?: string | null; rating?: number; totalReviews?: number;
  consultationFee?: number; experienceYears?: number; whatsapp?: string | null;
  gender?: string | null;
  user?: { name?: string; phone?: string; image?: string | null } | { name?: string; phone?: string; image?: string | null }[];
  specialty?: { nameAr?: string } | { nameAr?: string }[];
  clinics?: { address?: string; phone?: string }[];
};

async function getFeaturedDoctors() {
  const { data } = await supabaseAdmin
    .from("Doctor")
    .select(`id, locationId, rating, totalReviews, consultationFee, experienceYears, whatsapp, gender,
      user:User!Doctor_userId_fkey(name, phone, image), specialty:Specialty(nameAr), clinics:Clinic(address, phone)`)
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true)
    .order("rating", { ascending: false })
    .limit(8);
  return (data ?? []).map((d, i) => {
    const raw = d as DoctorRow;
    const user = Array.isArray(raw.user) ? raw.user[0] : raw.user;
    const specialty = Array.isArray(raw.specialty) ? raw.specialty[0] : raw.specialty;
    return {
      id: raw.id,
      rating: raw.rating ?? 0,
      consultationFee: raw.consultationFee ?? 0,
      experienceYears: raw.experienceYears ?? 0,
      whatsapp: raw.whatsapp,
      gender: raw.gender ?? "MALE",
      user: user ?? {},
      specialty: specialty ?? {},
      clinics: raw.clinics ?? [],
      gradIdx: i % CARD_GRADIENTS.length,
      avatarUrl: getDoctorAvatar((user as { image?: string | null })?.image, raw.gender),
    };
  });
}

async function getMedicalCenters() {
  const { data } = await supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr, address, city, phone")
    .eq("isActive", true)
    .limit(4);
  return data ?? [];
}

async function getStats() {
  const [patientsRes, doctorsRes, specialtiesRes] = await Promise.all([
    supabaseAdmin.from("User").select("id", { count: "exact", head: true }).eq("role", "PATIENT"),
    supabaseAdmin.from("Doctor").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
    supabaseAdmin.from("Specialty").select("id", { count: "exact", head: true }),
  ]);
  return {
    patients: patientsRes.count ?? 0,
    doctors: doctorsRes.count ?? 0,
    specialties: specialtiesRes.count ?? 0,
  };
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k+`;
  return n > 0 ? `${n}+` : "0";
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = session.user.role ?? "PATIENT";
    if (role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN") redirect("/dashboard/admin");
    if (role === "DOCTOR") redirect("/dashboard/doctor");
    if (isMedicalCenterStaffRole(role)) redirect("/dashboard/medical-center");
    redirect("/dashboard/patient");
  }

  const [specialties, doctors, centers, stats] = await Promise.all([
    getSpecialties(), getFeaturedDoctors(), getMedicalCenters(), getStats(),
  ]);

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">

      {/* ===== HERO SECTION ===== */}
      <section className="relative bg-blue-50 dark:bg-[#0d1f3c] overflow-hidden">
        <div className="max-w-4xl mx-auto">

          {/* ── Mobile layout (< md) ── */}
          <div className="md:hidden">
            <div className="flex items-end">
              <div className="flex-1 pt-6 pr-4 pb-0 pl-0 z-10">
                <p className="text-blue-600 dark:text-blue-400 text-lg font-semibold mb-1">منصة طبيبي 🩺</p>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-slate-100 leading-snug mb-1.5">
                  <span className="text-blue-600 dark:text-blue-400">رعاية صحية </span>
                  <span className="text-blue-600 dark:text-blue-400">في متناول يدك</span>
                </h1>
                <p className="text-gray-500 dark:text-slate-400 text-[13px] leading-relaxed mb-3">
                  احجز موعدك مع أفضل الأطباء في الضفة الغربية بكل سهولة
                </p>
              </div>
              <div className="shrink-0 w-[200px] self-end mb-[10px]">
                <Image
                  src="/pngtree-professional-young-team-or-group-of-doctors-colleagues-png-image_10677084.png"
                  alt="فريق الأطباء"
                  width={310}
                  height={290}
                  className="w-full object-contain object-bottom"
                  unoptimized
                  priority
                />
              </div>
            </div>

            {/* Search bar */}
            <div className="px-4 pb-3">
              <Link href="/doctors">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-md border border-blue-100 dark:border-slate-700 active:shadow-sm transition-shadow">
                  <div className="bg-blue-600 rounded-xl p-1.5 shrink-0">
                    <IconSearch className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-gray-400 dark:text-slate-500 text-sm flex-1">ابحث عن طبيب أو تخصص...</span>
                </div>
              </Link>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-around px-4 pb-4">
              <div className="text-center">
                <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">{formatCount(stats.patients)}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">مريض مسجل</p>
              </div>
              <div className="w-px h-7 bg-gray-300 dark:bg-slate-600" />
              <div className="text-center">
                <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">{formatCount(stats.doctors)}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">طبيب</p>
              </div>
              <div className="w-px h-7 bg-gray-300 dark:bg-slate-600" />
              <div className="text-center">
                <p className="text-base font-extrabold text-gray-900 dark:text-slate-100">{formatCount(stats.specialties)}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">تخصص</p>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="px-4 pb-6 flex gap-3">
              <Link href="/login" className="flex-1 text-center bg-blue-600 text-white font-bold py-3 rounded-2xl text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200/30">
                احجز موعداً
              </Link>
              <Link href="/doctors" className="flex-1 text-center bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold py-3 rounded-2xl text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-blue-200 dark:border-slate-600">
                تصفح الأطباء
              </Link>
            </div>
          </div>

          {/* ── Desktop layout (≥ md) ── */}
          <div className="hidden md:flex items-stretch min-h-[320px]">
            <div className="w-[340px] lg:w-[400px] flex items-end shrink-0">
              <Image
                src="/pngtree-professional-young-team-or-group-of-doctors-colleagues-png-image_10677084.png"
                alt="فريق الأطباء"
                width={400}
                height={330}
                className="w-full object-contain object-bottom"
                unoptimized
                priority
              />
            </div>

            <div className="flex-1 flex flex-col justify-center py-10 pr-8 pl-4">
              <p className="text-blue-500 dark:text-blue-400 text-sm font-semibold mb-2">منصة طبيبي 🩺</p>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-slate-100 leading-tight mb-3">
                رعاية صحية<br />
                <span className="text-blue-600 dark:text-blue-400">في متناول يدك</span>
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm lg:text-base mb-5 leading-relaxed max-w-sm">
                احجز موعدك مع أفضل الأطباء في الضفة الغربية بكل سهولة
              </p>

              <Link href="/doctors" className="block max-w-sm mb-5">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-md border border-blue-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
                  <div className="bg-blue-600 rounded-xl p-1.5 shrink-0">
                    <IconSearch className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-400 dark:text-slate-500 text-sm flex-1">ابحث عن طبيب أو تخصص...</span>
                </div>
              </Link>

              <div className="flex items-center gap-5 mb-6">
                <div>
                  <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100">{formatCount(stats.patients)}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">مريض</p>
                </div>
                <div className="w-px h-8 bg-gray-300 dark:bg-slate-600" />
                <div>
                  <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100">{formatCount(stats.doctors)}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">طبيب</p>
                </div>
                <div className="w-px h-8 bg-gray-300 dark:bg-slate-600" />
                <div>
                  <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100">{formatCount(stats.specialties)}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">تخصص</p>
                </div>
              </div>

              <div className="flex gap-3 max-w-sm">
                <Link href="/login" className="flex-1 text-center bg-blue-600 text-white font-bold py-3 rounded-2xl text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200/30">
                  احجز موعداً
                </Link>
                <Link href="/doctors" className="flex-1 text-center bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold py-3 rounded-2xl text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-blue-200 dark:border-slate-600">
                  تصفح الأطباء
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 space-y-8 pb-10">

        {/* ===== SPECIALTIES ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">التخصصات الطبية</h2>
            <Link href="/doctors" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
              عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {specialties.map((specialty: { id: string; nameAr: string }) => (
              <Link
                key={specialty.id}
                href={`/doctors?specialtyId=${specialty.id}`}
                className="flex flex-col items-center gap-1.5 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all shrink-0 min-w-[76px]"
              >
                <span className="text-2xl">{SPECIALTY_ICONS[specialty.nameAr] || "🏥"}</span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-slate-300 text-center leading-tight whitespace-nowrap">{specialty.nameAr}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ===== POPULAR DOCTORS ===== */}
        {doctors.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">أطباء مميزون</h2>
              <Link href="/doctors" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
                عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {doctors.map((doctor) => {
                const contactNum = doctor.whatsapp || (doctor.user as { phone?: string })?.phone || doctor.clinics?.[0]?.phone;
                const waNum = contactNum ? contactNum.replace(/\D/g, "") : "";
                const gradient = CARD_GRADIENTS[doctor.gradIdx];

                return (
                  <div key={doctor.id} className="shrink-0 w-40 sm:w-44 rounded-3xl overflow-hidden shadow-md bg-white dark:bg-slate-800 flex flex-col">
                    <div className={`relative bg-gradient-to-br ${gradient} flex-1`} style={{ minHeight: 148 }}>
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 rounded-full px-1.5 py-0.5 shadow-sm">
                        <IconStar className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[11px] font-bold text-gray-800 dark:text-slate-100">{doctor.rating.toFixed(1)}</span>
                      </div>
                      <div className="absolute top-2 left-2 z-10">
                        <FavoriteButton id={doctor.id} type="doctor" size="sm" />
                      </div>
                      <Link href={`/doctors/${doctor.id}`} className="block h-full relative">
                        <Image
                          src={doctor.avatarUrl}
                          alt={(doctor.user as { name?: string })?.name || "طبيب"}
                          fill
                          className="object-cover object-top"
                          unoptimized
                        />
                      </Link>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800">
                      <Link href={`/doctors/${doctor.id}`}>
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-xs leading-tight truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          د. {(doctor.user as { name?: string })?.name}
                        </p>
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5 truncate">
                          {(doctor.specialty as { nameAr?: string })?.nameAr}
                        </p>
                      </Link>
                      {doctor.consultationFee > 0 && (
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">₪{doctor.consultationFee}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2.5">
                        {waNum.length >= 9 ? (
                          <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                            className="flex-none flex items-center justify-center w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">
                            <IconMessage className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <div className="flex-none flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-300 dark:text-slate-600">
                            <IconMessage className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <Link href={`/doctors/${doctor.id}`}
                          className="flex-1 flex items-center justify-center py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors">
                          احجز
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== MEDICAL CENTERS ===== */}
        {centers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">المراكز الطبية</h2>
              <Link href="/medical-centers" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
                عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
            <div className="space-y-2.5">
              {centers.map((center, idx) => (
                <Link key={center.id} href={`/medical-centers/${center.id}`} className="block">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4 hover:shadow-md transition-shadow hover:border-blue-200 dark:hover:border-blue-500">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${CARD_GRADIENTS[idx % CARD_GRADIENTS.length]} flex items-center justify-center shrink-0`}>
                      <IconBuilding className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-slate-100 text-sm truncate">
                        {(center as { nameAr?: string; name: string }).nameAr || center.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <IconMapPin className="h-3 w-3 text-gray-400 dark:text-slate-500 shrink-0" />
                        <span className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                          {(center as { address?: string }).address}، {(center as { city?: string }).city}
                        </span>
                      </div>
                    </div>
                    <IconArrowLeft className="h-4 w-4 text-gray-400 dark:text-slate-500 rotate-180 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ===== CTA: Register as Doctor ===== */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white text-center">
          <div className="text-4xl mb-3">👨‍⚕️</div>
          <h3 className="font-bold text-lg mb-2">هل أنت طبيب؟</h3>
          <p className="text-blue-100 text-sm mb-4 leading-relaxed">
            انضم لمنصة طبيبي واستقبل مرضى جدد من منطقتك
          </p>
          <Link href="/register/doctor"
            className="inline-block bg-white text-blue-700 font-bold px-6 py-2.5 rounded-2xl text-sm hover:bg-blue-50 transition-colors">
            سجّل كطبيب الآن
          </Link>
        </section>

        {/* ===== CTA: Login/Register ===== */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 text-center">
          <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-1">سجّل الدخول لحجز موعد</h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">الحجز يتطلب تسجيل الدخول برقم الهاتف</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login"
              className="bg-blue-600 text-white font-medium px-5 py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors">
              تسجيل الدخول
            </Link>
            <Link href="/register"
              className="border border-blue-200 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-medium px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
              إنشاء حساب
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
