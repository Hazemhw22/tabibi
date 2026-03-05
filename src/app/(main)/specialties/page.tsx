import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SpecialtiesPage() {
  const { data: specialties } = await supabaseAdmin
    .from("Specialty")
    .select("id, name, nameAr, icon")
    .order("nameAr");

  const list = specialties ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8">
        <ArrowLeft className="h-4 w-4" />
        العودة للرئيسية
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">التخصصات الطبية</h1>
      <p className="text-gray-500 mb-10">اختر تخصصاً للاطلاع على الأطباء المتاحين</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s: { id: string; nameAr: string; name: string; icon?: string }) => (
          <Link key={s.id} href={`/doctors?specialtyId=${s.id}`}>
            <Card className="hover:shadow-lg transition-shadow border-gray-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
                  {s.icon ?? "🩺"}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{s.nameAr}</h2>
                  <p className="text-sm text-gray-500">{s.name}</p>
                </div>
                <Stethoscope className="h-5 w-5 text-gray-400 mr-auto" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {list.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          لا توجد تخصصات مسجلة حالياً.
        </div>
      )}
    </div>
  );
}
