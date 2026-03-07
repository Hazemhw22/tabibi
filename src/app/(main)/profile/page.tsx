import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, User as UserIcon, Phone } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const name = session.user.name ?? "—";
  const email = session.user.email ?? "—";
  const phone = (session.user as { phone?: string }).phone;

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">الملف الشخصي</h1>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-5 mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 flex items-center justify-center text-2xl sm:text-3xl font-bold text-blue-600 shrink-0">
              {name !== "—" ? name.charAt(0) : "?"}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-lg sm:text-xl truncate">{name}</p>
              <p className="text-gray-500 text-sm truncate">{email}</p>
            </div>
          </div>
          <dl className="space-y-4 border-t border-gray-100 pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <UserIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">الاسم</dt>
                <dd className="mt-0.5 text-gray-900 font-medium">{name}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">البريد الإلكتروني</dt>
                <dd className="mt-0.5 text-gray-900 font-medium break-all">{email}</dd>
              </div>
            </div>
            {phone != null && phone !== "" && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">رقم الهاتف / الواتساب</dt>
                  <dd className="mt-0.5 text-gray-900 font-medium dir-ltr">{phone}</dd>
                </div>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
