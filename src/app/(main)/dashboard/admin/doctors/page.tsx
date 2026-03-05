import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import Link from "next/link";
import { Stethoscope, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminDoctorActions from "../admin-doctor-actions";

export default async function AdminDoctorsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLATFORM_ADMIN") redirect("/");

  const { data: doctors } = await supabaseAdmin
    .from("Doctor")
    .select("id, userId, status, subscriptionPlan, createdAt, user:User(name, email), specialty:Specialty(nameAr)")
    .order("createdAt", { ascending: false });

  const list = doctors ?? [];
  const pending = list.filter((d: { status: string }) => d.status === "PENDING");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الأطباء</h1>
          <p className="text-gray-500">إدارة حسابات الأطباء والاشتراكات</p>
        </div>
        <Link href="/dashboard/admin" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <ArrowRight className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      {pending.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="text-base">بانتظار الموافقة ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {pending.map((d: Record<string, unknown>) => (
                <div key={d.id as string} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium text-gray-900">{(d.user as { name?: string })?.name ?? "—"}</p>
                    <p className="text-sm text-gray-500">{(d.user as { email?: string })?.email} • {(d.specialty as { nameAr?: string })?.nameAr}</p>
                  </div>
                  <AdminDoctorActions doctorId={d.id as string} subscriptionPlan={d.subscriptionPlan as string} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            كل الأطباء ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-right text-gray-500 border-b">
                <th className="pb-3 font-medium">الطبيب</th>
                <th className="pb-3 font-medium">التخصص</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">الاشتراك</th>
                <th className="pb-3 font-medium">التاريخ</th>
                <th className="pb-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((d: Record<string, unknown>) => (
                <tr key={d.id as string}>
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{(d.user as { name?: string })?.name ?? "—"}</p>
                    <p className="text-xs text-gray-500">{(d.user as { email?: string })?.email}</p>
                  </td>
                  <td className="py-3">{(d.specialty as { nameAr?: string })?.nameAr ?? "—"}</td>
                  <td className="py-3">
                    <Badge variant={d.status === "APPROVED" ? "default" : d.status === "PENDING" ? "secondary" : "destructive"}>
                      {d.status === "APPROVED" ? "موافق" : d.status === "PENDING" ? "قيد المراجعة" : d.status === "REJECTED" ? "مرفوض" : "موقوف"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {d.subscriptionPlan === "premium" ? "بريميوم" : d.subscriptionPlan === "enterprise" ? "مؤسسة" : "أساسي"}
                  </td>
                  <td className="py-3 text-gray-500">{d.createdAt ? format(new Date(d.createdAt as string), "dd/MM/yyyy") : "—"}</td>
                  <td className="py-3">
                    {d.status === "PENDING" && <AdminDoctorActions doctorId={d.id as string} subscriptionPlan={d.subscriptionPlan as string} />}
                    {d.status === "APPROVED" && <AdminDoctorActions doctorId={d.id as string} subscriptionPlan={d.subscriptionPlan as string} showSubscription />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="text-center py-12 text-gray-500">لا يوجد أطباء مسجلون.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
