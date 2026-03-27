"use client";

import Image from "next/image";

/** صور تكوّن الجنين حسب الأسبوع (1..40). */
export function PregnancyWeekSvg({ week }: { week: number }) {
  const w = Math.min(Math.max(week, 1), 40);
  const trimester = w <= 13 ? 1 : w <= 27 ? 2 : 3;

  return (
    <div className="w-full max-w-[250px] mx-auto">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Image
          src={`/fetal-weeks/week-${String(w).padStart(2, "0")}.png`}
          alt={`تطور الجنين - الأسبوع ${w}`}
          width={1024}
          height={768}
          className="h-auto w-full object-cover"
          priority={false}
        />
      </div>
      <p className="mt-2 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-300">
        الأسبوع {w} — {trimester === 1 ? "الثلث الأول" : trimester === 2 ? "الثلث الثاني" : "الثلث الثالث"}
      </p>
    </div>
  );
}
