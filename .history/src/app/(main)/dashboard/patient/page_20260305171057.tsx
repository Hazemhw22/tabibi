import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Plus,
  MapPin,
  Wallet,
  CreditCard,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  DRAFT: { label: "مسودة", variant: "secondary" as const, icon: AlertCircle, color: "text-gray-500" },
  CONFIRMED: { label: "مؤكد", variant: "default" as const, icon: CheckCircle, color: "text-blue-500" },
  COMPLETED: { label: "منجز", variant: "success" as const, icon: CheckCircle, color: "text-green-500" },
  CANCELLED: { label: "ملغي", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
  NO_SHOW: { label: "لم يحضر", variant: "secondary" as const, icon: AlertCircle, color: "text-yellow-500" },
};

export default async function PatientDashboard() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const { data: appointments } = await supabaseAdmin
    .from("Appointment")
    .select(`
      id, appointmentDate, startTime, endTime, status, fee, paymentStatus,
      doctor:Doctor(User(name), Specialty(nameAr)),
      clinic:Clinic(name),
      Review(id)
    `)
    .eq("patientId", session.user.id)
    .order("appointmentDate", { ascending: false });

  // معاملات المريض (دفعات + خدمات) من العيادة ومن المنصة
  // 1) معاملات مرضى المنصة المرتبطة مباشرة بحساب المريض
  const { data: platformTxRes } = await supabaseAdmin
    .from("PlatformPatientTransaction")
    .select(`id, type, description, amount, date, doctor:Doctor(User(name))`)
    .eq("patientId", session.user.id)
    .order("date", { ascending: false });

  // 2) مرضى العيادة المرتبطون بهذا الحساب (ClinicPatient.userId = user.id) ثم جلب معاملات ClinicTransaction لهم
  const { data: clinicPatients } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("userId", session.user.id);

  let clinicTxList:
    | Array<{
        id: string;
        type: string;
        description: string;
        amount: number;
        date: string;
        clinicPatient?: { name?: string; doctor?: { User?: { name?: string } } };
      }>
    | null = null;

  const cpIds = (clinicPatients ?? []).map((p: { id: string }) => p.id);
  if (cpIds.length > 0) {
    const { data: clinicTxData } = await supabaseAdmin
      .from("ClinicTransaction")
      .select(
        `id, type, description, amount, date,
         clinicPatient:ClinicPatient(name, doctor:Doctor(User(name)))`
      )
      .in("clinicPatientId", cpIds)
      .order("date", { ascending: false });
    clinicTxList = clinicTxData as Array<{
      id: string;
      type: string;
      description: string;
      amount: number;
      date: string;
      clinicPatient?: { name?: string; doctor?: { User?: { name?: string } } };
    }> | null;
  }

  type PatientTxRow = {
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
    doctorName: string;
    source: "منصة" | "عيادة";
  };

  const platformTxList = (platformTxRes ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    doctor?: { User?: { name?: string } };
  }>;

  const txRows: PatientTxRow[] = [
    ...platformTxList.map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      description: t.description,
      amount: t.amount,
      doctorName: t.doctor?.User?.name ?? "—",
      source: "منصة" as const,
    })),
    ...((clinicTxList ?? []) as Array<{
      id: string;
      type: string;
      description: string;
      amount: number;
      date: string;
      clinicPatient?: { name?: string; doctor?: { User?: { name?: string } } };
    }>).map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      description: t.description,
      amount: t.amount,
      doctorName:
        (t.clinicPatient as { doctor?: { User?: { name?: string } } })?.doctor?.User?.name ?? "—",
      source: "عيادة" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // جلب الأطباء لاستخدامهم في السلايدر (مقترحون، الأعلى تقييماً، الأكثر زيارة)
  const { data: doctorsData } = await supabaseAdmin
    .from("Doctor")
    .select(
      `id, consultationFee, rating, createdAt,
       user:User(name),
       specialty:Specialty(nameAr),
       clinics:Clinic(address),
       reviews:Review(id)`
    )
    .eq("status", "APPROVED");
  const doctors = (doctorsData ?? []) as Array<{
    id: string;
    consultationFee?: number | null;
    rating?: number | null;
    createdAt?: string | null;
    user?: { name?: string | null };
    specialty?: { nameAr?: string | null };
    clinics?: { address?: string | null }[];
    reviews?: { id: string }[];
  }>;
  const suggestedDoctors = [...doctors]
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    )
    .slice(0, 10);
  const topRatedDoctors = [...doctors]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 10);
  const mostVisitedDoctors = [...doctors]
    .sort((a, b) => (b.reviews?.length ?? 0) - (a.reviews?.length ?? 0))
    .slice(0, 10);

  const list = appointments ?? [];
  const statsMap = list.reduce(
    (acc: Record<string, number>, a: { status: string }) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    {}
  );
  const upcoming = list.filter(
    (a: { status: string; appointmentDate: string }) =>
      ["CONFIRMED", "DRAFT"].includes(a.status) &&
      new Date(a.appointmentDate) >= new Date()
  );

  // مجموع الدفعات = المدفوعات من المواعيد المدفوعة + الدفعات التي يضيفها الطبيب يدوياً (Clinic/Platform)
  const totalPaidFromAppointments = list
    .filter((a: { paymentStatus?: string }) => a.paymentStatus === "PAID")
    .reduce((sum: number, a: { fee: number }) => sum + (a.fee ?? 0), 0);
  const totalPaidFromManual = txRows
    .filter((t) => t.type === "PAYMENT")
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
  const totalPaid = totalPaidFromAppointments + totalPaidFromManual;
  const totalDebts = list
    .filter(
      (a: { paymentStatus?: string; status: string }) =>
        a.paymentStatus === "UNPAID" &&
        ["DRAFT", "CONFIRMED"].includes(a.status)
    )
    .reduce((sum: number, a: { fee: number }) => sum + (a.fee ?? 0), 0);

  const latestAppointments = list.slice(0, 5);
  const latestTransactions = txRows.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مرحباً، {session.user.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">إدارة مواعيدك الطبية — حساب مريض</p>
        </div>
        <Link href="/doctors">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            حجز موعد جديد
          </Button>
        </Link>
      </div>

      {/* Stats: مواعيد + مجموع الدفعات + مجموع الديون */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "إجمالي المواعيد", value: list.length, color: "bg-blue-50 text-blue-600" },
          { label: "مواعيد قادمة", value: upcoming.length, color: "bg-indigo-50 text-indigo-600" },
          { label: "مواعيد منجزة", value: statsMap["COMPLETED"] || 0, color: "bg-green-50 text-green-600" },
          { label: "مواعيد ملغاة", value: statsMap["CANCELLED"] || 0, color: "bg-red-50 text-red-600" },
          { label: "مجموع الدفعات", value: `₪${totalPaid.toFixed(0)}`, color: "bg-emerald-50 text-emerald-600", icon: CreditCard },
          { label: "مجموع الديون", value: `₪${totalDebts.toFixed(0)}`, color: "bg-amber-50 text-amber-600", icon: Wallet },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              {stat.icon && (
                <div className="mb-2 text-gray-400">
                  <stat.icon className="h-5 w-5" />
                </div>
              )}
              <div className={`text-2xl font-bold ${stat.color.split(" ")[1]}`}>
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">المواعيد القادمة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((apt: Record<string, unknown>) => {
              const config = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
              const doctor = apt.doctor as { User?: { name?: string }; Specialty?: { nameAr?: string }; user?: { name?: string }; specialty?: { nameAr?: string } } | undefined;
              const clinic = apt.clinic as { name?: string } | undefined;
              return (
                <Card key={apt.id as string} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 shrink-0">
                          {(doctor?.User?.name ?? doctor?.user?.name)?.charAt(0) || "D"}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            د. {doctor?.User?.name ?? doctor?.user?.name}
                          </h3>
                          <p className="text-sm text-blue-600">
                            {doctor?.Specialty?.nameAr ?? doctor?.specialty?.nameAr}
                          </p>
                        </div>
                      </div>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(apt.appointmentDate as string), "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {String(apt.startTime)} - {String(apt.endTime)}
                      </div>
                      {clinic?.name && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {clinic.name}
                        </div>
                      )}
                    </div>
                    {apt.status === "DRAFT" && (
                      <Link href={`/appointments/${apt.id}/payment`} className="block mt-3">
                        <Button size="sm" className="w-full">أكمل الدفع لتأكيد الموعد</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {mostVisitedDoctors.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">الأطباء الأكثر زيارة</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
            {mostVisitedDoctors.map((doctor) => (
              <Link
                key={doctor.id}
                href={`/doctors/${doctor.id}`}
                className="snap-start shrink-0 w-60"
              >
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                        {doctor.user?.name?.charAt(0) || "D"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          د. {doctor.user?.name}
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          {doctor.specialty?.nameAr}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-800">
                          {(doctor.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({doctor.reviews?.length ?? 0} زيارة)
                        </span>
                      </span>
                      {doctor.consultationFee != null && (
                        <span className="font-semibold text-emerald-600">
                          ₪{doctor.consultationFee}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">أحدث 5 مواعيد</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {latestAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد مواعيد بعد</h3>
              <p className="text-gray-500 mb-6 text-sm">ابدأ بحجز موعدك الأول مع أحد أطبائنا</p>
              <Link href="/doctors">
                <Button>احجز موعدك الأول</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-3 pr-4 font-medium">الطبيب</th>
                    <th className="pb-3 font-medium">التاريخ</th>
                    <th className="pb-3 font-medium">الوقت</th>
                    <th className="pb-3 font-medium">الحالة</th>
                    <th className="pb-3 font-medium">المبلغ</th>
                    <th className="pb-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {latestAppointments.map((apt: Record<string, unknown>) => {
                    const config = STATUS_CONFIG[apt.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.DRAFT;
                    const doctor = apt.doctor as { User?: { name?: string }; Specialty?: { nameAr?: string }; user?: { name?: string }; specialty?: { nameAr?: string } } | undefined;
                    const review = apt.Review as { id?: string }[] | { id?: string } | null | undefined;
                    const hasReview = review && (Array.isArray(review) ? review.length > 0 : !!review.id);
                    return (
                      <tr key={apt.id as string} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-gray-900">د. {doctor?.User?.name ?? doctor?.user?.name}</p>
                            <p className="text-xs text-gray-500">{doctor?.Specialty?.nameAr ?? doctor?.specialty?.nameAr}</p>
                          </div>
                        </td>
                        <td className="py-3 text-gray-700">
                          {format(new Date(apt.appointmentDate as string), "dd/MM/yyyy")}
                        </td>
                        <td className="py-3 text-gray-700">{String(apt.startTime)}</td>
                        <td className="py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="py-3 font-semibold text-gray-900">₪{Number(apt.fee)}</td>
                        <td className="py-3">
                          {apt.status === "COMPLETED" && !hasReview && (
                            <Link href={`/appointments/${apt.id}/review`}>
                              <Button size="sm" variant="outline" className="gap-1 text-xs">
                                <Star className="h-3 w-3" /> تقييم
                              </Button>
                            </Link>
                          )}
                          {apt.status === "DRAFT" && (
                            <Link href={`/appointments/${apt.id}/payment`}>
                              <Button size="sm" variant="default" className="text-xs">ادفع</Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سكرول الأطباء المقترحين أسفل أحدث 5 مواعيد */}
      {suggestedDoctors.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">أطباء مقترحون لك</h2>
            <Link
              href="/doctors"
              className="text-xs text-blue-600 hover:underline"
            >
              عرض كل الأطباء
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
            {suggestedDoctors.map((doctor) => (
              <Link
                key={doctor.id}
                href={`/doctors/${doctor.id}`}
                className="snap-start shrink-0 w-64"
              >
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                        {doctor.user?.name?.charAt(0) || "D"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          د. {doctor.user?.name}
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          {doctor.specialty?.nameAr}
                        </p>
                        {doctor.clinics?.[0]?.address && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            {doctor.clinics[0].address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-800">
                          {(doctor.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({doctor.reviews?.length ?? 0} تقييم)
                        </span>
                      </span>
                      {doctor.consultationFee != null && (
                        <span className="font-semibold text-emerald-600">
                          ₪{doctor.consultationFee}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* جدول الدفعات والديون الخاصة بهذا المريض فقط */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span>الدفعات والديون</span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              تظهر هنا الحركات المالية التي تم إدخالها لك عند الأطباء (دفعات وخدمات)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {txRows.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              لا توجد دفعات أو ديون مسجلة لك حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-3 pr-4 font-medium">التاريخ</th>
                    <th className="pb-3 font-medium">الطبيب</th>
                    <th className="pb-3 font-medium">النوع</th>
                    <th className="pb-3 font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-gray-700">
                        {tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="py-3 text-gray-900 font-medium">
                        {tx.doctorName !== "—" ? `د. ${tx.doctorName}` : "—"}
                      </td>
                      <td className="py-3">
                        <Badge variant={tx.type === "PAYMENT" ? "default" : "te"}>
                          {tx.type === "PAYMENT" ? "دفعة" : "خدمة / دين"}
                        </Badge>
                      </td>
                      <td
                        className={`py-3 font-semibold ${
                          tx.type === "PAYMENT" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "PAYMENT" ? "+" : "-"}₪{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* سكرول الأطباء الأعلى تقييماً أسفل الدفعات والديون */}
      {topRatedDoctors.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">الأطباء الأعلى تقييماً</h2>
            <Link
              href="/doctors"
              className="text-xs text-blue-600 hover:underline"
            >
              عرض كل الأطباء
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
            {topRatedDoctors.map((doctor) => (
              <Link
                key={doctor.id}
                href={`/doctors/${doctor.id}`}
                className="snap-start shrink-0 w-64"
              >
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                        {doctor.user?.name?.charAt(0) || "D"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          د. {doctor.user?.name}
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          {doctor.specialty?.nameAr}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-gray-800">
                          {(doctor.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({doctor.reviews?.length ?? 0} تقييم)
                        </span>
                      </span>
                      {doctor.consultationFee != null && (
                        <span className="font-semibold text-emerald-600">
                          ₪{doctor.consultationFee}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
