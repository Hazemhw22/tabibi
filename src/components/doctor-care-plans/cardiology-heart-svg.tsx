"use client";

import { cn } from "@/lib/utils";

export type CardiologyZoneId = "heart" | "aorta" | "coronary" | "veins";

export const CARDIO_ZONES: { id: CardiologyZoneId; label: string }[] = [
  { id: "heart", label: "القلب" },
  { id: "aorta", label: "الأبهر والشرايين" },
  { id: "coronary", label: "الشريان التاجي" },
  { id: "veins", label: "الأوردة والدورة" },
];

type Props = {
  selected: CardiologyZoneId | null;
  onSelect: (id: CardiologyZoneId) => void;
  problemIds?: CardiologyZoneId[];
};

/** قلب وشريان أبهر تخطيطي */
export function CardiologyHeartSvg({ selected, onSelect, problemIds = [] }: Props) {
  const pr = (id: CardiologyZoneId) => problemIds.includes(id);
  return (
    <svg viewBox="0 0 160 180" className="w-full max-w-[200px] h-auto mx-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="مخطط القلب والأوعية">
      {/* أبهر */}
      <path
        d="M80 12 L88 40 L72 40 Z"
        className={cn(
          "cursor-pointer stroke-rose-700 stroke-2",
          selected === "aorta" ? "fill-rose-300" : pr("aorta") ? "fill-amber-200" : "fill-rose-100 hover:fill-rose-200",
        )}
        onClick={() => onSelect("aorta")}
      />
      <path
        d="M80 40 Q120 50 130 80 Q125 100 100 110"
        fill="none"
        className={cn(
          "cursor-pointer stroke-2",
          selected === "coronary" ? "stroke-red-600" : pr("coronary") ? "stroke-amber-600" : "stroke-red-300",
        )}
        strokeWidth="6"
        strokeLinecap="round"
        onClick={() => onSelect("coronary")}
      />
      {/* قلب */}
      <path
        d="M80 55 C55 45 40 70 50 95 C55 115 80 130 80 130 C80 130 105 115 110 95 C120 70 105 45 80 55z"
        className={cn(
          "cursor-pointer stroke-red-800 stroke-2",
          selected === "heart" ? "fill-red-300" : pr("heart") ? "fill-amber-200" : "fill-red-100 hover:fill-red-200",
        )}
        onClick={() => onSelect("heart")}
      />
      {/* وريد */}
      <path
        d="M50 75 Q30 90 35 115 Q40 130 55 135"
        fill="none"
        className={cn(
          "cursor-pointer stroke-2",
          selected === "veins" ? "stroke-blue-600" : pr("veins") ? "stroke-amber-600" : "stroke-blue-300",
        )}
        strokeWidth="5"
        strokeLinecap="round"
        onClick={() => onSelect("veins")}
      />
    </svg>
  );
}
