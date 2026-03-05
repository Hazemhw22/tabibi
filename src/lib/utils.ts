import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ILS") {
  return new Intl.NumberFormat("ar-PS", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("ar-PS", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
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
