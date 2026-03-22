import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** لغة الواجهة العربية مع أرقام لاتينية (0–9) في كل المشروع */
export const APP_LOCALE = "ar-SA";

const LATN: Pick<Intl.NumberFormatOptions, "numberingSystem"> = {
  numberingSystem: "latn",
};

/** أرقام بفواصل عربية ونص عربي، لكن الأرقام بصيغة إنجليزية 0–9 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(APP_LOCALE, { ...LATN, ...options }).format(value);
}

export function formatCurrency(amount: number, currency = "ILS") {
  return new Intl.NumberFormat(APP_LOCALE, {
    ...LATN,
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...LATN,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/** تاريخ يوم/شهر/سنة أرقام (مثلاً للإشعارات والرسائل) */
export function formatDateNumeric(date: Date | string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...LATN,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateMedium(date: Date | string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...LATN,
    dateStyle: "medium",
  }).format(new Date(date));
}

/** مثل عرض أيام التخصص في إعدادات الطبيب */
export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    ...LATN,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }
): string {
  return new Intl.DateTimeFormat(APP_LOCALE, { ...LATN, ...options }).format(new Date(date));
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "م" : "ص";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const DAYS_AR = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export const SPECIALTIES_AR: Record<string, string> = {
  general: "طب عام",
  dentist: "طب أسنان",
  pediatrician: "طب أطفال",
  cardiologist: "طب قلب",
  dermatologist: "طب جلدية",
  orthopedic: "جراحة عظام",
  gynecologist: "نسائية وتوليد",
  neurologist: "طب أعصاب",
  ophthalmologist: "طب عيون",
  ent: "أنف وأذن وحنجرة",
  urologist: "طب مسالك بولية",
  psychiatrist: "طب نفسي",
};
