"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  Clock,
  MessageCircle,
  ArrowLeft,
  MapPinOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getStoredRegionId } from "@/components/region/region-modal";
import { getLocationFullName } from "@/data/west-bank-locations";

type Doctor = {
  id: string;
  rating?: number;
  totalReviews?: number;
  consultationFee?: number;
  experienceYears?: number;
  whatsapp?: string | null;
  user?: { name?: string; phone?: string };
  specialty?: { nameAr?: string };
  clinics?: { address?: string; phone?: string }[];
};

function subscribeRegion(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("tabibi-region-changed", onStoreChange);
  return () => window.removeEventListener("tabibi-region-changed", onStoreChange);
}

function getServerRegionSnapshot() {
  return null as string | null;
}

export default function FeaturedDoctorsByRegion() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const regionId = useSyncExternalStore(
    subscribeRegion,
    getStoredRegionId,
    getServerRegionSnapshot
  );
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!regionId) {
        setDoctors([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/doctors/featured?regionId=${encodeURIComponent(regionId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setDoctors(Array.isArray(data.doctors) ? data.doctors : []);
        })
        .catch(() => {
          if (!cancelled) setDoctors([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [isClient, regionId]);

  if (!isClient) {
    return (
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="h-64 flex items-center justify-center text-gray-400">
            جاري التحميل...
          </div>
        </div>
      </section>
    );
  }

  if (!regionId) {
    return (
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                أطباء مميزون
              </h2>
              <p className="text-gray-500">
                اختر منطقتك من الصفحة لرؤية الأطباء في منطقتك
              </p>
            </div>
          </div>
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
            <CardContent className="py-12 flex flex-col items-center justify-center text-center">
              <MapPinOff className="h-14 w-14 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">
                لم يتم اختيار منطقة بعد. اختر منطقتك من أعلى الصفحة (بعد اختيار &quot;مريض&quot;) لرؤية الأطباء المتاحين في منطقتك.
              </p>
              <Link href="/doctors">
                <Button variant="outline" className="gap-2 mt-4">
                  تصفح جميع الأطباء
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-10 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                أطباء مميزون
              </h2>
              <p className="text-gray-500">
                الأطباء الأعلى تقييماً في منطقتك ({getLocationFullName(regionId)})
              </p>
            </div>
          </div>
          <div className="h-48 flex items-center justify-center text-gray-400">
            جاري تحميل الأطباء...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              أطباء مميزون
            </h2>
            <p className="text-gray-500">
              الأطباء الأعلى تقييماً في منطقتك ({getLocationFullName(regionId)})
            </p>
          </div>
          <Link href={`/doctors?locationId=${encodeURIComponent(regionId)}`}>
            <Button variant="outline" className="gap-2">
              عرض الكل
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {doctors.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
            <CardContent className="py-12 text-center text-gray-500">
              <p className="mb-2">لا يوجد أطباء في منطقتك حالياً.</p>
              <Link href="/doctors">
                <Button variant="outline" className="gap-2 mt-2">
                  تصفح الأطباء
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => {
              const contactNum =
                doctor.whatsapp || doctor.user?.phone || doctor.clinics?.[0]?.phone;
              const waNum = contactNum ? contactNum.replace(/\D/g, "") : "";
              return (
                <Card
                  key={doctor.id}
                  className="hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group"
                >
                  <CardContent className="p-6">
                    <Link href={`/doctors/${doctor.id}`} className="block">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
                          {doctor.user?.name?.charAt(0) || "D"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            د. {doctor.user?.name}
                          </h3>
                          <p className="text-sm text-blue-600 font-medium">
                            {doctor.specialty?.nameAr}
                          </p>
                          {doctor.clinics?.[0] && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <p className="text-xs text-gray-500 truncate">
                                {doctor.clinics[0].address}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold text-gray-800">
                          {(doctor.rating ?? 0).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({doctor.totalReviews ?? 0})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {waNum.length >= 9 && (
                          <a
                            href={`https://wa.me/${waNum}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                            title="تواصل عبر واتساب"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </a>
                        )}
                        <div className="text-sm font-semibold text-green-600">
                          ₪{doctor.consultationFee ?? 0}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {(doctor.experienceYears ?? 0)} سنوات
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
