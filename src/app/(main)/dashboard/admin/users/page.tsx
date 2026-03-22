import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  PATIENT: "مريض",
  DOCTOR: "طبيب",
  PLATFORM_ADMIN: "مشرف منصة",
  CLINIC_ADMIN: "مشرف عيادة",
  MEDICAL_CENTER_ADMIN: "مركز طبي",
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المستخدمون</h1>
          <p className="text-gray-500">قائمة حسابات المنصة</p>
        </div>
        <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            المستخدمون ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 touch-pan-x scrollbar-hide">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-right text-gray-500 border-b">
                <th className="pb-3 font-medium">الاسم</th>
                <th className="pb-3 font-medium">البريد</th>
                <th className="pb-3 font-medium">الهاتف</th>
                <th className="pb-3 font-medium">الدور</th>
                <th className="pb-3 font-medium">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((u: Record<string, unknown>) => (
                <tr key={u.id as string}>
                  <td className="py-3 font-medium text-gray-900">{String(u.name ?? "—")}</td>
                  <td className="py-3 text-gray-600" dir="ltr">{String(u.email ?? "—")}</td>
                  <td className="py-3 text-gray-600" dir="ltr">{String(u.phone ?? "—")}</td>
                  <td className="py-3">
                    <Badge variant="secondary">{ROLE_LABELS[String(u.role)] ?? String(u.role)}</Badge>
                  </td>
                  <td className="py-3 text-gray-500">{u.createdAt ? format(new Date(u.createdAt as string), "dd/MM/yyyy") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="text-center py-12 text-gray-500">لا يوجد مستخدمون.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
