import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconStar from "@/components/icon/icon-star";
import IconPlus from "@/components/icon/icon-plus";
import IconClock from "@/components/icon/icon-clock";
import IconUser from "@/components/icon/icon-user";
import IconMapPin from "@/components/icon/icon-map-pin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "بانتظار موافقة الطبيب", variant: "secondary" },
  CONFIRMED: { label: "مؤكد", variant: "default" },
  COMPLETED: { label: "منجز", variant: "outline" },
  CANCELLED: { label: "ملغي", variant: "destructive" },
  NO_SHOW: { label: "لم يحضر", variant: "secondary" },
};

export default async function PatientAppointmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const { data: appointments } = await supabaseAdmin
    .from("Appointment")
    .select(`
      id, appointmentDate, startTime, endTime, status, fee,
      doctor:Doctor(User(name), Specialty(nameAr)),
      clinic:Clinic(name),
      Review(id)
    `)
    .eq("patientId", session.user.id)
    .order("appointmentDate", { ascending: false });

  const list = appointments ?? [];
  const upcoming = list.filter(
    (a: { status: string; appointmentDate: string }) =>
      ["DRAFT", "CONFIRMED"].includes(String(a.status)) && new Date(a.appointmentDate) >= new Date()
  );
  const past = list.filter(
    (a: { status: string; appointmentDate: string }) =>
      String(a.status) === "COMPLETED" || new Date(a.appointmentDate) < new Date()
  );

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">مواعيدي</h1>
          <p className="text-sm text-gray-500 mt-0.5">قائمة مواعيدك الطبية</p>
        </div>
        <Link href="/doctors" className="w-full sm:w-auto">
          <Button className="gap-2 w-full sm:w-auto">
            <IconPlus className="h-4 w-4" />
            حجز موعد جديد
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <IconCalendar className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">لا توجد مواعيد حتى الآن</h3>
            <p className="text-gray-500 text-sm mb-6">احجز موعدك الأول مع أحد أطبائنا</p>
            <Link href="/doctors">
              <Button size="lg">احجز موعدك الأول</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconClock className="h-5 w-5 text-blue-600" />
                  المواعيد القادمة ({upcoming.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 sm:space-y-4">
                  {upcoming.map((a: Record<string, unknown>) => {
                    const doctor = a.doctor as { User?: { name?: string }; Specialty?: { nameAr?: string }; user?: { name?: string }; specialty?: { nameAr?: string } };
                    const clinic = a.clinic as { name?: string } | null;
                    const config = STATUS[String(a.status)] ?? { label: String(a.status), variant: "secondary" as const };
                    return (
                      <div
                        key={a.id as string}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border border-gray-200 bg-white hover:border-blue-200 transition-colors"
                      >
                        <div className="flex gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                            <IconUser className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">د. {doctor?.User?.name ?? doctor?.user?.name ?? "—"}</p>
                            <p className="text-sm text-blue-600">{doctor?.Specialty?.nameAr ?? doctor?.specialty?.nameAr}</p>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                              <IconCalendar className="h-3.5 w-3.5" />
                              {format(new Date(a.appointmentDate as string), "EEEE d MMMM yyyy", { locale: ar })} • {String(a.startTime)} - {String(a.endTime)}
                            </p>
                            {clinic?.name && (
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <IconMapPin className="h-3 w-3" />
                                {clinic.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <Badge variant={config.variant}>{config.label}</Badge>
                          <span className="font-semibold text-gray-900">₪{Number(a.fee)}</span>
                          {a.status === "CONFIRMED" && (
                            <CancelAppointmentButton
                              appointmentId={a.id as string}
                              appointmentDate={a.appointmentDate as string}
                              startTime={String(a.startTime)}
                            />
                          )}
                          {a.status === "DRAFT" && (
                            <Badge variant="secondary">تم إرسال الطلب للطبيب</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconCalendar className="h-5 w-5 text-gray-500" />
                سجل المواعيد ({past.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {past.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">لا توجد مواعيد سابقة</p>
              ) : (
                <div className="space-y-4">
                  {past.map((a: Record<string, unknown>) => {
                    const doctor = a.doctor as { User?: { name?: string }; Specialty?: { nameAr?: string }; user?: { name?: string }; specialty?: { nameAr?: string } };
                    const review = a.Review as { id?: string }[] | { id?: string } | null | undefined;
                    const hasReview = review && (Array.isArray(review) ? review.length > 0 : !!review?.id);
                    const config = STATUS[String(a.status)] ?? { label: String(a.status), variant: "secondary" as const };
                    return (
                      <div
                        key={a.id as string}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50"
                      >
                        <div className="flex gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                            <IconUser className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">د. {doctor?.User?.name ?? doctor?.user?.name ?? "—"}</p>
                            <p className="text-xs text-blue-600">{doctor?.Specialty?.nameAr ?? doctor?.specialty?.nameAr}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {format(new Date(a.appointmentDate as string), "d MMM yyyy", { locale: ar })} • {String(a.startTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                          <span className="text-sm font-medium text-gray-700">₪{Number(a.fee)}</span>
                          {a.status === "COMPLETED" && !hasReview && (
                            <Link href={`/appointments/${a.id}/review`}>
                              <Button size="sm" variant="outline" className="gap-1">
                                <IconStar className="h-3.5 w-3.5" /> تقييم
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
