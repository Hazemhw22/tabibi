"use client";

/** رسم توضيحي بسيط يتغير حسب مرحلة الحمل (تقريبي — يمكن استبداله بصور أسبوعية لاحقاً). */
export function PregnancyWeekSvg({ week }: { week: number }) {
  const w = Math.min(Math.max(week, 1), 42);
  const trimester = w <= 13 ? 1 : w <= 27 ? 2 : 3;
  const fill = trimester === 1 ? "#fce7f3" : trimester === 2 ? "#ddd6fe" : "#bfdbfe";

  return (
    <svg viewBox="0 0 200 240" className="w-full max-w-[200px] h-auto mx-auto" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="pwGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="#fff" />
        </linearGradient>
      </defs>
      <rect width="200" height="240" rx="12" fill="url(#pwGrad)" stroke="#e5e7eb" />
      <text x="100" y="28" textAnchor="middle" className="fill-gray-700 text-[11px] font-semibold">
        الأسبوع {w}
      </text>
      {/* رحم مبسّط */}
      <ellipse cx="100" cy="120" rx={45 + Math.min(w, 20) * 0.4} ry={55 + Math.min(w, 20) * 0.35} fill="#fda4af" opacity="0.35" stroke="#fb7185" strokeWidth="2" />
      <ellipse cx="100" cy="125" rx={18 + w * 0.15} ry={22 + w * 0.12} fill="#fb7185" opacity="0.5" />
      <text x="100" y="210" textAnchor="middle" className="fill-gray-500 text-[10px]">
        {trimester === 1 ? "الثلث الأول" : trimester === 2 ? "الثلث الثاني" : "الثلث الثالث"}
      </text>
    </svg>
  );
}
