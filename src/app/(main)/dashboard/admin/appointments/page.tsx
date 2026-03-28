import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconCalendar from "@/components/icon/icon-calendar";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "secondary" },
  CONFIRMED: { label: "مؤكد", variant: "default" },
  COMPLETED: { label: "منجز", variant: "outline" },
  CANCELLED: { label: "ملغي", variant: "destructive" },
  NO_SHOW: { label: "لم يحضر", variant: "secondary" },
};

export default async function AdminAppointmentsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const { data: appointments } = await supabaseAdmin
    .from("Appointment")
    .select(`
      id, appointmentDate, startTime, endTime, status, fee,
      patient:User(name, email),
      doctor:Doctor(user:User!Doctor_userId_fkey(name), specialty:Specialty(nameAr))
    `)
    .order("appointmentDate", { ascending: false })
    .limit(100);

  const list = appointments ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المواعيد</h1>
          <p className="text-gray-500">جميع مواعيد الحجز في المنصة</p>
        </div>
        <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <IconArrowForward className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCalendar className="h-5 w-5" />
            قائمة المواعيد ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-right text-gray-500 border-b">
                <th className="pb-3 font-medium">المريض</th>
                <th className="pb-3 font-medium">الطبيب</th>
                <th className="pb-3 font-medium">التاريخ والوقت</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((a: Record<string, unknown>) => {
                const patient = a.patient as { name?: string; email?: string };
                const doctor = a.doctor as { user?: { name?: string }; specialty?: { nameAr?: string } };
                const config = STATUS[String(a.status)] ?? { label: String(a.status), variant: "secondary" as const };
                return (
                  <tr key={a.id as string}>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{patient?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{patient?.email}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-gray-900">د. {doctor?.user?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{doctor?.specialty?.nameAr}</p>
                    </td>
                    <td className="py-3 text-gray-700">
                      {format(new Date(a.appointmentDate as string), "d MMM yyyy", { locale: ar })} • {String(a.startTime)}
                    </td>
                    <td className="py-3">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </td>
                    <td className="py-3 font-medium">₪{Number(a.fee)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="text-center py-12 text-gray-500">لا توجد مواعيد.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
