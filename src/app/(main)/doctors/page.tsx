import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { Star, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DoctorFilters from "./filters";

interface SearchParams {
  search?: string;
  specialtyId?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

async function getDoctors(params: SearchParams) {
  let query = supabaseAdmin
    .from("Doctor")
    .select(`*, user:User(*), specialty:Specialty(*), clinics:Clinic(*), reviews:Review(id)`)
    .eq("status", "APPROVED");

  if (params.specialtyId) {
    query = query.eq("specialtyId", params.specialtyId);
  }
  if (params.minPrice) {
    query = query.gte("consultationFee", Number(params.minPrice));
  }
  if (params.maxPrice) {
    query = query.lte("consultationFee", Number(params.maxPrice));
  }

  if (params.sort === "price_asc") {
    query = query.order("consultationFee", { ascending: true });
  } else if (params.sort === "price_desc") {
    query = query.order("consultationFee", { ascending: false });
  } else if (params.sort === "experience") {
    query = query.order("experienceYears", { ascending: false });
  } else {
    query = query.order("rating", { ascending: false });
  }

  const { data } = await query;

  if (params.search && data) {
    const q = params.search.toLowerCase();
    return data.filter(
      (d: { user?: { name?: string }; specialty?: { nameAr?: string } }) =>
        d.user?.name?.toLowerCase().includes(q) ||
        d.specialty?.nameAr?.toLowerCase().includes(q)
    );
  }

  return data ?? [];
}

async function getSpecialties() {
  const { data } = await supabaseAdmin
    .from("Specialty")
    .select("id, name, nameAr")
    .order("nameAr");
  return data ?? [];
}

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [doctors, specialties] = await Promise.all([
    getDoctors(params),
    getSpecialties(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">الأطباء</h1>
        <p className="text-gray-500">{doctors.length} طبيب متاح في الخليل</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-72 shrink-0">
          <DoctorFilters specialties={specialties} currentParams={params} />
        </aside>

        <div className="flex-1">
          {doctors.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                لم يتم العثور على أطباء
              </h3>
              <p className="text-gray-500 mb-6">جرّب تغيير معايير البحث</p>
              <Link href="/doctors">
                <Button variant="outline">مسح الفلاتر</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {doctors.map((doctor: { id: string; user?: { name?: string }; specialty?: { nameAr?: string }; consultationFee?: number; rating?: number; experienceYears?: number; clinics?: { address?: string }[]; reviews?: { length?: number }[] }) => (
                <Link key={doctor.id} href={`/doctors/${doctor.id}`}>
                  <Card className="hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group h-full">
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-3xl font-bold text-blue-600 shrink-0">
                          {doctor.user?.name?.charAt(0) || "D"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                د. {doctor.user?.name}
                              </h3>
                              <span className="inline-block mt-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {doctor.specialty?.nameAr}
                              </span>
                            </div>
                            <Badge variant="success" className="shrink-0">متاح</Badge>
                          </div>

                          {doctor.clinics?.[0] && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <p className="text-xs text-gray-500 truncate">
                                {doctor.clinics[0].address}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <p className="text-xs text-gray-500">
                              خبرة {doctor.experienceYears} سنوات
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold text-gray-800">
                            {(doctor.rating ?? 0).toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({doctor.reviews?.length ?? 0} تقييم)
                          </span>
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          <span className="text-green-600">₪{doctor.consultationFee}</span>
                          <span className="text-xs text-gray-400 font-normal mr-1">للزيارة</span>
                        </div>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          احجز موعد
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
