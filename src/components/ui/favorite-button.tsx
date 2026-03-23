"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import IconHeart from "@/components/icon/icon-heart";

const FAV_KEYS = {
  doctor: "fav_doctors",
  center: "fav_centers",
};

export function useFavorite(id: string, type: "doctor" | "center" = "doctor") {
  const key = FAV_KEYS[type];
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      setIsFav(stored.includes(id));
    } catch {}
  }, [id, key]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]") as string[];
      const adding = !stored.includes(id);
      const newFavs = adding ? [...stored, id] : stored.filter((f) => f !== id);
      localStorage.setItem(key, JSON.stringify(newFavs));
      setIsFav(adding);
      if (adding) {
        toast.success("تمت الإضافة إلى المفضلة ❤️", {
          description: "يمكنك عرض مفضلتك من القائمة السفلية",
          duration: 2500,
          action: { label: "عرض المفضلة", onClick: () => { window.location.href = "/favorites"; } },
        });
      } else {
        toast("تمت الإزالة من المفضلة", { duration: 1500 });
      }
    } catch {}
  };

  return { isFav, toggle };
}

export function getFavoriteIds(type: "doctor" | "center" = "doctor"): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEYS[type]) || "[]") as string[];
  } catch {
    return [];
  }
}

export default function FavoriteButton({
  id,
  type = "doctor",
  className = "",
  size = "md",
}: {
  id: string;
  type?: "doctor" | "center";
  className?: string;
  size?: "sm" | "md";
}) {
  const { isFav, toggle } = useFavorite(id, type);
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconDim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={toggle}
      aria-label={isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      className={`flex items-center justify-center ${dim} rounded-full shadow-sm transition-all active:scale-90 ${
        isFav
          ? "bg-red-50 text-red-500 border border-red-200"
          : "bg-white/90 text-gray-400 hover:text-red-400 border border-gray-100"
      } ${className}`}
    >
      <IconHeart
        className={`${iconDim} transition-all ${
          isFav ? "fill-red-500 text-red-500 scale-110" : "fill-none"
        }`}
      />
    </button>
  );
}
