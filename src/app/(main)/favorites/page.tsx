"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import IconHeart from "@/components/icon/icon-heart";
import IconStar from "@/components/icon/icon-star";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconClock from "@/components/icon/icon-clock";
import IconBuilding from "@/components/icon/icon-building";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconLoader from "@/components/icon/icon-loader";
import FavoriteButton from "@/components/ui/favorite-button";

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-pink-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-red-500",
  "from-cyan-400 to-blue-500",
];

type DoctorData = {
  id: string;
  rating: number;
  consultationFee: number;
  experienceYears: number;
  locationId?: string | null;
  totalReviews?: number;
  user?: { name?: string };
  specialty?: { nameAr?: string };
  clinics?: { address?: string }[];
};

type CenterData = {
  id: string;
  name: string;
  nameAr?: string;
  address?: string;
  city?: string;
  phone?: string;
};

function getFavIds(type: "doctor" | "center"): string[] {
  try {
    const key = type === "doctor" ? "fav_doctors" : "fav_centers";
    return JSON.parse(localStorage.getItem(key) || "[]") as string[];
  } catch { return []; }
}

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<"doctors" | "centers">("doctors");
  const [doctors, setDoctors] = useState<DoctorData[]>([]);
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const [docIds, centerIds] = [getFavIds("doctor"), getFavIds("center")];

      const [docsRes, centersRes] = await Promise.all([
        docIds.length ? fetch(`/api/public/doctors?ids=${docIds.join(",")}`) : Promise.resolve(null),
        centerIds.length ? fetch(`/api/public/centers?ids=${centerIds.join(",")}`) : Promise.resolve(null),
      ]);

      const [docsData, centersData] = await Promise.all([
        docsRes ? docsRes.json() : [],
        centersRes ? centersRes.json() : [],
      ]);

      setDoctors(docsData);
      setCenters(centersData);
    } catch {
      setDoctors([]);
      setCenters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
              <IconArrowLeft className="h-5 w-5 text-gray-700" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900 flex-1 flex items-center gap-2">
              <IconHeart className="h-5 w-5 fill-red-500 text-red-500" />
              المفضلة
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("doctors")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "doctors"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              الأطباء ({doctors.length})
            </button>
            <button
              onClick={() => setActiveTab("centers")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "centers"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              المراكز ({centers.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : activeTab === "doctors" ? (
          doctors.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl">
              <div className="text-5xl mb-3">❤️</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">لا يوجد أطباء مفضلون</h3>
              <p className="text-gray-400 text-sm mb-5">اضغط على أيقونة القلب على بطاقة الطبيب لإضافته</p>
              <Link href="/doctors" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                تصفح الأطباء
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doctor, idx) => {
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initial = doctor.user?.name?.charAt(0) || "د";
                return (
                  <div key={doctor.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 flex gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-xl font-bold text-white shadow-sm shrink-0`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/doctors/${doctor.id}`} className="block flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                              د. {doctor.user?.name}
                            </h3>
                            <span className="inline-block text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-0.5">
                              {doctor.specialty?.nameAr}
                            </span>
                          </Link>
                          <FavoriteButton id={doctor.id} type="doctor" size="sm" />
                        </div>

                        {doctor.clinics?.[0]?.address && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <IconMapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="text-[11px] text-gray-500 truncate">{doctor.clinics[0].address}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 mt-1">
                          <IconClock className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-[11px] text-gray-500">خبرة {doctor.experienceYears} سنوات</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <IconStar className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold text-gray-800">{(doctor.rating ?? 0).toFixed(1)}</span>
                          <span className="text-[11px] text-gray-400">({doctor.totalReviews ?? 0})</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">₪{doctor.consultationFee}</span>
                      </div>
                      <Link
                        href={`/doctors/${doctor.id}`}
                        className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        احجز موعد
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          centers.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl">
              <div className="text-5xl mb-3">🏥</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد مراكز مفضلة</h3>
              <p className="text-gray-400 text-sm mb-5">اضغط على أيقونة القلب لإضافة مركز</p>
              <Link href="/medical-centers" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                تصفح المراكز
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {centers.map((center, idx) => {
                const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                return (
                  <div key={center.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-4 flex gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0`}>
                        <IconBuilding className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/medical-centers/${center.id}`} className="block flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                              {center.nameAr || center.name}
                            </h3>
                          </Link>
                          <FavoriteButton id={center.id} type="center" size="sm" />
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <IconMapPin className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-[11px] text-gray-500 truncate">
                            {center.address}، {center.city}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3 flex justify-end">
                      <Link
                        href={`/medical-centers/${center.id}`}
                        className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        عرض الأطباء
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
