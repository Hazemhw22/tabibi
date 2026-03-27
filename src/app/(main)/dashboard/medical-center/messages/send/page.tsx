import Link from "next/link";
import { SendMessagePage } from "@/components/messages/send-message-page";

export default function CenterSendMessagePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link href="/dashboard/medical-center" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>
      <SendMessagePage title="إرسال رسالة" subtitle="رسائل المركز للطبيب أو للمرضى (SMS) مع سجل." />
    </div>
  );
}

