import Link from "next/link";
import { MapPin, Building2, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const metadata = {
  title: "المراكز الطبية | طبيبي",
  description: "تصفّح المراكز الطبية واحجز عند الأطباء",
};

export default async function MedicalCentersPage() {
  const { data: centers, error } = await supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr, slug, address, city, phone, description")
    .eq("isActive", true)
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
  }

  const list = centers ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          المراكز الطبية
        </h1>
        <p className="text-gray-600 mt-2">
          اختر مركزاً طبياً، ثم تصفّح الأطباء واحجز موعدك.
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-gray-500">
            لا توجد مراكز مسجّلة حالياً.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/medical-centers/${c.id}`}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-lg text-gray-900">{c.nameAr || c.name}</h2>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {c.address}، {c.city}
                      </p>
                      {c.phone && (
                        <p className="text-xs text-gray-400 mt-1 dir-ltr text-right">{c.phone}</p>
                      )}
                      {c.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <ChevronLeft className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
