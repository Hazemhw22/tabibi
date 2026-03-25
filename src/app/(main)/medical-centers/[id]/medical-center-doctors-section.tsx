"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import IconStar from "@/components/icon/icon-star";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconClock from "@/components/icon/icon-clock";
import IconMessage from "@/components/icon/icon-message";
import FavoriteButton from "@/components/ui/favorite-button";
import { cn } from "@/lib/utils";
import { CENTER_ACCENT_GRADIENT } from "./center-theme";

export type CenterDoctorForList = {
  id: string;
  consultationFee: number;
  feeServiceType: "EXAMINATION" | "CONSULTATION";
  name: string;
  specialtyAr: string;
  rating: number;
  experienceYears: number;
  totalReviews: number;
  avatarSrc: string;
  locationLabel: string | null;
  waDigits: string;
};

function feeLabel(type: CenterDoctorForList["feeServiceType"]) {
  return type === "EXAMINATION" ? "كشف" : "استشارة";
}

function doctorHref(centerId: string, doctorId: string) {
  return `/medical-centers/${centerId}/doctors/${doctorId}`;
}

export default function MedicalCenterDoctorsSection({
  centerId,
  doctors,
}: {
  centerId: string;
  doctors: CenterDoctorForList[];
}) {
  const specialties = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialtyAr?.trim()) set.add(d.specialtyAr.trim());
    });
    return [...set].sort((a, b) => a.localeCompare(b, "ar"));
  }, [doctors]);

  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeSpecialty) return doctors;
    return doctors.filter((d) => (d.specialtyAr ?? "").trim() === activeSpecialty);
  }, [doctors, activeSpecialty]);

  if (doctors.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-white/80 px-6 py-14 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
          👨‍⚕️
        </div>
        <p className="text-sm font-medium text-slate-600">لا يوجد أطباء معتمدون في هذا المركز حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <div
          className="-mx-1 flex touch-pan-x gap-2 overflow-x-auto px-1 pb-1 pt-0.5 scrollbar-hide snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <button
            type="button"
            onClick={() => setActiveSpecialty(null)}
            className={cn(
              "snap-start shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              activeSpecialty === null
                ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                : "border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
            )}
          >
            الكل
          </button>
          {specialties.map((sp) => {
            const selected = activeSpecialty === sp;
            return (
              <button
                key={sp}
                type="button"
                onClick={() => setActiveSpecialty(sp)}
                className={cn(
                  "snap-start max-w-[85vw] shrink-0 truncate rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                  selected
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                    : "border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50"
                )}
              >
                {sp}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-center text-sm text-amber-900">
          لا يوجد أطباء ضمن هذا التخصص. اختر «الكل» أو تخصصاً آخر.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((doctor) => {
            const href = doctorHref(centerId, doctor.id);
            const waOk = doctor.waDigits.length >= 9;
            return (
              <div
                key={doctor.id}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md shadow-slate-200/60 transition-all hover:border-emerald-200/90 hover:shadow-lg hover:shadow-emerald-500/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:hover:border-emerald-800/60"
              >
                {/* رأس بنفس تدرج هوية المركز + صورة */}
                <div
                  className={cn(
                    "relative h-[132px] shrink-0 overflow-hidden bg-gradient-to-br sm:h-[152px]",
                    CENTER_ACCENT_GRADIENT
                  )}
                >
                  <Link href={href} className="relative block h-full w-full">
                    <Image
                      src={doctor.avatarSrc}
                      alt={doctor.name}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 45vw, 200px"
                      unoptimized
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-emerald-950/35 via-teal-950/10 to-transparent" />
                  <div className="absolute top-2 start-2 z-10 pointer-events-auto">
                    <FavoriteButton id={doctor.id} type="doctor" size="sm" className="!bg-white/95 !shadow-md" />
                  </div>
                  <div className="absolute top-2 end-2 z-10 flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-0.5 shadow-md dark:bg-slate-800/95">
                    <IconStar className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                    <span className="text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
                      {doctor.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                  <Link href={href} className="block min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-xs">
                        د. {doctor.name}
                      </h3>
                      <span className="max-w-[46%] shrink-0 truncate rounded-full bg-teal-50 px-2 py-0.5 text-center text-[9px] font-semibold text-teal-900 ring-1 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-100 dark:ring-teal-800/50 sm:text-[10px]">
                        {doctor.specialtyAr || "تخصص عام"}
                      </span>
                    </div>
                  </Link>

                  {doctor.experienceYears > 0 ? (
                    <div className="mt-1.5 flex items-center gap-1">
                      <IconClock className="h-2.5 w-2.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 sm:text-[10px]">
                        {doctor.experienceYears} سنوات
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-2 mb-2 flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      {doctor.locationLabel ? (
                        <>
                          <IconMapPin className="h-2.5 w-2.5 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" />
                          <span className="truncate text-[9px] leading-tight text-slate-500 dark:text-slate-400 sm:text-[10px]">
                            {doctor.locationLabel}
                          </span>
                        </>
                      ) : (
                        <span className="min-h-[1em] flex-1" aria-hidden />
                      )}
                    </div>
                    <div className="flex shrink-0 items-baseline gap-0.5 whitespace-nowrap">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ₪{doctor.consultationFee}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 sm:text-[10px]">
                        / {feeLabel(doctor.feeServiceType)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto flex items-stretch gap-1.5 pt-0.5">
                    {waOk ? (
                      <a
                        href={`https://wa.me/${doctor.waDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
                        aria-label="واتساب"
                      >
                        <IconMessage className="h-4 w-4" />
                      </a>
                    ) : null}
                    <Link
                      href={href}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-xl bg-emerald-600 py-2 text-center text-[10px] font-bold text-white shadow-md shadow-emerald-600/25 transition-colors hover:bg-emerald-700 sm:text-[11px]",
                        !waOk && "w-full"
                      )}
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
  );
}
