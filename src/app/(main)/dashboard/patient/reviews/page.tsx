import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import Link from "next/link";
import IconStar from "@/components/icon/icon-star";
import IconHeart from "@/components/icon/icon-heart";
import IconArrowForward from "@/components/icon/icon-arrow-forward";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PatientReviewsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const { data: reviews } = await supabaseAdmin
    .from("Review")
    .select(`
      id, rating, comment, createdAt,
      doctor:Doctor(user:User!Doctor_userId_fkey(name), Specialty(nameAr)),
      appointment:Appointment(appointmentDate)
    `)
    .eq("patientId", session.user.id)
    .order("createdAt", { ascending: false });

  const list = reviews ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقييمات</h1>
          <p className="text-gray-500">تقييماتك للأطباء</p>
        </div>
        <Link href="/dashboard/patient" className="text-blue-600 text-sm font-medium flex items-center gap-1">
          <IconArrowForward className="h-4 w-4" />
          لوحة التحكم
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconStar className="h-5 w-5 text-amber-500" />
            التقييمات ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {list.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <IconHeart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>لم تقيّم أي طبيب بعد.</p>
              <p className="text-sm mt-1">بعد إتمام المواعيد يمكنك إضافة تقييم من صفحة المواعيد.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((r: Record<string, unknown>) => {
                const doctor = r.doctor as {
                  User?: { name?: string };
                  Specialty?: { nameAr?: string };
                  user?: { name?: string };
                  specialty?: { nameAr?: string };
                };
                const apt = r.appointment as { appointmentDate?: string } | undefined;
                const comment = typeof r.comment === "string" ? r.comment : null;
                return (
                  <div key={r.id as string} className="p-4 border rounded-xl bg-gray-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">د. {doctor?.User?.name ?? doctor?.user?.name ?? "—"}</p>
                        <p className="text-sm text-blue-600">{doctor?.Specialty?.nameAr ?? doctor?.specialty?.nameAr}</p>
                        {apt?.appointmentDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            موعد: {format(new Date(apt.appointmentDate), "d MMM yyyy", { locale: ar })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <IconStar
                            key={i}
                            className={`h-4 w-4 ${i < Number(r.rating ?? 0) ? "fill-current" : "text-gray-200"}`}
                          />
                        ))}
                        <span className="text-sm font-medium text-gray-700 mr-1">
                          {Number(r.rating ?? 0)}/5
                        </span>
                      </div>
                    </div>
                    {comment && (
                      <p className="text-sm text-gray-600 mt-3 border-t pt-3">{comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {r.createdAt ? format(new Date(r.createdAt as string), "d MMM yyyy", { locale: ar }) : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
