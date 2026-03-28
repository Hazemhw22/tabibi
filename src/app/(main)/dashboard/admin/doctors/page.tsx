import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import Link from "next/link";
import IconHeart from "@/components/icon/icon-heart";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminDoctorActions from "../admin-doctor-actions";

function formatSubscriptionLabel(d: { medicalCenterId?: string | null; subscriptionPeriod?: string | null }) {
  if (d.medicalCenterId) {
    return "ضمن اشتراك المركز (تلقائي)";
  }
  if (d.subscriptionPeriod === "monthly") return "شهري ₪80";
  if (d.subscriptionPeriod === "half_year") return "نصف سنة ₪400";
  if (d.subscriptionPeriod === "yearly") return "سنة ₪800";
  return "لا يوجد";
}

export default async function AdminDoctorsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const { data: doctors } = await supabaseAdmin
    .from("Doctor")
    .select(
      "id, userId, status, subscriptionPeriod, subscriptionEndDate, medicalCenterId, canAddExtraClinics, createdAt, user:User!Doctor_userId_fkey(name, email), specialty:Specialty(nameAr)"
    )
    .order("createdAt", { ascending: false });

  const list = doctors ?? [];
  const pending = list.filter((d: { status: string }) => d.status === "PENDING");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأطباء</h1>
          <p className="text-gray-500">
            إدارة حسابات الأطباء والاشتراكات. أطباء المركز: اشتراك تلقائي مع المركز؛ زر «إضافة عيادات» فقط
            (500 ₪/سنة).
          </p>
        </div>
        <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <IconArrowForward className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      {pending.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-base">بانتظار الموافقة ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {pending.map((d: Record<string, unknown>, idx: number) => (
                <div key={d.id as string} className="flex items-center justify-between p-3 bg-white rounded-lg border gap-3">
                  <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-800 tabular-nums">
                    {idx + 1}
                  </span>
                  <Link href={`/dashboard/admin/doctors/${d.id}`} className="hover:opacity-90 min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{(d.user as { name?: string })?.name ?? "—"}</p>
                    <p className="text-sm text-gray-500">{(d.user as { email?: string })?.email} • {(d.specialty as { nameAr?: string })?.nameAr}</p>
                    <span className="text-xs text-blue-600">عرض التفاصيل</span>
                  </Link>
                  <AdminDoctorActions
                    doctorId={d.id as string}
                    subscriptionPeriod={d.subscriptionPeriod as string}
                    status="PENDING"
                    isPending
                    showSubscription={false}
                    medicalCenterId={(d as { medicalCenterId?: string | null }).medicalCenterId}
                    canAddExtraClinics={Boolean((d as { canAddExtraClinics?: boolean }).canAddExtraClinics)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base sm:text-lg">
            <span className="inline-flex items-center gap-2 text-gray-900">
              <IconHeart className="h-5 w-5 text-blue-600" />
              <span>كل الأطباء ({list.length})</span>
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              إدارة حالة الأطباء وخطط الاشتراك
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* موبايل: بطاقات عمودية */}
          <div className="space-y-3 sm:hidden">
            {list.map((d: Record<string, unknown>, idx: number) => (
              <div
                key={d.id as string}
                className="rounded-xl border bg-white p-3 flex flex-col gap-2"
              >
                <div className="text-xs text-gray-500">
                  تسلسل: <span className="font-bold tabular-nums text-gray-800">{idx + 1}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/dashboard/admin/doctors/${d.id}`} className="min-w-0 flex-1 hover:opacity-90">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {(d.user as { name?: string })?.name ?? "—"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {(d.user as { email?: string })?.email}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {(d.specialty as { nameAr?: string })?.nameAr ?? "—"}
                    </p>
                    <span className="text-xs text-blue-600 mt-1 inline-block">عرض التفاصيل ←</span>
                  </Link>
                  <Badge
                    variant={
                      d.status === "APPROVED"
                        ? "default"
                        : d.status === "PENDING"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {d.status === "APPROVED"
                      ? "موافق"
                      : d.status === "PENDING"
                      ? "قيد المراجعة"
                      : d.status === "REJECTED"
                      ? "مرفوض"
                      : "موقوف"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                  <span>الاشتراك: {formatSubscriptionLabel(d as { medicalCenterId?: string | null; subscriptionPeriod?: string | null })}</span>
                  <span className="whitespace-nowrap">
                    {d.createdAt
                      ? format(new Date(d.createdAt as string), "dd/MM/yyyy")
                      : "—"}
                  </span>
                </div>
                <div className="mt-2">
                  <AdminDoctorActions
                    doctorId={d.id as string}
                    subscriptionPeriod={d.subscriptionPeriod as string}
                    status={d.status as string}
                    isPending={d.status === "PENDING"}
                    showSubscription={d.status === "APPROVED"}
                    medicalCenterId={(d as { medicalCenterId?: string | null }).medicalCenterId}
                    canAddExtraClinics={Boolean((d as { canAddExtraClinics?: boolean }).canAddExtraClinics)}
                  />
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                لا يوجد أطباء مسجلون.
              </div>
            )}
          </div>

          {/* سطح المكتب: جدول أفقي مع سحب */}
          <div className="hidden sm:block overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
            <table className="w-full text-right min-w-[720px] text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200 bg-gray-50/60 text-xs sm:text-sm">
                  <th className="py-2.5 pr-3 font-medium w-14">تسلسل</th>
                  <th className="py-2.5 font-medium">الطبيب</th>
                  <th className="py-2.5 font-medium">التخصص</th>
                  <th className="py-2.5 font-medium">الحالة</th>
                  <th className="py-2.5 font-medium">الاشتراك</th>
                  <th className="py-2.5 font-medium whitespace-nowrap">تاريخ التسجيل</th>
                  <th className="py-2.5 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map((d: Record<string, unknown>, idx: number) => (
                  <tr key={d.id as string} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 pr-3 align-top text-center font-semibold tabular-nums text-gray-700">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-3 align-top">
                      <Link href={`/dashboard/admin/doctors/${d.id}`} className="block hover:opacity-90">
                        <p className="font-medium text-gray-900">
                          {(d.user as { name?: string })?.name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(d.user as { email?: string })?.email}
                        </p>
                        <span className="text-xs text-blue-600">عرض التفاصيل</span>
                      </Link>
                    </td>
                    <td className="py-3 align-top">
                      <span className="text-sm text-gray-700">
                        {(d.specialty as { nameAr?: string })?.nameAr ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 align-top">
                      <Badge
                        variant={
                          d.status === "APPROVED"
                            ? "default"
                            : d.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {d.status === "APPROVED"
                          ? "موافق"
                          : d.status === "PENDING"
                          ? "قيد المراجعة"
                          : d.status === "REJECTED"
                          ? "مرفوض"
                          : "موقوف"}
                      </Badge>
                    </td>
                    <td className="py-3 align-top">
                      {(d as { medicalCenterId?: string | null }).medicalCenterId ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-sky-50 text-sky-800 border border-sky-100">
                          {formatSubscriptionLabel(d as { medicalCenterId?: string | null; subscriptionPeriod?: string | null })}
                        </span>
                      ) : (d.subscriptionPeriod as string | null) ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            d.subscriptionPeriod === "monthly"
                              ? "bg-blue-50 text-blue-700"
                              : d.subscriptionPeriod === "half_year"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {d.subscriptionPeriod === "monthly"
                            ? "شهري ₪80"
                            : d.subscriptionPeriod === "half_year"
                              ? "نصف سنة ₪400"
                              : d.subscriptionPeriod === "yearly"
                                ? "سنة ₪800"
                                : "—"}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">لا يوجد اشتراك</span>
                      )}
                    </td>
                    <td className="py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                      {d.createdAt
                        ? format(new Date(d.createdAt as string), "dd/MM/yyyy")
                        : "—"}
                    </td>
                    <td className="py-3 align-top">
                      <AdminDoctorActions
                        doctorId={d.id as string}
                        subscriptionPeriod={d.subscriptionPeriod as string}
                        status={d.status as string}
                        isPending={d.status === "PENDING"}
                        showSubscription={d.status === "APPROVED"}
                        medicalCenterId={(d as { medicalCenterId?: string | null }).medicalCenterId}
                        canAddExtraClinics={Boolean((d as { canAddExtraClinics?: boolean }).canAddExtraClinics)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                لا يوجد أطباء مسجلون.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
