import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import { Calendar, Star, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "مسودة", variant: "secondary" },
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مواعيدي</h1>
          <p className="text-gray-500">قائمة مواعيدك الطبية</p>
        </div>
        <Link href="/doctors">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            حجز موعد جديد
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            المواعيد ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {list.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">لا توجد مواعيد حتى الآن.</p>
              <Link href="/doctors">
                <Button>احجز موعدك الأول</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((a: Record<string, unknown>) => {
                const doctor = a.doctor as { User?: { name?: string }; Specialty?: { nameAr?: string }; user?: { name?: string }; specialty?: { nameAr?: string } };
                const review = a.Review as { id?: string }[] | { id?: string } | null | undefined;
                const hasReview = review && (Array.isArray(review) ? review.length > 0 : !!review?.id);
                const config = STATUS[String(a.status)] ?? { label: String(a.status), variant: "secondary" as const };
                return (
                  <div key={a.id as string} className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-xl bg-gray-50/50">
                    <div>
                      <p className="font-semibold text-gray-900">د. {doctor?.User?.name ?? doctor?.user?.name ?? "—"}</p>
                      <p className="text-sm text-blue-600">{doctor?.Specialty?.nameAr ?? doctor?.specialty?.nameAr}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(a.appointmentDate as string), "d MMM yyyy", { locale: ar })} • {String(a.startTime)} - {String(a.endTime)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <span className="font-medium text-gray-900">₪{Number(a.fee)}</span>
                      {a.status === "COMPLETED" && !hasReview && (
                        <Link href={`/appointments/${a.id}/review`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Star className="h-3 w-3" /> تقييم
                          </Button>
                        </Link>
                      )}
                      {a.status === "DRAFT" && (
                        <Link href={`/appointments/${a.id}/payment`}>
                          <Button size="sm">ادفع</Button>
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
  );
}
