import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconBell from "@/components/icon/icon-bell";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { data: notifications } = await supabaseAdmin
    .from("Notification")
    .select("id, title, message, type, isRead, link, createdAt")
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  const list = notifications ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <IconArrowLeft className="h-4 w-4" />
        العودة
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <IconBell className="h-10 w-10 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإشعارات</h1>
          <p className="text-gray-500 text-sm">آخر التحديثات والرسائل</p>
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              لا توجد إشعارات حتى الآن.
            </CardContent>
          </Card>
        ) : (
          list.map((n: { id: string; title: string; message: string; isRead: boolean; link?: string; createdAt: string }) => (
            <Card key={n.id} className={n.isRead ? "opacity-80" : ""}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{n.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(n.createdAt), "d MMM yyyy، HH:mm", { locale: ar })}
                    </p>
                  </div>
                  {n.link && (
                    <Link href={n.link} className="text-blue-600 text-sm font-medium shrink-0">
                      عرض
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
