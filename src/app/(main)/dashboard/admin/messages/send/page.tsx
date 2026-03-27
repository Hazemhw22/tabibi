import Link from "next/link";
import { SendMessagePage } from "@/components/messages/send-message-page";

export default function AdminSendMessagePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link href="/dashboard/admin" className="text-sm text-blue-600 mb-4 inline-block">
        ← الرئيسية
      </Link>
      <SendMessagePage
        title="إرسال رسالة (مشرف)"
        subtitle="إرسال يدوي مع قوالب ثابتة ومعاينة. يمكنك أيضاً الإرسال لكل العملاء."
        allowAllUsers
      />
    </div>
  );
}

