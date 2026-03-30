export function isDentalSpecialtyNameAr(nameAr: string | null | undefined): boolean {
  const n = (nameAr ?? "").toLowerCase();
  return n.includes("أسنان") || n.includes("اسنان") || n.includes("dental");
}

export function isHairSpecialtyNameAr(nameAr: string | null | undefined): boolean {
  const n = (nameAr ?? "").toLowerCase();
  return n.includes("شعر") || n.includes("زراعة الشعر") || n.includes("hair") || n.includes("cosmetic");
}

export function isSkinSpecialtyNameAr(nameAr: string | null | undefined): boolean {
  const n = (nameAr ?? "").toLowerCase();
  return n.includes("جلد") || n.includes("بشرة") || n.includes("ليزر") || n.includes("skin") || n.includes("derm");
}

/** سايدبار الطبيب + حماية API: من يرى العروضات / المنتجات حسب التخصص (nameAr) */
export function doctorMarketplaceNavVisibility(specialtyNameAr: string | null | undefined): {
  offers: boolean;
  products: boolean;
} {
  return {
    offers:
      isDentalSpecialtyNameAr(specialtyNameAr) ||
      isHairSpecialtyNameAr(specialtyNameAr) ||
      isSkinSpecialtyNameAr(specialtyNameAr),
    products: isHairSpecialtyNameAr(specialtyNameAr) || isSkinSpecialtyNameAr(specialtyNameAr),
  };
}
