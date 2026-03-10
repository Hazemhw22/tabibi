/**
 * مدن وقرى الضفة الغربية - للاختيار عند التسجيل والفلترة
 * المصدر: محافظات ومدن السلطة الفلسطينية في الضفة الغربية
 */

export type LocationItem = {
  id: string;
  governorateAr: string;
  nameAr: string;
  /** محافظة | مدينة | قرية */
  type: "governorate" | "city" | "village";
};

/** قائمة المحافظات والمدن والقرى في الضفة الغربية */
export const WEST_BANK_LOCATIONS: LocationItem[] = [
  // ========== محافظة جنين ==========
  { id: "jenin", governorateAr: "جنين", nameAr: "جنين", type: "governorate" },
  { id: "jenin-city", governorateAr: "جنين", nameAr: "جنين", type: "city" },
  { id: "jenin-yaabad", governorateAr: "جنين", nameAr: "يعبد", type: "village" },
  { id: "jenin-araba", governorateAr: "جنين", nameAr: "عرابة", type: "village" },
  { id: "jenin-silat", governorateAr: "جنين", nameAr: "سيلة الحارثية", type: "village" },
  { id: "jenin-kufr-raei", governorateAr: "جنين", nameAr: "كفر راعي", type: "village" },
  { id: "jenin-jaba", governorateAr: "جنين", nameAr: "جبع", type: "village" },
  { id: "jenin-telfit", governorateAr: "جنين", nameAr: "تفوح", type: "village" },
  { id: "jenin-barta", governorateAr: "جنين", nameAr: "برطعة", type: "village" },
  { id: "jenin-tammun", governorateAr: "جنين", nameAr: "طمون", type: "village" },
  { id: "jenin-aqaba", governorateAr: "جنين", nameAr: "عقابة", type: "village" },
  // ========== محافظة طوباس ==========
  { id: "tubas", governorateAr: "طوباس والأغوار", nameAr: "طوباس والأغوار", type: "governorate" },
  { id: "tubas-city", governorateAr: "طوباس والأغوار", nameAr: "طوباس", type: "city" },
  { id: "tubas-tammun", governorateAr: "طوباس والأغوار", nameAr: "طمون", type: "village" },
  { id: "tubas-aqaba", governorateAr: "طوباس والأغوار", nameAr: "عقابة", type: "village" },
  // ========== محافظة طولكرم ==========
  { id: "tulkarm", governorateAr: "طولكرم", nameAr: "طولكرم", type: "governorate" },
  { id: "tulkarm-city", governorateAr: "طولكرم", nameAr: "طولكرم", type: "city" },
  { id: "tulkarm-qalqilya", governorateAr: "طولكرم", nameAr: "عنبتا", type: "village" },
  { id: "tulkarm-balaa", governorateAr: "طولكرم", nameAr: "بلعا", type: "village" },
  { id: "tulkarm-attil", governorateAr: "طولكرم", nameAr: "عتيل", type: "village" },
  { id: "tulkarm-shweika", governorateAr: "طولكرم", nameAr: "شويكة", type: "village" },
  { id: "tulkarm-deir-al-ghusun", governorateAr: "طولكرم", nameAr: "دير الغصون", type: "village" },
  // ========== محافظة نابلس ==========
  { id: "nablus", governorateAr: "نابلس", nameAr: "نابلس", type: "governorate" },
  { id: "nablus-city", governorateAr: "نابلس", nameAr: "نابلس", type: "city" },
  { id: "nablus-sabastiya", governorateAr: "نابلس", nameAr: "سبسطية", type: "village" },
  { id: "nablus-beit-furik", governorateAr: "نابلس", nameAr: "بيت فوريك", type: "village" },
  { id: "nablus-beit-dajan", governorateAr: "نابلس", nameAr: "بيت دجن", type: "village" },
  { id: "nablus-burin", governorateAr: "نابلس", nameAr: "بورين", type: "village" },
  { id: "nablus-huwwara", governorateAr: "نابلس", nameAr: "حوارة", type: "village" },
  { id: "nablus-aqraba", governorateAr: "نابلس", nameAr: "عقربة", type: "village" },
  { id: "nablus-madama", governorateAr: "نابلس", nameAr: "مادما", type: "village" },
  { id: "nablus-osarin", governorateAr: "نابلس", nameAr: "أسارين", type: "village" },
  { id: "nablus-jalame", governorateAr: "نابلس", nameAr: "جلمة", type: "village" },
  // ========== محافظة قلقيلية ==========
  { id: "qalqilya", governorateAr: "قلقيلية", nameAr: "قلقيلية", type: "governorate" },
  { id: "qalqilya-city", governorateAr: "قلقيلية", nameAr: "قلقيلية", type: "city" },
  { id: "qalqilya-habla", governorateAr: "قلقيلية", nameAr: "حبلة", type: "village" },
  { id: "qalqilya-azun", governorateAr: "قلقيلية", nameAr: "عزون", type: "village" },
  { id: "qalqilya-kafr-thulth", governorateAr: "قلقيلية", nameAr: "كفر ثلث", type: "village" },
  { id: "qalqilya-jayyus", governorateAr: "قلقيلية", nameAr: "جيّوس", type: "village" },
  // ========== محافظة سلفيت ==========
  { id: "salfit", governorateAr: "سلفيت", nameAr: "سلفيت", type: "governorate" },
  { id: "salfit-city", governorateAr: "سلفيت", nameAr: "سلفيت", type: "city" },
  { id: "salfit-kifl-hares", governorateAr: "سلفيت", nameAr: "كفل حارس", type: "village" },
  { id: "salfit-bruqin", governorateAr: "سلفيت", nameAr: "بروقين", type: "village" },
  { id: "salfit-marda", governorateAr: "سلفيت", nameAr: "مردة", type: "village" },
  { id: "salfit-ariel", governorateAr: "سلفيت", nameAr: "أريئيل", type: "village" },
  // ========== محافظة رام الله والبيرة ==========
  { id: "ramallah", governorateAr: "رام الله والبيرة", nameAr: "رام الله والبيرة", type: "governorate" },
  { id: "ramallah-city", governorateAr: "رام الله والبيرة", nameAr: "رام الله", type: "city" },
  { id: "ramallah-bireh", governorateAr: "رام الله والبيرة", nameAr: "البيرة", type: "city" },
  { id: "ramallah-beitunia", governorateAr: "رام الله والبيرة", nameAr: "بيتونيا", type: "village" },
  { id: "ramallah-silwad", governorateAr: "رام الله والبيرة", nameAr: "سلواد", type: "village" },
  { id: "ramallah-abud", governorateAr: "رام الله والبيرة", nameAr: "عابود", type: "village" },
  { id: "ramallah-beitin", governorateAr: "رام الله والبيرة", nameAr: "بتين", type: "village" },
  { id: "ramallah-birzeit", governorateAr: "رام الله والبيرة", nameAr: "بيرزيت", type: "village" },
  { id: "ramallah-turmusaya", governorateAr: "رام الله والبيرة", nameAr: "ترمسعيا", type: "village" },
  { id: "ramallah-nilin", governorateAr: "رام الله والبيرة", nameAr: "نعلين", type: "village" },
  { id: "ramallah-kobar", governorateAr: "رام الله والبيرة", nameAr: "كوبر", type: "village" },
  // ========== محافظة أريحا ==========
  { id: "jericho", governorateAr: "أريحا والأغوار", nameAr: "أريحا والأغوار", type: "governorate" },
  { id: "jericho-city", governorateAr: "أريحا والأغوار", nameAr: "أريحا", type: "city" },
  { id: "jericho-aqabat-jabr", governorateAr: "أريحا والأغوار", nameAr: "عقبة جبر", type: "village" },
  { id: "jericho-nuweimeh", governorateAr: "أريحا والأغوار", nameAr: "النويعة", type: "village" },
  // ========== محافظة القدس ==========
  { id: "jerusalem", governorateAr: "القدس", nameAr: "القدس", type: "governorate" },
  { id: "jerusalem-city", governorateAr: "القدس", nameAr: "القدس", type: "city" },
  { id: "jerusalem-abu-dis", governorateAr: "القدس", nameAr: "أبو ديس", type: "village" },
  { id: "jerusalem-al-eizariya", governorateAr: "القدس", nameAr: "العيزرية", type: "village" },
  { id: "jerusalem-beit-hanina", governorateAr: "القدس", nameAr: "بيت حنينا", type: "village" },
  { id: "jerusalem-silwan", governorateAr: "القدس", nameAr: "سلوان", type: "village" },
  { id: "jerusalem-ram", governorateAr: "القدس", nameAr: "الرام", type: "village" },
  // ========== محافظة بيت لحم ==========
  { id: "bethlehem", governorateAr: "بيت لحم", nameAr: "بيت لحم", type: "governorate" },
  { id: "bethlehem-city", governorateAr: "بيت لحم", nameAr: "بيت لحم", type: "city" },
  { id: "bethlehem-beit-jala", governorateAr: "بيت لحم", nameAr: "بيت جالا", type: "city" },
  { id: "bethlehem-beit-sahour", governorateAr: "بيت لحم", nameAr: "بيت ساحور", type: "city" },
  { id: "bethlehem-al-khader", governorateAr: "بيت لحم", nameAr: "الخضر", type: "village" },
  { id: "bethlehem-teqoa", governorateAr: "بيت لحم", nameAr: "تقوع", type: "village" },
  { id: "bethlehem-nahalin", governorateAr: "بيت لحم", nameAr: "نحالين", type: "village" },
  { id: "bethlehem-husan", governorateAr: "بيت لحم", nameAr: "حوسان", type: "village" },
  { id: "bethlehem-battir", governorateAr: "بيت لحم", nameAr: "بتير", type: "village" },
  // ========== محافظة الخليل ==========
  { id: "hebron", governorateAr: "الخليل", nameAr: "الخليل", type: "governorate" },
  { id: "hebron-city", governorateAr: "الخليل", nameAr: "الخليل", type: "city" },
  { id: "hebron-yatta", governorateAr: "الخليل", nameAr: "يطا", type: "city" },
  { id: "hebron-dura", governorateAr: "الخليل", nameAr: "دورا", type: "city" },
  { id: "hebron-halhul", governorateAr: "الخليل", nameAr: "حلحول", type: "village" },
  { id: "hebron-bani-naim", governorateAr: "الخليل", nameAr: "بني نعيم", type: "village" },
  { id: "hebron-samu", governorateAr: "الخليل", nameAr: "السموع", type: "village" },
  { id: "hebron-dahriya", governorateAr: "الخليل", nameAr: "الداهنية", type: "village" },
  { id: "hebron-sair", governorateAr: "الخليل", nameAr: "السائر", type: "village" },
  { id: "hebron-taffuh", governorateAr: "الخليل", nameAr: "تفوح", type: "village" },
  { id: "hebron-idhna", governorateAr: "الخليل", nameAr: "إذنا", type: "village" },
  { id: "hebron-surif", governorateAr: "الخليل", nameAr: "صوريف", type: "village" },
  { id: "hebron-beit-ummar", governorateAr: "الخليل", nameAr: "بيت أمر", type: "village" },
  { id: "hebron-tarqumiya", governorateAr: "الخليل", nameAr: "ترقوميا", type: "village" },
];

/** المحافظات فقط (للاختيار السريع) */
export const GOVERNORATES = WEST_BANK_LOCATIONS.filter((l) => l.type === "governorate");

/** الحصول على موقع بالمعرف */
export function getLocationById(id: string): LocationItem | undefined {
  return WEST_BANK_LOCATIONS.find((l) => l.id === id);
}

/** اسم المنطقة كاملاً للعرض (مثل: محافظة نابلس، أو نابلس - نابلس، أو يعبد - جنين) */
export function getLocationFullName(id: string): string {
  const loc = getLocationById(id);
  if (!loc) return id;
  if (loc.type === "governorate") return `محافظة ${loc.nameAr}`;
  return `${loc.nameAr}، ${loc.governorateAr}`;
}

/** المواقع التابعة لمحافظة (نفس المحافظة) */
export function getLocationsByGovernorate(governorateAr: string): LocationItem[] {
  return WEST_BANK_LOCATIONS.filter((l) => l.governorateAr === governorateAr);
}

/** هل الموقعين في نفس المحافظة؟ */
export function isSameGovernorate(locationIdA: string | null, locationIdB: string | null): boolean {
  if (!locationIdA || !locationIdB) return false;
  const a = getLocationById(locationIdA);
  const b = getLocationById(locationIdB);
  return a?.governorateAr === b?.governorateAr;
}

/** هل الطبيب يخدم الموقع المختار؟ (نفس الموقع أو نفس المحافظة). الطبيب بدون موقع لا يظهر للمريض. */
export function doctorServesLocation(doctorLocationId: string | null, selectedLocationId: string): boolean {
  if (!doctorLocationId) return false; // من لم يحدد الطبيب موقعاً لا يظهر للمريض
  const doc = getLocationById(doctorLocationId);
  const sel = getLocationById(selectedLocationId);
  if (!doc || !sel) return false;
  if (doc.id === sel.id) return true;
  if (doc.governorateAr === sel.governorateAr) return true;
  if (sel.type === "governorate") return doc.governorateAr === sel.governorateAr;
  return false;
}

/** ربط أسماء مدن بالإنجليزي من reverse geocoding بمعرف المحافظة */
const GEO_TO_LOCATION_ID: Record<string, string> = {
  hebron: "hebron",
  al_khalil: "hebron",
  khalil: "hebron",
  nablus: "nablus",
  ramallah: "ramallah",
  al_bireh: "ramallah",
  bireh: "ramallah",
  bethlehem: "bethlehem",
  bayt_lahm: "bethlehem",
  jericho: "jericho",
  ariha: "jericho",
  jenin: "jenin",
  tulkarm: "tulkarm",
  tul_karm: "tulkarm",
  qalqilya: "qalqilya",
  qalqilia: "qalqilya",
  salfit: "salfit",
  tubas: "tubas",
  jerusalem: "jerusalem",
  al_quds: "jerusalem",
};

/** اقتراح موقع من اسم مكان (من reverse geocoding) */
export function suggestLocationIdFromPlaceName(placeName: string): string | null {
  const normalized = placeName.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  for (const [key, id] of Object.entries(GEO_TO_LOCATION_ID)) {
    if (normalized.includes(key)) return id;
  }
  const byNameAr = WEST_BANK_LOCATIONS.find(
    (l) => l.nameAr === placeName || l.governorateAr === placeName
  );
  return byNameAr?.id ?? null;
}
