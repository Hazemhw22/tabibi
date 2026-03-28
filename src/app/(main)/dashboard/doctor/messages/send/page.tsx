import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { redirectDoctorStaffToAppointments } from "@/lib/doctor-staff-route-guard";
import { SendMessagePage } from "@/components/messages/send-message-page";

export default async function DoctorSendMessagePage() {
  const session = await auth();
  if (!session) redirect("/login");
  redirectDoctorStaffToAppointments(session);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link href="/dashboard/doctor" className="mb-4 inline-block text-sm text-blue-600">
        ← الرئيسية
      </Link>
      <SendMessagePage
        title="إرسال رسالة"
        subtitle="اختر مريضاً من القائمة لإدراج كشف الحساب أو التحصيل تلقائياً، أو اكتب رسالة يدوياً."
        clinicPatientLedger
      />
    </div>
  );
}
