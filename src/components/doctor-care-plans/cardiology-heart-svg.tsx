"use client";

import Image from "next/image";
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
    <div className="relative mx-auto w-full max-w-[220px]" role="img" aria-label="مخطط القلب والأوعية">
      <Image
        src="/heart.svg"
        alt="مخطط القلب"
        width={220}
        height={260}
        className="h-auto w-full select-none"
        priority={false}
      />

      <button
        type="button"
        onClick={() => onSelect("aorta")}
        className={cn(
          "absolute right-[47%] top-[8%] h-7 w-7 -translate-x-1/2 rounded-full border-2 transition",
          selected === "aorta"
            ? "border-rose-600 bg-rose-300/80"
            : pr("aorta")
              ? "border-amber-500 bg-amber-200/80"
              : "border-transparent bg-rose-200/50 hover:border-rose-400",
        )}
        aria-label="الأبهر والشرايين"
      />
      <button
        type="button"
        onClick={() => onSelect("coronary")}
        className={cn(
          "absolute right-[58%] top-[31%] h-8 w-8 rounded-full border-2 transition",
          selected === "coronary"
            ? "border-red-600 bg-red-300/80"
            : pr("coronary")
              ? "border-amber-500 bg-amber-200/80"
              : "border-transparent bg-red-200/45 hover:border-red-400",
        )}
        aria-label="الشريان التاجي"
      />
      <button
        type="button"
        onClick={() => onSelect("heart")}
        className={cn(
          "absolute right-[46%] top-[43%] h-10 w-10 -translate-x-1/2 rounded-full border-2 transition",
          selected === "heart"
            ? "border-red-700 bg-red-300/85"
            : pr("heart")
              ? "border-amber-500 bg-amber-200/85"
              : "border-transparent bg-red-200/45 hover:border-red-500",
        )}
        aria-label="القلب"
      />
      <button
        type="button"
        onClick={() => onSelect("veins")}
        className={cn(
          "absolute right-[38%] top-[57%] h-8 w-8 rounded-full border-2 transition",
          selected === "veins"
            ? "border-blue-600 bg-blue-300/80"
            : pr("veins")
              ? "border-amber-500 bg-amber-200/80"
              : "border-transparent bg-blue-200/45 hover:border-blue-400",
        )}
        aria-label="الأوردة والدورة"
      />
    </div>
  );
}
