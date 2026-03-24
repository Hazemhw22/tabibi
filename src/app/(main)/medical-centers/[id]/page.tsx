import Link from "next/link";
import { notFound } from "next/navigation";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconBuilding from "@/components/icon/icon-building";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconPhone from "@/components/icon/icon-phone";
import IconStar from "@/components/icon/icon-star";
import IconShare from "@/components/icon/icon-share";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { auth } from "@/lib/auth";
import FavoriteButton from "@/components/ui/favorite-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("MedicalCenter").select("name, nameAr").eq("id", id).maybeSingle();
  const title = (data as { nameAr?: string; name?: string } | null)?.nameAr || (data as { name?: string } | null)?.name;
  return { title: title ? `${title} | مركز طبي` : "مركز طبي" };
}

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-pink-500",
  "from-orange-400 to-red-500",
];

const DOC_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-red-500",
  "from-cyan-400 to-blue-500",
  "from-rose-400 to-pink-500",
];

export default async function MedicalCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: center, error: cErr } = await supabaseAdmin
    .from("MedicalCenter")
    .select("*")
    .eq("id", id)
    .eq("isActive", true)
    .maybeSingle();

  if (cErr || !center) notFound();

  const { data: doctorsRaw } = await supabaseAdmin
    .from("Doctor")
    .select(`
      id,
      consultationFee,
      patientFeeServiceType,
      visibleToPatients,
      rating,
      experienceYears,
      totalReviews,
      user:User(name),
      specialty:Specialty(nameAr)
    `)
    .eq("medicalCenterId", id)
    .eq("status", "APPROVED")
    .eq("visibleToPatients", true)
    .order("createdAt", { ascending: true });

  const session = await auth();

  type RawDoc = {
    id: string;
    consultationFee?: number | null;
    patientFeeServiceType?: string | null;
    visibleToPatients?: boolean | null;
    rating?: number | null;
    experienceYears?: number | null;
    totalReviews?: number | null;
    user?: { name?: string | null } | { name?: string | null }[] | null;
    specialty?: { nameAr?: string | null } | { nameAr?: string | null }[] | null;
  };

  function normalizeOne<T>(x: T | T[] | null | undefined): T | null {
    if (x == null) return null;
    return Array.isArray(x) ? x[0] ?? null : x;
  }

  const doctors = (doctorsRaw ?? [])
    .filter((d: RawDoc) => d.visibleToPatients !== false)
    .map((d: RawDoc) => {
      const u = normalizeOne(d.user);
      const sp = normalizeOne(d.specialty);
      return {
        id: d.id,
        consultationFee: d.consultationFee ?? 0,
        feeServiceType: d.patientFeeServiceType === "EXAMINATION" ? "EXAMINATION" : "CONSULTATION",
        name: u?.name?.trim() || "طبيب",
        specialtyAr: sp?.nameAr ?? "",
        rating: d.rating ?? 0,
        experienceYears: d.experienceYears ?? 0,
        totalReviews: d.totalReviews ?? 0,
      };
    });

  const centerName = (center as { nameAr?: string; name: string }).nameAr || center.name;
  const colorIdx = parseInt(id.replace(/[^0-9]/g, "0").slice(-1) || "0", 10) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIdx];

  const specialtiesSet = new Set(doctors.map((d) => d.specialtyAr).filter(Boolean));
  const specialtiesList = [...specialtiesSet];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/medical-centers"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
          >
            <IconArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="flex-1 text-center font-bold text-gray-900 text-base">تفاصيل المركز</h1>
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <IconShare className="h-4 w-4 text-gray-700" />
            </button>
            <FavoriteButton id={id} type="center" size="sm" />
          </div>
        </div>
      </div>

      {/* Center Hero Card */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          {/* Color Banner */}
          <div className={`h-28 bg-gradient-to-br ${avatarColor} relative`}>
            <div className="absolute inset-0 bg-black/10" />
          </div>

          {/* Avatar + Info */}
          <div className="px-5 pb-5">
            <div className="flex justify-center -mt-12 mb-4">
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-xl border-4 border-white`}>
                <IconBuilding className="h-10 w-10 text-white" />
              </div>
            </div>

            <h2 className="text-center text-xl font-bold text-gray-900 mb-1">{centerName}</h2>

            <div className="flex items-center justify-center gap-1.5 mb-4 text-sm text-gray-500">
              <IconMapPin className="h-4 w-4 text-blue-500" />
              <span>{(center as { address?: string }).address}، {(center as { city?: string }).city}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-2xl p-3">
              <div className="text-center">
                <div className="text-base font-bold text-gray-900">{doctors.length}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">طبيب</div>
              </div>
              <div className="text-center border-r border-gray-200">
                <div className="text-base font-bold text-gray-900">{specialtiesList.length}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">تخصص</div>
              </div>
              <div className="text-center border-r border-gray-200">
                <div className="text-base font-bold text-gray-900">متاح</div>
                <div className="text-[10px] text-gray-500 mt-0.5">الحالة</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Description */}
        {(center as { description?: string }).description && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">عن المركز</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{(center as { description: string }).description}</p>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">التواصل مع المركز</h3>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-sm shrink-0`}>
              <IconBuilding className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">{centerName}</p>
              <p className="text-xs text-gray-500">مركز طبي</p>
            </div>
            {(center as { phone?: string }).phone && (
              <a
                href={`tel:${(center as { phone: string }).phone}`}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              >
                <IconPhone className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* Specialty filter */}
        {specialtiesList.length > 1 && (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {specialtiesList.map((sp) => (
                <span
                  key={sp}
                  className="shrink-0 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-medium"
                >
                  {sp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Doctors Section */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">أطباء المركز</h3>
          {doctors.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
              <div className="text-4xl mb-2">👨‍⚕️</div>
              <p className="text-gray-500 text-sm">لا يوجد أطباء في هذا المركز</p>
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doctor, idx) => {
                const colorClass = DOC_COLORS[idx % DOC_COLORS.length];
                return (
                  <Link
                    key={doctor.id}
                    href={`/medical-centers/${id}/doctors/${doctor.id}`}
                    className="block"
                  >
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow hover:border-blue-200 group">
                      <div className="p-4 flex gap-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-xl font-bold text-white shadow-sm shrink-0`}>
                          {doctor.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                            د. {doctor.name}
                          </h4>
                          <span className="inline-block text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-0.5">
                            {doctor.specialtyAr}
                          </span>
                          {doctor.experienceYears > 0 && (
                            <p className="text-[11px] text-gray-500 mt-1">خبرة {doctor.experienceYears} سنوات</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-green-600">₪{doctor.consultationFee}</span>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <IconStar className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-600">{(doctor.rating).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 pb-3 border-t border-gray-50 pt-2.5 flex justify-end">
                        <span className="bg-blue-600 text-white text-xs font-medium px-4 py-1.5 rounded-xl group-hover:bg-blue-700 transition-colors">
                          احجز موعد
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
