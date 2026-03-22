"use client";

import { cn } from "@/lib/utils";

export type PediatricOrganId =
  | "head"
  | "chest"
  | "abdomen"
  | "pelvis"
  | "arm_r"
  | "arm_l"
  | "leg_r"
  | "leg_l";

export const PEDIATRIC_ORGANS: { id: PediatricOrganId; label: string }[] = [
  { id: "head", label: "الرأس" },
  { id: "chest", label: "الصدر" },
  { id: "abdomen", label: "البطن" },
  { id: "pelvis", label: "الحوض" },
  { id: "arm_r", label: "الذراع يمين" },
  { id: "arm_l", label: "الذراع يسار" },
  { id: "leg_r", label: "الرجل يمين" },
  { id: "leg_l", label: "الرجل يسار" },
];

type Props = {
  selected: PediatricOrganId | null;
  onSelect: (id: PediatricOrganId) => void;
  highlightIds?: PediatricOrganId[];
};

/** مخطط طفل تخطيطي — مناطق قابلة للنقر */
export function PediatricsBodySvg({ selected, onSelect, highlightIds = [] }: Props) {
  const hi = (id: PediatricOrganId) => highlightIds.includes(id);
  const sel = (id: PediatricOrganId) => selected === id;

  const path = (id: PediatricOrganId, d: string) => (
    <path
      d={d}
      onClick={() => onSelect(id)}
      className={cn(
        "cursor-pointer transition-colors stroke-gray-600 stroke-[1.5]",
        sel(id) ? "fill-blue-200" : hi(id) ? "fill-amber-100" : "fill-gray-100 hover:fill-blue-50",
      )}
    />
  );

  return (
    <svg viewBox="0 0 120 200" className="w-full max-w-[140px] h-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="مخطط جسم الطفل">
      {/* رأس */}
      {path("head", "M60 18c10 0 18 8 18 18s-8 18-18 18-18-8-18-18 8-18 18-18z")}
      {/* صدر */}
      {path("chest", "M35 56h50l8 32H27l8-32z")}
      {/* بطن */}
      {path("abdomen", "M30 90h60v28H30z")}
      {/* حوض */}
      {path("pelvis", "M32 120h56l6 16H26l6-16z")}
      {/* ذراع يمين (للمشاهد) يسار الرسم */}
      {path("arm_l", "M27 58 L12 88 L18 92 L32 64z")}
      {path("arm_r", "M93 58 L108 88 L102 92 L88 64z")}
      {/* رجلين */}
      {path("leg_l", "M42 138 L38 188 L48 190 L52 140z")}
      {path("leg_r", "M78 138 L82 188 L72 190 L68 140z")}
    </svg>
  );
}
