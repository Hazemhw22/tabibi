import Link from "next/link";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconBuilding from "@/components/icon/icon-building";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconPhone from "@/components/icon/icon-phone";
import IconSearch from "@/components/icon/icon-search";
import { supabaseAdmin } from "@/lib/supabase-admin";
import FavoriteButton from "@/components/ui/favorite-button";

export const metadata = {
  title: "المراكز الطبية | طبيبي",
  description: "تصفّح المراكز الطبية واحجز عند الأطباء",
};

const CENTER_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-purple-400 to-pink-500",
  "from-orange-400 to-red-500",
  "from-cyan-400 to-blue-500",
  "from-rose-400 to-pink-500",
];

export default async function MedicalCentersPage() {
  const { data: centers, error } = await supabaseAdmin
    .from("MedicalCenter")
    .select("id, name, nameAr, slug, address, city, phone, description")
    .eq("isActive", true)
    .order("name", { ascending: true });

  if (error) console.error(error);
  const list = centers ?? [];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <IconArrowLeft className="h-5 w-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900 flex-1">المراكز الطبية</h1>
          </div>
          {/* Search placeholder */}
          <Link href="/medical-centers" className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <IconSearch className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-gray-400 text-sm">ابحث عن مركز طبي...</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-semibold text-gray-900">{list.length}</span> مركز طبي متاح
        </p>

        {list.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <div className="text-5xl mb-3">🏥</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">لا توجد مراكز</h3>
            <p className="text-gray-400 text-sm">لا توجد مراكز طبية مسجّلة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((c, idx) => {
              const colorClass = CENTER_COLORS[idx % CENTER_COLORS.length];
              const initial = ((c as { nameAr?: string; name: string }).nameAr || c.name)?.charAt(0) || "م";
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 flex gap-4">
                    {/* Icon */}
                    <div className="relative shrink-0">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-sm`}>
                        <IconBuilding className="h-7 w-7 text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/medical-centers/${c.id}`} className="block flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                            {(c as { nameAr?: string; name: string }).nameAr || c.name}
                          </h3>
                        </Link>
                        <FavoriteButton id={c.id} type="center" size="sm" />
                      </div>

                      <div className="flex items-center gap-1 mt-1.5">
                        <IconMapPin className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="text-[11px] text-gray-500 truncate">
                          {(c as { address?: string }).address}، {(c as { city?: string }).city}
                        </span>
                      </div>

                      {(c as { phone?: string }).phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <IconPhone className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-[11px] text-gray-400 dir-ltr">{(c as { phone?: string }).phone}</span>
                        </div>
                      )}

                      {(c as { description?: string }).description && (
                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                          {(c as { description?: string }).description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom */}
                  <div className="px-4 pb-4 flex items-center justify-end border-t border-gray-50 pt-3">
                    <Link
                      href={`/medical-centers/${c.id}`}
                      className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      عرض الأطباء
                    </Link>
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
