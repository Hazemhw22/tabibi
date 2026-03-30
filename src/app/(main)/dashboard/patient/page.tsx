import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { getDoctorAvatar } from "@/lib/avatar";
import IconCalendar from "@/components/icon/icon-calendar";
import IconClock from "@/components/icon/icon-clock";
import IconCircleCheck from "@/components/icon/icon-circle-check";
import IconXCircle from "@/components/icon/icon-x-circle";
import IconInfoCircle from "@/components/icon/icon-info-circle";
import IconStar from "@/components/icon/icon-star";
import IconSearch from "@/components/icon/icon-search";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconCashBanknotes from "@/components/icon/icon-cash-banknotes";
import IconCreditCard from "@/components/icon/icon-credit-card";
import IconReceipt from "@/components/icon/icon-receipt";
import IconMessage from "@/components/icon/icon-message";
import IconEye from "@/components/icon/icon-eye";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import PatientRegionSelect from "@/components/patient/patient-region-select";
import { doctorServesLocation, getLocationById, getLocationFullName } from "@/data/west-bank-locations";
import { isDentalSpecialtyNameAr, isHairSpecialtyNameAr, isSkinSpecialtyNameAr } from "@/lib/marketplace-specialties";

const STATUS_CONFIG = {
  DRAFT: { label: "بانتظار الموافقة", variant: "secondary" as const, icon: IconInfoCircle, color: "text-gray-500" },
  CONFIRMED: { label: "مؤكد", variant: "default" as const, icon: IconCircleCheck, color: "text-blue-500" },
  COMPLETED: { label: "منجز", variant: "success" as const, icon: IconCircleCheck, color: "text-green-500" },
  CANCELLED: { label: "ملغي", variant: "destructive" as const, icon: IconXCircle, color: "text-red-500" },
  NO_SHOW: { label: "لم يحضر", variant: "secondary" as const, icon: IconInfoCircle, color: "text-yellow-500" },
};

const SPECIALTY_ICONS: Record<string, string> = {
  "طب عام": "🩺", "طب أسنان": "🦷", "طب أطفال": "👶", "طب قلب": "❤️",
  "طب جلدية": "🌿", "جراحة عظام": "🦴", "نسائية وتوليد": "🌸",
  "طب أعصاب": "🧠", "طب عيون": "👁️", "أنف وأذن وحنجرة": "👂",
};

const SCROLL_GRADIENTS = [
  "from-blue-500 to-indigo-600", "from-teal-500 to-cyan-600",
  "from-violet-500 to-purple-600", "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600", "from-emerald-500 to-green-600",
];

export default async function PatientDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const { data: userRow } = await supabaseAdmin
    .from("User")
    .select("regionId, image, name, gender")
    .eq("id", session.user.id)
    .single();
  const patientRow = userRow as {
    regionId?: string | null;
    image?: string | null;
    name?: string | null;
    gender?: string | null;
  } | null;
  const patientRegionId = patientRow?.regionId ?? null;
  const sessionUser = session.user as { image?: string | null };
  const patientImage = patientRow?.image ?? sessionUser.image ?? null;
  const patientDisplayName = patientRow?.name?.trim() || session.user.name?.trim() || "مريض";
  const patientInitial = [...patientDisplayName][0] ?? "م";

  const { data: appointments } = await supabaseAdmin
    .from("Appointment")
    .select(`
      id, appointmentDate, startTime, endTime, status, fee, paymentStatus,
      doctor:Doctor(rating, gender, user:User!Doctor_userId_fkey(name, image), Specialty(nameAr)),
      clinic:Clinic(name),
      Review(id)
    `)
    .eq("patientId", session.user.id)
    .order("appointmentDate", { ascending: false });

  const { data: platformTxRes } = await supabaseAdmin
    .from("PlatformPatientTransaction")
    .select(`id, type, description, amount, date, doctor:Doctor(user:User!Doctor_userId_fkey(name))`)
    .eq("patientId", session.user.id)
    .order("date", { ascending: false });

  const { data: clinicPatients } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("userId", session.user.id);

  let clinicTxList: Array<{
    id: string; type: string; description: string; amount: number; date: string;
    clinicPatient?: { name?: string; doctor?: { User?: { name?: string }; user?: { name?: string } } };
  }> | null = null;

  const cpIds = (clinicPatients ?? []).map((p: { id: string }) => p.id);
  if (cpIds.length > 0) {
    const { data: clinicTxData } = await supabaseAdmin
      .from("ClinicTransaction")
      .select(`id, type, description, amount, date, clinicPatient:ClinicPatient(name, doctor:Doctor(user:User!Doctor_userId_fkey(name)))`)
      .in("clinicPatientId", cpIds)
      .order("date", { ascending: false });
    clinicTxList = clinicTxData as typeof clinicTxList;
  }

  type PatientTxRow = {
    id: string; date: string; type: string; description: string;
    amount: number; doctorName: string; source: "منصة" | "عيادة";
  };

  const platformTxList = (platformTxRes ?? []) as Array<{
    id: string; type: string; description: string; amount: number; date: string;
    doctor?: { User?: { name?: string }; user?: { name?: string } };
  }>;

  const txRows: PatientTxRow[] = [
    ...platformTxList.map((t) => ({
      id: t.id, date: t.date, type: t.type, description: t.description,
      amount: t.amount,
      doctorName: t.doctor?.User?.name ?? t.doctor?.user?.name ?? "—",
      source: "منصة" as const,
    })),
    ...((clinicTxList ?? []) as Array<{
      id: string; type: string; description: string; amount: number; date: string;
      clinicPatient?: { name?: string; doctor?: { User?: { name?: string }; user?: { name?: string } } };
    }>).map((t) => ({
      id: t.id, date: t.date, type: t.type, description: t.description,
      amount: t.amount,
      doctorName:
        (t.clinicPatient as { doctor?: { User?: { name?: string }; user?: { name?: string } } })?.doctor?.User?.name ??
        (t.clinicPatient as { doctor?: { User?: { name?: string }; user?: { name?: string } } })?.doctor?.user?.name ??
        "—",
      source: "عيادة" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const { data: doctorsData } = await supabaseAdmin
    .from("Doctor")
    .select(`id, consultationFee, rating, createdAt, whatsapp, locationId, gender,
       user:User!Doctor_userId_fkey(name, phone, image), specialty:Specialty(nameAr),
       clinics:Clinic(address, phone), reviews:Review(id)`)
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true);

  const allDoctors = (doctorsData ?? []) as Array<{
    id: string; consultationFee?: number | null; rating?: number | null;
    createdAt?: string | null; whatsapp?: string | null; locationId?: string | null;
    gender?: string | null; user?: { name?: string | null; image?: string | null };
    specialty?: { nameAr?: string | null };
    clinics?: { address?: string | null; phone?: string | null }[];
    reviews?: { id: string }[];
  }>;

  const doctors = patientRegionId
    ? allDoctors.filter((d) => doctorServesLocation(d.locationId ?? null, patientRegionId))
    : allDoctors;

  const topRatedDoctors = [...doctors].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10);
  const suggestedDoctors = [...doctors]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 10);

  const { data: specialtiesData } = await supabaseAdmin.from("Specialty").select("id, nameAr, icon").limit(8);
  const specialties = (specialtiesData ?? []) as Array<{ id: string; nameAr: string }>;

  type PublicOffer = {
    id: string;
    title: string;
    imageUrl: string;
    price: number;
    doctor?: {
      id?: string;
      locationId?: string | null;
      whatsapp?: string | null;
      user?: { name?: string | null; phone?: string | null };
      specialty?: { nameAr?: string | null };
    } | null;
  };

  type PublicProduct = {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    doctor?: {
      id?: string;
      locationId?: string | null;
      user?: { name?: string | null };
      specialty?: { nameAr?: string | null };
    } | null;
  };

  let publicOffers: PublicOffer[] = [];
  let publicProducts: PublicProduct[] = [];

  try {
    const { data: offerRows } = await supabaseAdmin
      .from("DoctorOffer")
      .select(
        `
        id, title, imageUrl, price, isActive,
        doctor:Doctor(
          id, locationId, whatsapp, status, visibleToPatients,
          user:User!Doctor_userId_fkey(name, phone),
          specialty:Specialty(nameAr)
        )
      `,
      )
      .eq("isActive", true)
      .order("createdAt", { ascending: false })
      .limit(120);

    publicOffers = (offerRows ?? [])
      .map((r) => r as PublicOffer & { doctor?: PublicOffer["doctor"] & { status?: string; visibleToPatients?: boolean } })
      .filter((o) => o.doctor?.status === "APPROVED" && o.doctor?.visibleToPatients !== false)
      .filter((o) => {
        const sp = o.doctor?.specialty?.nameAr ?? "";
        return isDentalSpecialtyNameAr(sp) || isHairSpecialtyNameAr(sp) || isSkinSpecialtyNameAr(sp);
      })
      .slice(0, 24);
  } catch {
    publicOffers = [];
  }

  try {
    const { data: productRows } = await supabaseAdmin
      .from("DoctorProduct")
      .select(
        `
        id, name, imageUrl, price, isActive,
        doctor:Doctor(
          id, locationId, status, visibleToPatients,
          user:User!Doctor_userId_fkey(name),
          specialty:Specialty(nameAr)
        )
      `,
      )
      .eq("isActive", true)
      .order("createdAt", { ascending: false })
      .limit(120);

    publicProducts = (productRows ?? [])
      .map((r) => r as PublicProduct & { doctor?: PublicProduct["doctor"] & { status?: string; visibleToPatients?: boolean } })
      .filter((p) => p.doctor?.status === "APPROVED" && p.doctor?.visibleToPatients !== false)
      .filter((p) => {
        const sp = p.doctor?.specialty?.nameAr ?? "";
        return isHairSpecialtyNameAr(sp) || isSkinSpecialtyNameAr(sp);
      })
      .slice(0, 24);
  } catch {
    publicProducts = [];
  }

  const list = appointments ?? [];
  const statsMap = list.reduce((acc: Record<string, number>, a: { status: string }) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const upcoming = list.filter(
    (a: { status: string; appointmentDate: string }) =>
      ["CONFIRMED", "DRAFT"].includes(a.status) && new Date(a.appointmentDate) >= new Date()
  );

  const totalPaidFromManual = txRows
    .filter((t) => t.type === "PAYMENT")
    .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0);
  const totalServices = txRows
    .filter((t) => t.type === "SERVICE")
    .reduce((sum, t) => sum + Math.abs(t.amount ?? 0), 0);
  const totalDebts = Math.max(0, totalServices - totalPaidFromManual);
  const latestAppointments = list.slice(0, 5);
  const nextAppointment = (upcoming[0] ?? null) as Record<string, unknown> | null;

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">

      {/* ===== HEADER ===== */}
      <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-5 shadow-sm dark:shadow-slate-900/50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 ring-2 ring-slate-100 dark:ring-slate-600">
                {patientImage ? (
                  <Image src={patientImage} alt="" fill className="object-cover" unoptimized sizes="56px" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                    {patientInitial}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 dark:text-slate-500">مرحباً 👋</p>
                <h1 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight truncate">{patientDisplayName}</h1>
              </div>
            </div>
            <Link
              href="/dashboard/patient/appointments"
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <IconCalendar className="h-5 w-5 text-gray-600 dark:text-slate-300" />
              {upcoming.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                  {upcoming.length}
                </span>
              )}
            </Link>
          </div>

          <Link href="/doctors" className="block">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
              <IconSearch className="h-4 w-4 text-gray-400 dark:text-slate-500 shrink-0" />
              <span className="text-gray-400 dark:text-slate-500 text-sm">ابحث عن الطبيب المناسب لك...</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6 pb-24">

        {/* ===== LOCATION PROMPT ===== */}
        {!patientRegionId && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">📍</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm mb-0.5">حدد موقعك</p>
                <p className="text-amber-700 dark:text-amber-400 text-xs mb-3">لعرض الأطباء القريبين منك</p>
                <PatientRegionSelect />
              </div>
            </div>
          </div>
        )}

        {patientRegionId && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-slate-700 shadow-sm">
            <IconMapPin className="h-4 w-4 text-blue-500 shrink-0" />
            <span>عرض الأطباء في: <span className="font-semibold text-gray-900 dark:text-slate-100">{getLocationById(patientRegionId)?.nameAr ?? patientRegionId}</span></span>
            <Link href="/dashboard/patient/settings" className="mr-auto text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">تعديل</Link>
          </div>
        )}

        {/* ===== QUICK STATS ===== */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "مواعيد قادمة", value: upcoming.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", emoji: "📅" },
            { label: "تم إنجازها", value: statsMap["COMPLETED"] || 0, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/40", emoji: "✅" },
            { label: "ديون", value: `₪${totalDebts.toFixed(0)}`, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40", emoji: "💰" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <div className="text-xl mb-0.5">{s.emoji}</div>
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ===== NEXT APPOINTMENT ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">المواعيد القادمة</h2>
            <Link href="/dashboard/patient/appointments" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
              عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          </div>

          {nextAppointment ? (() => {
            const d = nextAppointment.doctor as {
              rating?: number;
              gender?: string | null;
              User?: { name?: string; image?: string | null };
              user?: { name?: string; image?: string | null };
              Specialty?: { nameAr?: string };
              specialty?: { nameAr?: string };
            } | undefined;
            const docName = d?.User?.name ?? d?.user?.name ?? "";
            const docSpecialty = d?.Specialty?.nameAr ?? d?.specialty?.nameAr ?? "";
            const docRating = typeof d?.rating === "number" ? d.rating : null;
            const docImage = getDoctorAvatar(d?.User?.image ?? d?.user?.image ?? null, d?.gender ?? null);
            const config = STATUS_CONFIG[nextAppointment.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
            const aptDate = new Date(nextAppointment.appointmentDate as string);

            return (
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden">
                {/* Top: info + photo */}
                <div className="p-4 pb-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Rating */}
                    {docRating !== null && (
                      <div className="flex items-center gap-1 mb-2">
                        <IconStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{docRating.toFixed(1)}</span>
                      </div>
                    )}
                    {/* Name */}
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-slate-100 leading-tight mb-1">
                      د. {docName}
                    </h3>
                    {/* Specialty */}
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400">
                      <IconMapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-sm">{docSpecialty}</span>
                    </div>
                    {/* Status badge */}
                    <div className="mt-2">
                      <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
                    </div>
                  </div>
                  {/* Doctor photo */}
                  <div className="shrink-0 w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/50 dark:to-indigo-900/50 relative">
                    <Image
                      src={docImage}
                      alt={docName}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                  </div>
                </div>

                {/* Bottom: date/time + actions */}
                <div className="bg-blue-600 dark:bg-blue-700 mx-3 mb-3 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-white/90 text-xs">
                        <IconCalendar className="h-3.5 w-3.5 text-white" />
                        <span>{format(aptDate, "d MMM yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-white/90 text-xs">
                        <IconClock className="h-3.5 w-3.5 text-white" />
                        <span>{String(nextAppointment.startTime)}{nextAppointment.endTime ? ` — ${String(nextAppointment.endTime)}` : ""}</span>
                      </div>
                    </div>
                    <Link
                      href={`/appointments/${String(nextAppointment.id)}/success`}
                      className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
                    >
                      <IconArrowLeft className="h-4 w-4 text-white rotate-180" />
                    </Link>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 px-3 pb-4">
                  {nextAppointment.status === "CONFIRMED" && (
                    <div className="flex-1">
                      <CancelAppointmentButton
                        appointmentId={String(nextAppointment.id)}
                        appointmentDate={String(nextAppointment.appointmentDate)}
                        startTime={String(nextAppointment.startTime)}
                      />
                    </div>
                  )}
                  <Link
                    href={`/appointments/${String(nextAppointment.id)}/success`}
                    className="flex-1 py-2.5 rounded-2xl bg-blue-600 dark:bg-blue-500 text-white text-sm font-semibold text-center hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    التفاصيل
                  </Link>
                </div>
              </div>
            );
          })() : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-600 p-6 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-3">لا توجد مواعيد قادمة</p>
              <Link href="/doctors" className="inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                احجز موعدك الأول
              </Link>
            </div>
          )}
        </section>

        {/* ===== DOCTOR SPECIALTIES ===== */}
        {specialties.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">التخصصات</h2>
              <Link href="/doctors" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
                عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {specialties.map((s) => (
                <Link
                  key={s.id}
                  href={`/doctors?specialtyId=${s.id}`}
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 shrink-0 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="text-lg">{SPECIALTY_ICONS[s.nameAr] || "🏥"}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">{s.nameAr}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {publicOffers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">عروضات الأطباء</h2>
              <span className="text-[11px] text-gray-500">طلب عبر واتساب</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {publicOffers.map((o) => {
                const docName = o.doctor?.user?.name ?? "—";
                const region = o.doctor?.locationId ? getLocationFullName(o.doctor.locationId) : "—";
                const contactRaw = o.doctor?.whatsapp || o.doctor?.user?.phone || "";
                const wa = contactRaw.replace(/\D/g, "");
                const msg = encodeURIComponent(
                  `مرحباً د. ${docName}، أرغب بالاستفسار عن عرضكم: ${o.title} (السعر ₪${Number(o.price ?? 0).toFixed(0)})`,
                );
                const waHref = wa.length >= 9 ? `https://wa.me/${wa}?text=${msg}` : "";
                return (
                  <div
                    key={o.id}
                    className="snap-start shrink-0 w-44 sm:w-52 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex flex-col"
                  >
                    <div className="relative h-36 bg-gray-100">
                      <Image src={o.imageUrl} alt={o.title} fill className="object-cover" unoptimized />
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-slate-100 line-clamp-2">{o.title}</p>
                      <p className="text-[11px] text-gray-600 dark:text-slate-300 truncate">د. {docName}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 min-h-[2.25rem]">
                        <IconMapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">{region}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">₪{Number(o.price ?? 0).toFixed(0)}</span>
                        {waHref ? (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-green-600 text-white text-[10px] font-bold py-2 rounded-xl hover:bg-green-700 transition-colors"
                          >
                            واتساب
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-400 flex-1 text-center">لا يوجد واتساب</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {publicProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">منتجات (شعر/بشرة)</h2>
              <span className="text-[11px] text-gray-500">دفع عند الاستلام</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {publicProducts.map((p) => {
                const docName = p.doctor?.user?.name ?? "—";
                const region = p.doctor?.locationId ? getLocationFullName(p.doctor.locationId) : "—";
                return (
                  <div
                    key={p.id}
                    className="snap-start shrink-0 w-44 sm:w-52 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex flex-col"
                  >
                    <div className="relative h-36 bg-gray-100">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-slate-100 line-clamp-2">{p.name}</p>
                      <p className="text-[11px] text-gray-600 dark:text-slate-300 truncate">د. {docName}</p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 min-h-[2.25rem]">
                        <IconMapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">{region}</span>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">₪{Number(p.price ?? 0).toFixed(0)}</span>
                        <Link
                          href={`/dashboard/patient/checkout/product/${p.id}`}
                          className="flex-1 text-center bg-blue-600 text-white text-[10px] font-bold py-2 rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          طلب
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===== POPULAR DOCTORS ===== */}
        {topRatedDoctors.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">أطباء مميزون</h2>
              <Link href="/doctors" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
                عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {topRatedDoctors.map((doctor, idx) => {
                const gradient = SCROLL_GRADIENTS[idx % SCROLL_GRADIENTS.length];
                const avatarSrc = getDoctorAvatar(doctor.user?.image, doctor.gender);
                const waNum = doctor.whatsapp ? doctor.whatsapp.replace(/\D/g, "") : "";
                return (
                  <div key={doctor.id} className="snap-start shrink-0 w-40 sm:w-44 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800 flex flex-col border border-gray-100 dark:border-slate-700">
                    <div className={`relative bg-gradient-to-br ${gradient} overflow-hidden`} style={{ height: 150 }}>
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 rounded-full px-1.5 py-0.5 shadow-sm">
                        <IconStar className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[11px] font-bold text-gray-800 dark:text-slate-100">{(doctor.rating ?? 0).toFixed(1)}</span>
                      </div>
                      <Link href={`/doctors/${doctor.id}`} className="block h-full relative">
                        <Image src={avatarSrc} alt={doctor.user?.name || "طبيب"} fill className="object-cover object-top" unoptimized />
                      </Link>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <Link href={`/doctors/${doctor.id}`}>
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-xs leading-tight truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          د. {doctor.user?.name}
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5 truncate">{doctor.specialty?.nameAr}</p>
                      </Link>
                      {doctor.consultationFee != null && (
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1.5">₪{doctor.consultationFee}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        {waNum.length >= 9 && (
                          <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors shrink-0">
                            <IconMessage className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Link href={`/doctors/${doctor.id}`}
                          className="flex-1 text-center bg-blue-600 text-white text-[10px] font-bold py-2 rounded-xl hover:bg-blue-700 transition-colors">
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

        {/* ===== SUGGESTED DOCTORS ===== */}
        {suggestedDoctors.length > 0 && suggestedDoctors !== topRatedDoctors && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">أطباء مقترحون</h2>
              <Link href="/doctors" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
                عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
              {suggestedDoctors.map((doctor, idx) => {
                const gradient = SCROLL_GRADIENTS[(idx + 2) % SCROLL_GRADIENTS.length];
                const avatarSrc = getDoctorAvatar(doctor.user?.image, doctor.gender);
                const waNum = doctor.whatsapp ? doctor.whatsapp.replace(/\D/g, "") : "";
                return (
                  <div key={doctor.id} className="snap-start shrink-0 w-40 sm:w-44 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-slate-800 flex flex-col border border-gray-100 dark:border-slate-700">
                    <div className={`relative bg-gradient-to-br ${gradient} overflow-hidden`} style={{ height: 150 }}>
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 rounded-full px-1.5 py-0.5 shadow-sm">
                        <IconStar className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[11px] font-bold text-gray-800 dark:text-slate-100">{(doctor.rating ?? 0).toFixed(1)}</span>
                      </div>
                      <Link href={`/doctors/${doctor.id}`} className="block h-full relative">
                        <Image src={avatarSrc} alt={doctor.user?.name || "طبيب"} fill className="object-cover object-top" unoptimized />
                      </Link>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <Link href={`/doctors/${doctor.id}`}>
                        <p className="font-bold text-gray-900 dark:text-slate-100 text-xs leading-tight truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          د. {doctor.user?.name}
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5 truncate">{doctor.specialty?.nameAr}</p>
                      </Link>
                      {doctor.consultationFee != null && (
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-1.5">₪{doctor.consultationFee}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-2">
                        {waNum.length >= 9 && (
                          <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors shrink-0">
                            <IconMessage className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Link href={`/doctors/${doctor.id}`}
                          className="flex-1 text-center bg-blue-600 text-white text-[10px] font-bold py-2 rounded-xl hover:bg-blue-700 transition-colors">
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

        {/* ===== APPOINTMENTS TABLE ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">آخر المواعيد</h2>
            <Link href="/dashboard/patient/appointments" className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center gap-1">
              عرض الكل <IconArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            {latestAppointments.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-gray-500 dark:text-slate-400 text-sm">لا توجد مواعيد بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {latestAppointments.map((apt: Record<string, unknown>) => {
                  const config = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
                  const doctor = apt.doctor as { User?: { name?: string }; Specialty?: { nameAr?: string }; user?: { name?: string }; specialty?: { nameAr?: string } } | undefined;
                  const review = apt.Review as { id?: string }[] | { id?: string } | null | undefined;
                  const hasReview = review && (Array.isArray(review) ? review.length > 0 : !!review.id);
                  return (
                    <div key={apt.id as string} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-base font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        {(doctor?.User?.name ?? doctor?.user?.name)?.charAt(0) || "د"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm truncate">
                          د. {doctor?.User?.name ?? doctor?.user?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <IconCalendar className="h-3 w-3" />
                            {format(new Date(apt.appointmentDate as string), "dd/MM")}
                          </span>
                          <span className="flex items-center gap-1">
                            <IconClock className="h-3 w-3" />
                            {String(apt.startTime)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>
                        <Link
                          href={`/appointments/${apt.id as string}/success`}
                          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          <IconEye className="h-3.5 w-3.5 text-gray-500 dark:text-slate-400" />
                        </Link>
                        {apt.status === "CONFIRMED" && (
                          <CancelAppointmentButton
                            appointmentId={apt.id as string}
                            appointmentDate={apt.appointmentDate as string}
                            startTime={String(apt.startTime)}
                            iconOnly
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== FINANCIAL TRANSACTIONS ===== */}
        {txRows.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">الدفعات والديون</h2>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-100 dark:divide-slate-700 border-b border-gray-100 dark:border-slate-700">
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">مجموع الدفعات</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">₪{totalPaidFromManual.toFixed(0)}</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">مجموع الديون</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">₪{totalDebts.toFixed(0)}</p>
                </div>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {txRows.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === "PAYMENT" ? "bg-green-100 dark:bg-green-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                      {tx.type === "PAYMENT" ? <IconCreditCard className="h-4 w-4 text-green-600 dark:text-green-400" /> : <IconCashBanknotes className="h-4 w-4 text-red-500 dark:text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{tx.description || (tx.type === "PAYMENT" ? "دفعة" : "خدمة")}</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">{tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${tx.type === "PAYMENT" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.type === "PAYMENT" ? "+" : "-"}₪{Math.abs(Number(tx.amount))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
