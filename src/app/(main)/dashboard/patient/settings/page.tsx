import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PatientSettingsForm } from "./patient-settings-form";

export default async function PatientSettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const name = session.user.name ?? "";
  const phone = (session.user as { phone?: string }).phone ?? "";

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">الإعدادات</h1>
          <p className="text-sm text-gray-500 mt-0.5">تعديل تفاصيل حسابك</p>
        </div>
        <Link
          href="/dashboard/patient"
          className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline"
        >
          لوحة التحكم
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <PatientSettingsForm defaultName={name} defaultPhone={phone} />
    </div>
  );
}
