"use client";

import IconMessage from "@/components/icon/icon-message";

const SUPPORT_PHONE = "972507795580";
const MESSAGE = "مرحباً، أود التواصل مع الدعم الفني";

export function DoctorWhatsAppFloat() {
  const href = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 animate-float"
      title="تواصل معنا"
      aria-label="تواصل معنا عبر واتساب"
    >
      <IconMessage className="h-6 w-6 shrink-0" />
      <span className="text-sm font-medium whitespace-nowrap">تواصل معنا</span>
    </a>
  );
}
