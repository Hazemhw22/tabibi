import { CheckCircle, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const { data: appointment } = await supabaseAdmin
    .from("Appointment")
    .select(`
      id, appointmentDate, startTime, endTime, fee, patientId,
      doctor:Doctor(user:User(name), specialty:Specialty(nameAr)),
      clinic:Clinic(name)
    `)
    .eq("id", id)
    .single();

  if (!appointment || appointment.patientId !== session.user.id) {
    redirect("/dashboard/patient");
  }

  const doctor = (appointment as any).doctor;
  const clinic = (appointment as any).clinic;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="relative inline-flex mb-8">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-14 w-14 text-green-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
          ✓
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        تم تأكيد موعدك! 🎉
      </h1>
      <p className="text-gray-500 mb-8">
        تم حجز الموعد بنجاح. الدفع عند الوصول للعيادة.
      </p>

      <Card className="text-right mb-8 border-green-200 bg-green-50">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">الطبيب</span>
            <span className="font-semibold text-gray-900">
              د. {doctor?.user?.name ?? doctor?.User?.name ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">التخصص</span>
            <span className="font-medium text-gray-800">
              {doctor?.specialty?.nameAr ?? doctor?.Specialty?.nameAr ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">التاريخ</span>
            <span className="font-medium text-gray-800">
              {format(new Date(appointment.appointmentDate), "dd/MM/yyyy")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">الوقت</span>
            <span className="font-medium text-gray-800">
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
          {clinic?.name && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">العيادة</span>
              <span className="font-medium text-gray-800">{clinic.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-green-200 pt-3">
            <span className="text-gray-600 text-sm">المبلغ (يدفع في العيادة)</span>
            <span className="text-xl font-bold text-green-600">
              ₪{appointment.fee}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Link href="/dashboard/patient">
          <Button className="w-full" size="lg">
            <Calendar className="h-4 w-4" />
            عرض مواعيدي
          </Button>
        </Link>
        <Link href="/doctors">
          <Button variant="outline" className="w-full" size="lg">
            <ArrowRight className="h-4 w-4" />
            حجز موعد آخر
          </Button>
        </Link>
      </div>
    </div>
  );
}
