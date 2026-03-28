import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import IconUser from "@/components/icon/icon-user";
import IconMail from "@/components/icon/icon-mail";
import IconPhone from "@/components/icon/icon-phone";
import IconHeart from "@/components/icon/icon-heart";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconBuilding from "@/components/icon/icon-building";
import IconCreditCard from "@/components/icon/icon-credit-card";
import IconStar from "@/components/icon/icon-star";
import IconClock from "@/components/icon/icon-clock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLocationFullName } from "@/data/west-bank-locations";
import AdminDoctorActions from "../../admin-doctor-actions";
import ExtraClinicToggle from "./extra-clinic-toggle";

const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default async function AdminDoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const { id } = await params;

  const { data: doctor, error } = await supabaseAdmin
    .from("Doctor")
    .select(
      `
      id,
      userId,
      status,
      whatsapp,
      subscriptionPeriod,
      subscriptionEndDate,
      locationId,
      bio,
      experienceYears,
      consultationFee,
      licenseNumber,
      rating,
      totalReviews,
      visibleToPatients,
      medicalCenterId,
      canAddExtraClinics,
      createdAt,
      updatedAt,
      user:User!Doctor_userId_fkey(id, name, email, phone, createdAt),
      specialty:Specialty(id, nameAr, name),
      clinics:Clinic(id, name, address, city, phone, locationId, isMain),
      timeSlots:TimeSlot(id, dayOfWeek, startTime, endTime, isActive, clinicId)
    `
    )
    .eq("id", id)
    .single();

  if (error || !doctor) notFound();

  const u = doctor.user as { name?: string; email?: string; phone?: string; createdAt?: string } | null;
  const doctorWithWhatsapp = doctor as { whatsapp?: string | null };
  const displayPhone = u?.phone || doctorWithWhatsapp.whatsapp || null;
  const specialty = doctor.specialty as { nameAr?: string; name?: string } | null;
  const clinics = (doctor.clinics ?? []) as Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    phone?: string;
    locationId?: string | null;
    isMain: boolean;
  }>;
  const timeSlots = (doctor.timeSlots ?? []) as Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
    clinicId?: string | null;
  }>;

  const statusLabel =
    doctor.status === "APPROVED"
      ? "موافق"
      : doctor.status === "PENDING"
        ? "قيد المراجعة"
        : doctor.status === "REJECTED"
          ? "مرفوض"
          : "موقوف";

  const isCenterDoctor = Boolean((doctor as { medicalCenterId?: string | null }).medicalCenterId);
  const subscriptionLabel = isCenterDoctor
    ? "ضمن اشتراك المركز (تلقائي — يتبع تاريخ انتهاء اشتراك المركز)"
    : doctor.subscriptionPeriod
      ? doctor.subscriptionPeriod === "monthly"
        ? "شهري ₪80"
        : doctor.subscriptionPeriod === "half_year"
          ? "نصف سنة ₪400"
          : doctor.subscriptionPeriod === "yearly"
            ? "سنة ₪800"
            : "—"
      : "لا يوجد اشتراك";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard/admin/doctors"
          className="text-blue-600 text-sm font-medium flex items-center gap-1 "
        >
          <IconArrowForward className="h-4 w-4" />
          العودة لقائمة الأطباء
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تفاصيل الطبيب</h1>
          <p className="text-gray-500 mt-1">
            د. {u?.name ?? "—"} • {specialty?.nameAr ?? "—"}
          </p>
        </div>
        <Badge
          variant={
            doctor.status === "APPROVED"
              ? "success"
              : doctor.status === "PENDING"
                ? "secondary"
                : "destructive"
          }
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="space-y-6">
        {/* بيانات الحساب والاتصال */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconUser className="h-4 w-4" />
              البيانات الشخصية وطرق الاتصال
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <IconUser className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">الاسم</p>
                  <p className="font-medium text-gray-900 dir-ltr text-right">
                    {u?.name ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <IconMail className="h-5 w-5 text-gray-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                  <p className="font-medium text-gray-900 truncate dir-ltr text-right">
                    {u?.email ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <IconPhone className="h-5 w-5 text-gray-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">رقم الهاتف / واتساب</p>
                  <p className="font-medium text-gray-900 dir-ltr text-right">
                    {displayPhone ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التخصص والملف المهني */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconHeart className="h-4 w-4" />
              التخصص والملف المهني
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">التخصص</p>
                <p className="font-medium text-gray-900">{specialty?.nameAr ?? "—"}</p>
              </div>
              {doctor.locationId && (
                <div className="flex items-center gap-2">
                  <IconMapPin className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">منطقة العمل (الرئيسية)</p>
                    <p className="font-medium text-gray-900">
                      {getLocationFullName(doctor.locationId)}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">سنوات الخبرة</p>
                <p className="font-medium text-gray-900">{doctor.experienceYears ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">رسوم الاستشارة (₪)</p>
                <p className="font-medium text-gray-900">{doctor.consultationFee ?? 0}</p>
              </div>
              {doctor.licenseNumber && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">رقم الرخصة</p>
                  <p className="font-medium text-gray-900 dir-ltr text-right">
                    {doctor.licenseNumber}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <IconStar className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{doctor.rating ?? 0}</span>
                <span className="text-sm text-gray-500">({doctor.totalReviews ?? 0} تقييم)</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">الظهور للمرضى في المنصة</p>
                <p className="font-medium text-gray-900">
                  {doctor.visibleToPatients ? "نعم" : "لا"}
                </p>
              </div>
            </div>
            {doctor.bio && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">نبذة</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{doctor.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* الاشتراك والإجراءات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconCreditCard className="h-4 w-4" />
              الاشتراك والإجراءات
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">خطة الاشتراك</p>
                <p className="font-medium text-gray-900">{subscriptionLabel}</p>
              </div>
              {doctor.subscriptionEndDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">ينتهي في</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(doctor.subscriptionEndDate), "dd/MM/yyyy", { locale: ar })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">تاريخ التسجيل</p>
                <p className="font-medium text-gray-900">
                  {doctor.createdAt
                    ? format(new Date(doctor.createdAt), "dd/MM/yyyy HH:mm", { locale: ar })
                    : "—"}
                </p>
              </div>
            </div>
            <AdminDoctorActions
              doctorId={doctor.id}
              subscriptionPeriod={doctor.subscriptionPeriod ?? undefined}
              status={doctor.status}
              isPending={doctor.status === "PENDING"}
              showSubscription={doctor.status === "APPROVED"}
              medicalCenterId={(doctor as { medicalCenterId?: string | null }).medicalCenterId}
              canAddExtraClinics={Boolean((doctor as { canAddExtraClinics?: boolean }).canAddExtraClinics)}
            />
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">أطباء المركز الطبي — عيادات إضافية</p>
              <ExtraClinicToggle
                doctorId={doctor.id}
                medicalCenterId={(doctor as { medicalCenterId?: string | null }).medicalCenterId ?? null}
                canAddExtraClinics={Boolean((doctor as { canAddExtraClinics?: boolean }).canAddExtraClinics)}
              />
            </div>
          </CardContent>
        </Card>

        {/* العيادات */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconBuilding className="h-4 w-4" />
              العيادات ({clinics.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {clinics.length === 0 ? (
              <p className="text-sm text-gray-500">لم يضف الطبيب عيادات بعد.</p>
            ) : (
              <div className="space-y-4">
                {clinics.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border bg-gray-50/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.isMain && (
                        <Badge variant="secondary" className="text-xs">رئيسية</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <IconMapPin className="h-3.5 w-3.5 shrink-0" />
                      {c.address}، {c.city}
                    </p>
                    {c.locationId && (
                      <p className="text-xs text-gray-500">
                        المنطقة: {getLocationFullName(c.locationId)}
                      </p>
                    )}
                    {c.phone && (
                      <p className="text-sm text-gray-600 dir-ltr text-right">
                        <IconPhone className="h-3.5 w-3.5 inline ml-1" />
                        {c.phone}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* أوقات العمل */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <IconClock className="h-4 w-4" />
              أوقات العمل ({timeSlots.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {timeSlots.length === 0 ? (
              <p className="text-sm text-gray-500">لم يضف الطبيب أوقات عمل بعد.</p>
            ) : (
              <div className="space-y-2">
                {timeSlots
                  .filter((s) => s.isActive)
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {DAYS_AR[s.dayOfWeek] ?? `يوم ${s.dayOfWeek}`}
                      </span>
                      <span className="text-gray-600 dir-ltr">
                        {s.startTime} – {s.endTime}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
