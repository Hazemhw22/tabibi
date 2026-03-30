import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import Link from "next/link";
import IconUsers from "@/components/icon/icon-users";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PromotePlatformAdminCard } from "@/components/admin/promote-platform-admin-card";
import { Input } from "@/components/ui/input";

const ROLE_LABELS: Record<string, string> = {
  PATIENT: "مريض",
  DOCTOR: "طبيب",
  PLATFORM_ADMIN: "مشرف منصة",
  CLINIC_ADMIN: "مشرف عيادة",
  MEDICAL_CENTER_ADMIN: "مدير مركز طبي",
  MEDICAL_CENTER_RECEPTIONIST: "استقبال (مركز)",
  MEDICAL_CENTER_LAB_STAFF: "مختبر/أشعة (مركز)",
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const { data: users } = await supabaseAdmin
    .from("User")
    .select("id, name, email, phone, role, createdAt")
    .order("createdAt", { ascending: false })
    .limit(200);

  const list = users ?? [];
  const platformAdmins = list.filter((u) => String((u as { role?: string }).role) === "PLATFORM_ADMIN");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستخدمون</h1>
          <p className="text-gray-500">قائمة حسابات المنصة</p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
            <IconArrowForward className="h-4 w-4" />
            لوحة التحكم
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <PromotePlatformAdminCard
          initialAdmins={
            platformAdmins as {
              id: string;
              name: string | null;
              email: string | null;
              phone: string | null;
              role: string;
            }[]
          }
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <IconUsers className="h-5 w-5" />
              المستخدمون ({list.length})
            </CardTitle>
            <div className="w-full sm:w-[360px]">
              <Input
                placeholder="بحث سريع (اسم/إيميل/هاتف)…"
                disabled
                className="bg-gray-50/80"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                (قريباً) بحث من داخل الصفحة — حالياً القائمة آخر 200 مستخدم.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto touch-pan-x scrollbar-hide">
              <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-right text-gray-500 border-b bg-gray-50/90 sticky top-0">
                <th className="py-3 px-4 font-medium">الاسم</th>
                <th className="py-3 px-4 font-medium">البريد</th>
                <th className="py-3 px-4 font-medium">الهاتف</th>
                <th className="py-3 px-4 font-medium">الدور</th>
                <th className="py-3 px-4 font-medium">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {list.map((u: Record<string, unknown>) => (
                <tr key={u.id as string} className="hover:bg-gray-50/70">
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900">{String(u.name ?? "—")}</div>
                    <div className="text-[11px] text-gray-500" dir="ltr">
                      {String(u.id ?? "")}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600" dir="ltr">{String(u.email ?? "—")}</td>
                  <td className="py-3 px-4 text-gray-600" dir="ltr">{String(u.phone ?? "—")}</td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{ROLE_LABELS[String(u.role)] ?? String(u.role)}</Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {u.createdAt ? format(new Date(u.createdAt as string), "dd/MM/yyyy") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
          {list.length === 0 && (
            <div className="text-center py-12 text-gray-500">لا يوجد مستخدمون.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
