import Link from "next/link";
import { SendMessagePage } from "@/components/messages/send-message-page";

export default function DoctorSendMessagePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link href="/dashboard/doctor" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>
      <SendMessagePage title="إرسال رسالة" subtitle="اختر قالباً ثابتاً أو اكتب رسالة جديدة ثم أرسلها للمريض." />
    </div>
  );
}

