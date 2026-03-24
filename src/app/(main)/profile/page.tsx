import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Card, CardContent } from "@/components/ui/card";
import IconMail from "@/components/icon/icon-mail";
import IconUser from "@/components/icon/icon-user";
import IconPhone from "@/components/icon/icon-phone";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessionUser = session.user as { image?: string | null; phone?: string | null };

  const { data: userRow } = await supabaseAdmin
    .from("User")
    .select("image, name, phone")
    .eq("id", session.user.id)
    .single();

  const row = userRow as { image?: string | null; name?: string | null; phone?: string | null } | null;

  const name = row?.name?.trim() || session.user.name?.trim() || "—";
  const email = session.user.email ?? "—";
  const phone = (row?.phone ?? sessionUser.phone)?.trim() || "";
  const profileImage = row?.image ?? sessionUser.image ?? null;
  const initial = name !== "—" ? ([...name][0] ?? "?") : "?";

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">الملف الشخصي</h1>
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-4 sm:gap-5 mb-8">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 ring-2 ring-slate-100 dark:ring-slate-600">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 640px) 64px, 80px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl">
                  {initial}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-slate-100 text-lg sm:text-xl truncate">{name}</p>
              <p className="text-gray-500 dark:text-slate-400 text-sm truncate">{email}</p>
            </div>
          </div>
          <dl className="space-y-4 border-t border-gray-100 dark:border-slate-700 pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <IconUser className="h-5 w-5 text-gray-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">الاسم</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-slate-100 font-medium">{name}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                <IconMail className="h-5 w-5 text-gray-600 dark:text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">البريد الإلكتروني</dt>
                <dd className="mt-0.5 text-gray-900 dark:text-slate-100 font-medium break-all">{email}</dd>
              </div>
            </div>
            {phone !== "" && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <IconPhone className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <dt className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">رقم الهاتف / الواتساب</dt>
                  <dd className="mt-0.5 text-gray-900 dark:text-slate-100 font-medium dir-ltr">{phone}</dd>
                </div>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
