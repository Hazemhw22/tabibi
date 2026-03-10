import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import { Star, MapPin, Clock, Phone, Calendar, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DAYS_AR } from "@/lib/utils";
import BookingSection from "./booking-section";
import { auth } from "@/lib/auth";
import { doctorServesLocation, getLocationFullName } from "@/data/west-bank-locations";

async function getDoctor(id: string) {
  const { data: doctor, error } = await supabaseAdmin
    .from("Doctor")
    .select(`
      id, consultationFee, rating, experienceYears, bio, status, whatsapp, visibleToPatients, locationId,
      user:User(name, phone),
      specialty:Specialty(nameAr),
      clinics:Clinic(id, name, address, city, phone, isMain),
      timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive)
    `)
    .eq("id", id)
    .single();

  if (error || !doctor || doctor.status !== "APPROVED") return null;

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
      .limit(10),
  ]);

  type ClinicItem = { id: string; name: string; address: string; city: string; phone?: string; isMain?: boolean };
  type DoctorRow = { whatsapp?: string | null; user?: { name?: string; phone?: string }; User?: { name?: string; phone?: string }; specialty?: { nameAr?: string }; Specialty?: { nameAr?: string }; clinics?: ClinicItem[] };
  const d = doctor as DoctorRow;
  const user = d.user ?? d.User;
  const specialty = d.specialty ?? d.Specialty;
  const clinics: ClinicItem[] = d.clinics ?? [];
  const contactNumber = d.whatsapp || user?.phone || clinics?.[0]?.phone;
  type ReviewRow = { id: string; rating?: number; comment?: string | null; patient?: { name?: string }; Patient?: { name?: string } };
  const reviewsList = ((reviews ?? []) as ReviewRow[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
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
    contactNumber: contactNumber ?? null,
    user: { name: user?.name ?? "" },
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
  if (!doctorLocationId) notFound();

  if (session?.user?.role === "PATIENT" && session.user.id) {
    const { data: userRow } = await supabaseAdmin
      .from("User")
      .select("regionId")
      .eq("id", session.user.id)
      .single();
    const patientRegionId = (userRow as { regionId?: string | null } | null)?.regionId ?? null;
    if (patientRegionId && !doctorServesLocation(doctorLocationId, patientRegionId)) notFound();
  }

  // الطبيب غير ظاهر للمرضى: فقط مرضى العيادة يمكنهم الوصول
  if (doctor.visibleToPatients === false) {
    if (!session?.user?.id) notFound();
    const { data: clinicPatient } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id")
      .eq("doctorId", id)
      .eq("userId", session.user.id)
      .maybeSingle();
    if (!clinicPatient) notFound();
  }

  type SlotItem = { id?: string; dayOfWeek: number; startTime?: string; endTime?: string; isActive?: boolean };
  const timeSlotsByDay = (doctor.timeSlots ?? []).reduce(
    (acc: Record<number, SlotItem[]>, slot: SlotItem) => {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      acc[slot.dayOfWeek].push(slot);
      return acc;
    },
    {} as Record<number, SlotItem[]>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-5xl font-bold text-blue-600 shrink-0">
                  {doctor.user?.name?.charAt(0) || "D"}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        د. {doctor.user?.name}
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default">{doctor.specialty?.nameAr}</Badge>
                        <Badge variant="success">متاح للحجز</Badge>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      {doctor.contactNumber && (
                        <a
                          href={`https://wa.me/${doctor.contactNumber.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-green-700 font-medium hover:bg-green-200 transition-colors sm:justify-end"
                        >
                          <MessageCircle className="h-5 w-5" />
                          تواصل عبر واتساب
                        </a>
                      )}
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          ₪{doctor.consultationFee}
                        </div>
                        <div className="text-xs text-gray-500">رسوم الاستشارة</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
                    <div className="flex items-center gap-2">
                      <div className="bg-yellow-50 p-1.5 rounded-lg">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {(doctor.rating ?? 0).toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {doctor._count.reviews} تقييم
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 p-1.5 rounded-lg">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {doctor.experienceYears}
                        </div>
                        <div className="text-xs text-gray-500">سنوات خبرة</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-green-50 p-1.5 rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {doctor._count.appointments}
                        </div>
                        <div className="text-xs text-gray-500">موعد منجز</div>
                      </div>
                    </div>
                    {doctor.locationId && (
                      <div className="flex items-center gap-2 col-span-2 sm:col-span-3">
                        <div className="bg-emerald-50 p-1.5 rounded-lg">
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {getLocationFullName(doctor.locationId)}
                          </div>
                          <div className="text-xs text-gray-500">منطقة العمل</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {doctor.bio && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-2">نبذة عن الطبيب</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{doctor.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {doctor.clinics?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">العيادات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {doctor.clinics.map((clinic: { id: string; name: string; address: string; city: string; phone?: string; isMain?: boolean }) => (
                  <div
                    key={clinic.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-800 text-sm">{clinic.name}</h4>
                        {clinic.isMain && (
                          <Badge variant="secondary" className="text-xs">رئيسية</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {clinic.address}، {clinic.city}
                      </p>
                      {clinic.phone && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500 dir-ltr">{clinic.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {Object.keys(timeSlotsByDay).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ساعات العمل</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {Object.entries(timeSlotsByDay).map(([day, slots]) => (
                    <div
                      key={day}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {DAYS_AR[Number(day)]}
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {(slots as { id: string; startTime: string; endTime: string }[]).map((slot) => (
                          <span
                            key={slot.id}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {slot.startTime} - {slot.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {doctor.reviews?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  تقييمات المرضى ({doctor._count.reviews})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {doctor.reviews.map((review: { id: string; rating?: number; comment?: string | null; patient: { name: string } }) => (
                  <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                          {review.patient?.name?.charAt(0) || "م"}
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {review.patient?.name || "مريض"}
                        </span>
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s <= (review.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1">
          <BookingSection
            doctor={doctor}
            timeSlots={doctor.timeSlots ?? []}
            clinics={doctor.clinics ?? []}
            isLoggedIn={!!session}
          />
        </div>
      </div>
    </div>
  );
}
