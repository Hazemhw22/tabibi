"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreditCard, Calendar, Clock, MapPin, Shield, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

interface AppointmentDetails {
  id: string;
  fee: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  notes?: string;
  doctor: {
    user: { name: string };
    specialty: { nameAr: string };
    consultationFee: number;
  };
  clinic?: { name: string; address: string };
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.appointment) setAppointment(data.appointment);
        else router.push("/");
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [appointmentId, router]);

  const handlePayment = async () => {
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "حدث خطأ في الدفع");
      }
    } catch {
      toast.error("حدث خطأ، يرجى المحاولة مجدداً");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!appointment) return null;

  if (appointment.paymentStatus === "PAID") {
    router.push(`/appointments/${appointmentId}/success`);
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowRight className="h-4 w-4" />
          العودة
        </button>
        <h1 className="text-2xl font-bold text-gray-900">إتمام الدفع</h1>
        <p className="text-gray-500 mt-1">أكمل الدفع لتأكيد موعدك</p>
      </div>

      {/* Appointment Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">تفاصيل الموعد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {appointment.doctor.user.name?.charAt(0) || "D"}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">د. {appointment.doctor.user.name}</h3>
              <p className="text-sm text-blue-600">{appointment.doctor.specialty.nameAr}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">التاريخ</p>
                <p className="text-sm font-medium text-gray-800">
                  {format(new Date(appointment.appointmentDate), "dd/MM/yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">الوقت</p>
                <p className="text-sm font-medium text-gray-800">
                  {appointment.startTime} - {appointment.endTime}
                </p>
              </div>
            </div>

            {appointment.clinic && (
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <MapPin className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">العيادة</p>
                  <p className="text-sm font-medium text-gray-800">
                    {appointment.clinic.name}
                  </p>
                  <p className="text-xs text-gray-500">{appointment.clinic.address}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">رسوم الاستشارة</span>
              <span className="text-2xl font-bold text-green-600">₪{appointment.fee}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            طرق الدفع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-4 border-2 border-blue-500 rounded-xl bg-blue-50 cursor-pointer">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">بطاقة ائتمان / Stripe</p>
                <p className="text-xs text-gray-500">Visa, Mastercard, وغيرها</p>
              </div>
              <Badge variant="default">مختار</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl mb-6">
        <Shield className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">دفع آمن 100%</p>
          <p className="text-xs text-green-600 mt-0.5">
            جميع المعاملات مشفرة بالكامل عبر Stripe. لا نحتفظ ببيانات بطاقتك.
          </p>
        </div>
      </div>

      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        className="w-full"
        size="xl"
        disabled={paying}
      >
        {paying ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري التحويل لصفحة الدفع...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5" />
            ادفع ₪{appointment.fee} الآن
          </>
        )}
      </Button>
    </div>
  );
}
