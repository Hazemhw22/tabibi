import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import IconStar from "@/components/icon/icon-star";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconPhone from "@/components/icon/icon-phone";
import IconMessage from "@/components/icon/icon-message";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconShare from "@/components/icon/icon-share";
import BookingSection from "./booking-section";
import { auth } from "@/lib/auth";
import { doctorServesLocation, getLocationFullName } from "@/data/west-bank-locations";
import FavoriteButton from "@/components/ui/favorite-button";
import { getDoctorAvatar } from "@/lib/avatar";

async function getDoctor(id: string) {
  const { data: doctor, error } = await supabaseAdmin
    .from("Doctor")
    .select(`
      id, consultationFee, rating, experienceYears, bio, status, whatsapp, visibleToPatients, locationId, gender,
      user:User(name, phone, image),
      specialty:Specialty(nameAr),
      clinics:Clinic(id, name, address, city, phone, isMain, locationId),
      timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive, clinicId, slotCapacity)
    `)
    .eq("id", id)
    .single();

  if (error || !doctor || doctor.status !== "APPROVED" || doctor.visibleToPatients === false) return null;

  const slots = (doctor.timeSlots ?? []).filter((s: { isActive?: boolean }) => s.isActive !== false);
  slots.sort((a: { dayOfWeek: number }, b: { dayOfWeek: number }) => a.dayOfWeek - b.dayOfWeek);

  const [{ count: reviewsCount }, { count: appointmentsCount }, { data: reviews }] = await Promise.all([
    supabaseAdmin.from("Review").select("id", { count: "exact", head: true }).eq("doctorId", id),
    supabaseAdmin.from("Appointment").select("id", { count: "exact", head: true }).eq("doctorId", id),
    supabaseAdmin
      .from("Review")
      .select("id, rating, comment, patient:User(name)")
      .eq("doctorId", id)
      .order("createdAt", { ascending: false })
      .limit(5),
  ]);

  type ClinicItem = { id: string; name: string; address: string; city: string; phone?: string; isMain?: boolean; locationId?: string | null };
  type DoctorRow = { whatsapp?: string | null; gender?: string | null; user?: { name?: string; phone?: string; image?: string | null }; User?: { name?: string; phone?: string; image?: string | null }; specialty?: { nameAr?: string }; Specialty?: { nameAr?: string }; clinics?: ClinicItem[] };
  const d = doctor as DoctorRow;
  const user = d.user ?? d.User;
  const specialty = d.specialty ?? d.Specialty;
  const clinics: ClinicItem[] = d.clinics ?? [];
  const contactNumber = d.whatsapp || user?.phone || clinics?.[0]?.phone;
  type ReviewRow = { id: string; rating?: number; comment?: string | null; patient?: { name?: string }; Patient?: { name?: string } };
  const reviewsList = ((reviews ?? []) as ReviewRow[]).map((r) => ({
    id: r.id, rating: r.rating, comment: r.comment,
    patient: { name: (r.patient ?? r.Patient)?.name ?? "مريض" },
  }));

  const rawDoctor = doctor as { locationId?: string | null };
  return {
    id: doctor.id,
    locationId: rawDoctor.locationId ?? null,
    visibleToPatients: doctor.visibleToPatients !== false,
    consultationFee: doctor.consultationFee ?? 0,
    rating: doctor.rating ?? 0,
    experienceYears: doctor.experienceYears ?? 0,
    bio: doctor.bio,
    status: doctor.status,
    gender: d.gender ?? "MALE",
    contactNumber: contactNumber ?? null,
    user: { name: user?.name ?? "", image: user?.image ?? null },
    specialty: { nameAr: specialty?.nameAr ?? "" },
    clinics,
    timeSlots: slots,
    reviews: reviewsList,
    _count: { reviews: reviewsCount ?? 0, appointments: appointmentsCount ?? 0 },
  };
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [doctor, session] = await Promise.all([getDoctor(id), auth()]);

  if (!doctor) notFound();

  const doctorLocationId = doctor.locationId ?? null;
  const isGuest = !session?.user;

  let patientRegionId: string | null = null;
  if (session?.user?.role === "PATIENT" && session.user.id) {
    const { data: userRow } = await supabaseAdmin
      .from("User").select("regionId").eq("id", session.user.id).single();
    patientRegionId = (userRow as { regionId?: string | null } | null)?.regionId ?? null;
    if (patientRegionId && !doctorServesLocation(doctorLocationId, patientRegionId)) notFound();
  } else if (!isGuest) {
    if (!doctorLocationId) notFound();
  }

  if (doctor.visibleToPatients === false) {
    if (!session?.user?.id) notFound();
    const { data: clinicPatient } = await supabaseAdmin
      .from("ClinicPatient").select("id").eq("doctorId", id).eq("userId", session.user.id).maybeSingle();
    if (!clinicPatient) notFound();
  }

  const clinicsForView =
    patientRegionId && doctor.clinics?.length
      ? doctor.clinics.filter(
          (c: { locationId?: string | null }) =>
            c.locationId && doctorServesLocation(c.locationId, patientRegionId as string)
        )
      : doctor.clinics ?? [];

  const waNum = doctor.contactNumber ? doctor.contactNumber.replace(/\D/g, "") : "";
  const doctorAvatarSrc = getDoctorAvatar(
    (doctor.user as { image?: string | null }).image,
    doctor.gender
  );

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">

      {/* ===== BLUE HERO SECTION ===== */}
      <div className="relative bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 overflow-hidden pb-6">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-1/3 -translate-x-1/3" />

        {/* Header bar */}
        <div className="relative max-w-2xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
          <Link
            href="/doctors"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <IconArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <h1 className="font-bold text-white text-base">تفاصيل الطبيب</h1>
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <IconShare className="h-4 w-4 text-white" />
            </button>
            <FavoriteButton id={doctor.id} type="doctor" size="sm"
              className="!bg-white/20 !border-0 !text-white hover:!bg-white/30"
            />
          </div>
        </div>

        {/* Doctor info + photo */}
        <div className="relative max-w-2xl mx-auto px-4 pt-2 " >
          <div className="flex items-end justify-between">
            {/* RIGHT (first in RTL): Doctor photo — تأتي أولاً في RTL فتظهر على اليمين */}
            <div className="shrink-0 w-44 h-44 relative self-end">
              <Image
                src={doctorAvatarSrc}
                alt={doctor.user?.name || "طبيب"}
                fill
                className="object-contain object-bottom drop-shadow-2xl"
                unoptimized
              />
            </div>

            {/* LEFT (second in RTL): text info */}
            <div className="flex-1 pb-4 pl-3 absolute left-0">
              {/* Specialty badge */}
              <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                {doctor.specialty?.nameAr}
              </div>
              {/* Name */}
              <h2 className="text-xl font-extrabold text-white leading-tight mb-2">
                د. {doctor.user?.name}
              </h2>
              {/* Rating */}
              <div className="flex items-center gap-1.5">
                <IconStar className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                <span className="text-white font-bold text-sm">{doctor.rating.toFixed(1)}</span>
                <span className="text-white/70 text-xs">({doctor._count.reviews}+ تقييم)</span>
              </div>
              {/* Fee */}
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5">
                <span className="text-white font-bold text-sm">₪{doctor.consultationFee}</span>
                <span className="text-white/70 text-xs">/ استشارة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== STATS ROW ===== */}
      <div className="max-w-2xl mx-auto px-4 -mt-1">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 grid grid-cols-3 divide-x divide-x-reverse divide-gray-100 dark:divide-slate-700 overflow-hidden">
          <div className="text-center py-4 px-2">
            <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100">{doctor.experienceYears}+</p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">سنوات<br />الخبرة</p>
          </div>
          <div className="text-center py-4 px-2">
            <p className="text-lg font-extrabold text-gray-900 dark:text-slate-100">{doctor._count.reviews}+</p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">التقييمات</p>
          </div>
          <div className="text-center py-4 px-2">
            <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{doctor.rating.toFixed(1)}</p>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">التقييم</p>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-10 space-y-4">

        {/* About */}
        {doctor.bio && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-2 text-sm">نبذة عن الطبيب</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{doctor.bio}</p>
          </div>
        )}

        {/* Location */}
        {doctor.locationId && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
            <IconMapPin className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-sm text-gray-700 dark:text-slate-300">{getLocationFullName(doctor.locationId)}</span>
          </div>
        )}

        {/* ===== BOOKING SECTION ===== */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <BookingSection
            doctor={doctor}
            timeSlots={doctor.timeSlots ?? []}
            clinics={clinicsForView}
            isLoggedIn={!!session}
            callbackUrl={`/doctors/${id}`}
          />
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-3 text-sm">التواصل مع الطبيب</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-blue-100 dark:bg-blue-900/40 shrink-0 relative">
              <Image src={doctorAvatarSrc} alt={doctor.user?.name || "طبيب"} fill className="object-cover object-top" unoptimized />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-slate-100 text-sm">د. {doctor.user?.name}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{doctor.specialty?.nameAr}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {waNum.length >= 9 && (
                <a href={`https://wa.me/${waNum}`} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors">
                  <IconMessage className="h-4.5 w-4.5" />
                </a>
              )}
              {doctor.contactNumber && (
                <a href={`tel:${doctor.contactNumber}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors">
                  <IconPhone className="h-4.5 w-4.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        {doctor.reviews?.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-100 dark:border-slate-700 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-slate-100 mb-3 text-sm flex items-center gap-2">
              <IconStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              تقييمات المرضى ({doctor._count.reviews})
            </h3>
            <div className="space-y-3">
              {doctor.reviews.map((review: { id: string; rating?: number; comment?: string | null; patient: { name: string } }) => (
                <div key={review.id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                        {review.patient?.name?.charAt(0) || "م"}
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{review.patient?.name || "مريض"}</span>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <IconStar key={s}
                          className={`h-3 w-3 ${s <= (review.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 dark:fill-slate-600 text-gray-200 dark:text-slate-600"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
