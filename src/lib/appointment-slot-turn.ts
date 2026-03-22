/**
 * حساب الأدوار المحجوزة ضمن نفس الفترة ليوم واحد، بترتيب الإنشاء:
 * صف له slotTurn يحجز ذلك الرقم؛ صف بدون slotTurn يأخذ أول رقم حر 1..cap
 */
export function buildOccupiedTurnsOrdered(
  rows: { slotTurn: number | null }[],
  cap: number
): Set<number> {
  const used = new Set<number>();
  for (const r of rows) {
    if (r.slotTurn != null && r.slotTurn >= 1 && r.slotTurn <= cap) {
      used.add(r.slotTurn);
    } else {
      let t = 1;
      while (t <= cap && used.has(t)) t++;
      if (t <= cap) used.add(t);
    }
  }
  return used;
}

export function firstFreeSlotTurn(occupied: Set<number>, cap: number): number | null {
  for (let t = 1; t <= cap; t++) {
    if (!occupied.has(t)) return t;
  }
  return null;
}
