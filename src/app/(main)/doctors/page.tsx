import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import IconStar from "@/components/icon/icon-star";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconClock from "@/components/icon/icon-clock";
import IconMessage from "@/components/icon/icon-message";
import IconSearch from "@/components/icon/icon-search";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconFilter from "@/components/icon/icon-filter";
import FavoriteButton from "@/components/ui/favorite-button";
import { doctorServesLocation, getLocationFullName } from "@/data/west-bank-locations";
import { getDoctorAvatar } from "@/lib/avatar";
import SortSelect from "./sort-select";

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-teal-500 to-cyan-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-green-600",
];

interface SearchParams {
  search?: string;
  specialtyId?: string;
  locationId?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

async function getDoctors(
  params: SearchParams,
  effectiveLocationId: string | null,
  isGuest: boolean
) {
  let query = supabaseAdmin
    .from("Doctor")
    .select(`*, locationId, gender, user:User(name, phone, image), specialty:Specialty(*), clinics:Clinic(*), reviews:Review(id)`)
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true);

  if (params.specialtyId) query = query.eq("specialtyId", params.specialtyId);
  if (params.minPrice) query = query.gte("consultationFee", Number(params.minPrice));
  if (params.maxPrice) query = query.lte("consultationFee", Number(params.maxPrice));

  if (params.sort === "price_asc") query = query.order("consultationFee", { ascending: true });
  else if (params.sort === "price_desc") query = query.order("consultationFee", { ascending: false });
  else if (params.sort === "experience") query = query.order("experienceYears", { ascending: false });
  else query = query.order("rating", { ascending: false });

  const { data } = await query;
  let result = data ?? [];

  if (params.search && result.length) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (d: { user?: { name?: string }; specialty?: { nameAr?: string } }) =>
        d.user?.name?.toLowerCase().includes(q) ||
        d.specialty?.nameAr?.toLowerCase().includes(q)
    );
  }

  if (effectiveLocationId && result.length) {
    result = result.filter(
      (d: { locationId?: string | null }) => doctorServesLocation(d.locationId ?? null, effectiveLocationId)
    );
  } else if (!isGuest) {
    result = result.filter((d: { locationId?: string | null }) => !!d.locationId);
  }

  return result;
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
  const session = await auth();
  const isGuest = !session?.user;
  let patientRegionId: string | null = null;
  if (session?.user?.role === "PATIENT" && session.user.id) {
    const { data: userRow } = await supabaseAdmin
      .from("User")
      .select("regionId")
      .eq("id", session.user.id)
      .single();
    patientRegionId = (userRow as { regionId?: string | null } | null)?.regionId ?? null;
  }
  const effectiveLocationId = isGuest ? null : (params.locationId ?? patientRegionId);

  const [doctors, specialties] = await Promise.all([
    getDoctors(params, effectiveLocationId, isGuest),
    getSpecialties(),
  ]);

  const activeSpecialty = specialties.find((s) => s.id === params.specialtyId);

  return (
    <div className="bg-gray-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <IconArrowLeft className="h-5 w-5 text-gray-700 dark:text-slate-300" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex-1">البحث عن طبيب</h1>
          </div>

          {/* Search */}
          <form method="get" className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-slate-700 rounded-xl px-3 py-2.5">
              <IconSearch className="h-4 w-4 text-gray-400 dark:text-slate-500 shrink-0" />
              <input
                name="search"
                defaultValue={params.search || ""}
                type="text"
                placeholder="ابحث عن طبيب أو تخصص..."
                className="bg-transparent text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none text-sm w-full"
              />
            </div>
            <button type="submit" className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl text-white hover:bg-blue-700 transition-colors shrink-0">
              <IconFilter className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Specialty Filter Pills */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href="/doctors"
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                !params.specialtyId ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              الكل
            </Link>
            {specialties.map((s) => (
              <Link
                key={s.id}
                href={`/doctors?specialtyId=${s.id}`}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                  params.specialtyId === s.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                }`}
              >
                {s.nameAr}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            <span className="font-semibold text-gray-900 dark:text-slate-100">{doctors.length}</span> طبيب متاح
            {activeSpecialty && <span className="text-blue-600 dark:text-blue-400"> · {activeSpecialty.nameAr}</span>}
          </p>
          <SortSelect
            defaultValue={params.sort}
            specialtyId={params.specialtyId}
            search={params.search}
          />
        </div>

        {doctors.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-2">لم يتم العثور على أطباء</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">جرّب تغيير معايير البحث</p>
            <Link href="/doctors" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              مسح الفلاتر
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {doctors.map((doctor: {
              id: string;
              locationId?: string | null;
              gender?: string | null;
              user?: { name?: string; phone?: string; image?: string | null };
              specialty?: { nameAr?: string };
              consultationFee?: number;
              rating?: number;
              experienceYears?: number;
              clinics?: { address?: string; phone?: string }[];
              reviews?: { length?: number }[];
              whatsapp?: string | null;
            }, idx: number) => {
              const contactNum = doctor.whatsapp || doctor.user?.phone || doctor.clinics?.[0]?.phone;
              const waNum = contactNum ? contactNum.replace(/\D/g, "") : "";
              const regionFullName = doctor.locationId ? getLocationFullName(doctor.locationId) : null;
              const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
              const avatarSrc = getDoctorAvatar(doctor.user?.image, doctor.gender);

              return (
                <div
                  key={doctor.id}
                  className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className={`relative bg-gradient-to-br ${gradient} overflow-hidden`} style={{ height: 160 }}>
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 rounded-full px-1.5 py-0.5 shadow-sm">
                      <IconStar className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[11px] font-bold text-gray-800 dark:text-slate-100">{(doctor.rating ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="absolute top-2 left-2 z-10">
                      <FavoriteButton id={doctor.id} type="doctor" size="sm" />
                    </div>
                    <Link href={`/doctors/${doctor.id}`} className="block h-full relative">
                      <Image
                        src={avatarSrc}
                        alt={doctor.user?.name || "طبيب"}
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                    </Link>
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <Link href={`/doctors/${doctor.id}`} className="block">
                      <h3 className="font-bold text-gray-900 dark:text-slate-100 text-xs leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1">
                        د. {doctor.user?.name}
                      </h3>
                      <span className="inline-block text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full mt-1">
                        {doctor.specialty?.nameAr}
                      </span>
                    </Link>

                    {regionFullName && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <IconMapPin className="h-2.5 w-2.5 text-gray-400 dark:text-slate-500 shrink-0" />
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{regionFullName}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1">
                      <IconClock className="h-2.5 w-2.5 text-gray-400 dark:text-slate-500 shrink-0" />
                      <span className="text-[10px] text-gray-500 dark:text-slate-400">{doctor.experienceYears} سنوات</span>
                    </div>

                    <div className="mt-2 mb-2">
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">₪{doctor.consultationFee}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 mr-1">/ استشارة</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-auto">
                      {waNum.length >= 9 ? (
                        <a
                          href={`https://wa.me/${waNum}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors shrink-0"
                        >
                          <IconMessage className="h-4 w-4" />
                        </a>
                      ) : null}
                      <Link
                        href={`/doctors/${doctor.id}`}
                        className="flex-1 text-center bg-blue-600 text-white text-[11px] font-bold py-2 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        احجز الآن
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
