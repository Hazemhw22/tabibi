import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import IconStar from "@/components/icon/icon-star";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconClock from "@/components/icon/icon-clock";
import IconPhone from "@/components/icon/icon-phone";
import IconCalendar from "@/components/icon/icon-calendar";
import IconMessage from "@/components/icon/icon-message";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconShare from "@/components/icon/icon-share";
import IconBuilding from "@/components/icon/icon-building";
import { DAYS_AR } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { doctorIsLinkedToCenter } from "@/lib/medical-center-doctors";
import FavoriteButton from "@/components/ui/favorite-button";
import CenterDoctorBooking from "./center-doctor-booking";

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-red-500",
];

async function getCenterDoctor(centerId: string, doctorId: string) {
  const { data: center } = await supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr")
    .eq("id", centerId)
    .eq("isActive", true)
    .maybeSingle();

  if (!center) return null;

  const { data: doctor, error } = await supabaseAdmin
    .from("Doctor")
    .select(`
      id, consultationFee, patientFeeServiceType, rating, experienceYears, bio, status,
      whatsapp, visibleToPatients,
      user:User(name, phone),
      specialty:Specialty(nameAr),
      timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive, clinicId, slotCapacity)
    `)
    .eq("id", doctorId)
    .eq("status", "APPROVED")
    .single();

  if (error || !doctor) return null;
  if (!(await doctorIsLinkedToCenter(doctorId, centerId))) return null;

  const slots = (doctor.timeSlots ?? []).filter((s: { isActive?: boolean }) => s.isActive !== false);
  slots.sort((a: { dayOfWeek: number }, b: { dayOfWeek: number }) => a.dayOfWeek - b.dayOfWeek);

  const [{ count: reviewsCount }, { count: appointmentsCount }, { data: reviews }] = await Promise.all([
    supabaseAdmin.from("Review").select("id", { count: "exact", head: true }).eq("doctorId", doctorId),
    supabaseAdmin.from("Appointment").select("id", { count: "exact", head: true }).eq("doctorId", doctorId),
    supabaseAdmin
      .from("Review")
      .select("id, rating, comment, patient:User(name)")
      .eq("doctorId", doctorId)
      .order("createdAt", { ascending: false })
      .limit(6),
  ]);

  type DoctorRow = { whatsapp?: string | null; user?: { name?: string; phone?: string } | { name?: string; phone?: string }[]; specialty?: { nameAr?: string } | { nameAr?: string }[] };
  const d = doctor as DoctorRow;
  const user = Array.isArray(d.user) ? d.user[0] : d.user;
  const specialty = Array.isArray(d.specialty) ? d.specialty[0] : d.specialty;
  const contactNumber = d.whatsapp || user?.phone;

  type ReviewRow = { id: string; rating?: number; comment?: string | null; patient?: { name?: string } };
  const reviewsList = ((reviews ?? []) as ReviewRow[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    patient: { name: r.patient?.name ?? "مريض" },
  }));

  const feeType = (doctor as { patientFeeServiceType?: string }).patientFeeServiceType === "EXAMINATION" ? "EXAMINATION" : "CONSULTATION";

  return {
    center: {
      id: centerId,
      name: (center as { nameAr?: string; name: string }).nameAr || center.name,
    },
    doctor: {
      id: doctor.id,
      consultationFee: doctor.consultationFee ?? 0,
      feeServiceType: feeType,
      rating: doctor.rating ?? 0,
      experienceYears: doctor.experienceYears ?? 0,
      bio: doctor.bio,
      contactNumber: contactNumber ?? null,
      user: { name: user?.name ?? "" },
      specialty: { nameAr: specialty?.nameAr ?? "" },
      timeSlots: slots,
      reviews: reviewsList,
      _count: { reviews: reviewsCount ?? 0, appointments: appointmentsCount ?? 0 },
    },
  };
}

export default async function CenterDoctorPage({
  params,
}: {
  params: Promise<{ id: string; doctorId: string }>;
}) {
  const { id: centerId, doctorId } = await params;
  const [result, session] = await Promise.all([
    getCenterDoctor(centerId, doctorId),
    auth(),
  ]);

  if (!result) notFound();

  const { center, doctor } = result;

  const colorIdx = parseInt(doctorId.replace(/[^0-9]/g, "0").slice(-1) || "0", 10) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIdx];
  const initial = doctor.user?.name?.charAt(0) || "د";
  const waNum = doctor.contactNumber ? doctor.contactNumber.replace(/\D/g, "") : "";

  type SlotItem = { id?: string; dayOfWeek: number; startTime?: string; endTime?: string; clinicId?: string | null };
  const slotsByDay = (doctor.timeSlots ?? []).reduce(
    (acc: Record<number, SlotItem[]>, slot: SlotItem) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      acc[slot.dayOfWeek].push(slot);
      return acc;
    },
    {} as Record<number, SlotItem[]>
  );

  const isLoggedIn = !!session?.user;
  const isPatient = session?.user?.role === "PATIENT";

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/medical-centers/${centerId}`}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
          >
            <IconArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="flex-1 text-center font-bold text-gray-900 text-base">تفاصيل الطبيب</h1>
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <IconShare className="h-4 w-4 text-gray-700" />
            </button>
            <FavoriteButton id={doctorId} type="doctor" size="sm" />
          </div>
        </div>
      </div>

      {/* Center Badge */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <Link
          href={`/medical-centers/${centerId}`}
          className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-xl px-3 py-2 text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          <IconBuilding className="h-3.5 w-3.5" />
          {center.name}
        </Link>
      </div>

      {/* Doctor Hero Card */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          <div className={`h-28 bg-gradient-to-br ${avatarColor} relative`}>
            <div className="absolute inset-0 bg-black/10" />
          </div>
          <div className="px-5 pb-5">
            <div className="flex justify-center -mt-12 mb-4">
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 border-white`}>
                {initial}
              </div>
            </div>

            <div className="flex justify-center mb-2">
              <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full">
                {doctor.specialty?.nameAr}
              </span>
            </div>

            <h2 className="text-center text-xl font-bold text-gray-900 mb-1">
              د. {doctor.user?.name}
            </h2>

            <div className="flex justify-center items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <IconStar
                  key={s}
                  className={`h-4 w-4 ${s <= Math.round(doctor.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`}
                />
              ))}
              <span className="text-sm text-gray-500 mr-1">{doctor.rating.toFixed(1)}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-gray-50 rounded-2xl p-3">
              <div className="text-center">
                <div className="text-base font-bold text-gray-900">{doctor._count.appointments}+</div>
                <div className="text-[10px] text-gray-500 mt-0.5">مريض</div>
              </div>
              <div className="text-center border-r border-gray-200">
                <div className="text-base font-bold text-gray-900">{doctor.experienceYears}+</div>
                <div className="text-[10px] text-gray-500 mt-0.5">سنوات</div>
              </div>
              <div className="text-center border-r border-gray-200">
                <div className="text-base font-bold text-gray-900">{doctor.rating.toFixed(1)}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">تقييم</div>
              </div>
              <div className="text-center border-r border-gray-200">
                <div className="text-base font-bold text-gray-900">{doctor._count.reviews}+</div>
                <div className="text-[10px] text-gray-500 mt-0.5">تعليق</div>
              </div>
            </div>

            <div className="flex items-center justify-center mt-2">
              <span className="text-2xl font-bold text-green-600">₪{doctor.consultationFee}</span>
              <span className="text-xs text-gray-400 mr-1.5">
                {doctor.feeServiceType === "EXAMINATION" ? "كشفية" : "استشارة طبية"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* About */}
        {doctor.bio && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">نبذة عن الطبيب</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{doctor.bio}</p>
          </div>
        )}

        {/* Working Hours */}
        {Object.keys(slotsByDay).length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <IconClock className="h-4 w-4 text-blue-600" />
              ساعات العمل
            </h3>
            <div className="space-y-2">
              {Object.entries(slotsByDay).map(([day, slots]) => {
                const arr = slots as { startTime: string; endTime: string }[];
                const minStart = arr.reduce((m, s) => (s.startTime < m ? s.startTime : m), arr[0]?.startTime ?? "23:59");
                const maxEnd = arr.reduce((m, s) => (s.endTime > m ? s.endTime : m), arr[0]?.endTime ?? "00:00");
                return (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-700">{DAYS_AR[Number(day)]}</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                      {minStart} — {maxEnd}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">التواصل مع الطبيب</h3>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-xl font-bold text-white shadow-sm shrink-0`}>
              {initial}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">د. {doctor.user?.name}</p>
              <p className="text-xs text-gray-500">{doctor.specialty?.nameAr}</p>
            </div>
            <div className="flex items-center gap-2">
              {waNum.length >= 9 && (
                <a
                  href={`https://wa.me/${waNum}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                >
                  <IconMessage className="h-5 w-5" />
                </a>
              )}
              {doctor.contactNumber && (
                <a
                  href={`tel:${doctor.contactNumber}`}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                >
                  <IconPhone className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Booking Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <IconCalendar className="h-5 w-5 text-blue-600" />
              احجز موعدك
            </h3>
          </div>
          <div className="p-5">
            <CenterDoctorBooking
              centerId={centerId}
              doctor={{
                id: doctor.id,
                consultationFee: doctor.consultationFee,
                feeServiceType: doctor.feeServiceType as "CONSULTATION" | "EXAMINATION",
                name: doctor.user?.name ?? "",
                specialtyAr: doctor.specialty?.nameAr ?? "",
                slots: doctor.timeSlots ?? [],
              }}
              isLoggedIn={isLoggedIn}
              isPatient={isPatient}
            />
          </div>
        </div>

        {/* Reviews */}
        {doctor.reviews?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <IconStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              تقييمات المرضى ({doctor._count.reviews})
            </h3>
            <div className="space-y-3">
              {doctor.reviews.map((review: { id: string; rating?: number; comment?: string | null; patient: { name: string } }) => (
                <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                        {review.patient?.name?.charAt(0) || "م"}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{review.patient?.name || "مريض"}</span>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <IconStar
                          key={s}
                          className={`h-3 w-3 ${s <= (review.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>
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
