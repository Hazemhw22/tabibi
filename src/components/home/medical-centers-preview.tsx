import Link from "next/link";
import { Building2, MapPin, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function MedicalCentersPreview() {
  const { data: centers, error } = await supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr, address, city, phone, description")
    .eq("isActive", true)
    .order("name", { ascending: true })
    .limit(6);

  if (error) {
    console.error(error);
  }

  const list = centers ?? [];

  return (
    <section className="py-10 sm:py-14 bg-white dark:bg-[#060818] dark:border-y dark:border-white/5">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400 shrink-0" />
              المراكز الطبية
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-xl">
              تصفّح المراكز الطبية، اطّلع على التخصصات والأطباء، واحجز موعدك من صفحة المركز.
            </p>
          </div>
          <Button variant="outline" asChild className="shrink-0 dark:border-slate-600 dark:text-slate-200">
            <Link href="/medical-centers" className="gap-2">
              كل المراكز
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>

        {list.length === 0 ? (
          <Card className="border-dashed dark:border-slate-600 dark:bg-slate-900/50">
            <CardContent className="py-10 text-center text-gray-500 dark:text-slate-400">
              لا توجد مراكز مسجّلة حالياً.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((c) => (
              <Link key={c.id} href={`/medical-centers/${c.id}`} className="group block h-full">
                <Card className="h-full hover:border-blue-300 hover:shadow-lg transition-all dark:bg-slate-800/80 dark:border-slate-700 dark:hover:border-blue-500/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {c.nameAr || c.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 flex items-start gap-1 mt-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {c.address}، {c.city}
                          </span>
                        </p>
                        {c.description && (
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 line-clamp-2">{c.description}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-4 text-left group-hover:underline">
                      عرض الأطباء والحجز ←
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
