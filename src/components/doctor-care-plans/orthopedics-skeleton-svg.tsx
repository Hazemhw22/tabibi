"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const SKELETON_SRC = "/images/care-plans/orthopedics-skeleton-ar.png";

/**
 * مخطط مرجعي: هيكل عظمي بشري من الأمام مع تسميات عربية (لخطة العظام).
 */
export function OrthopedicsSkeletonSvg({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-amber-200/80 bg-white p-2 dark:border-amber-800/50 dark:bg-slate-950/40",
        className,
      )}
    >
      <p className="mb-1.5 px-1 text-center text-[10px] font-medium text-amber-900/90 dark:text-amber-200/95">
        مرجع تشريحي — الهيكل العظمي (أمامي)
      </p>
      <div className="relative w-full max-w-[min(100%,280px)] overflow-hidden rounded-lg bg-white">
        <Image
          src={SKELETON_SRC}
          alt="مخطط تشريحي للهيكل العظمي البشري من الأمام مع تسميات بالعربية: الجمجمة، العمود الفقري، القفص الصدري، المفاصل، الحوض، الأطراف"
          width={560}
          height={800}
          className="h-auto w-full object-contain object-top"
          sizes="(max-width: 768px) 100vw, 280px"
          priority={false}
          unoptimized
        />
      </div>
      <p className="mt-1.5 max-w-[16rem] px-1 text-center text-[9px] leading-tight text-slate-500 dark:text-slate-400">
        للإرشاد البصري فقط — التشخيص يعتمد على الفحص السريري والتصوير.
      </p>
    </div>
  );
}
