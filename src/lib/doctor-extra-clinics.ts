/**
 * طبيب مرتبط بمركز: عادةً عيادة واحدة ضمن اشتراك المركز.
 * إن كان لديه اشتراك منفصل فعّال في المنصة (شهري/نصف سنوي/خطة مدفوعة) يُعامل مثل المشترك المستقل ويُسمح بعيادات إضافية دون تفعيل canAddExtraClinics يدوياً.
 */
export function doctorHasIndependentPlatformSubscription(doctor: {
  subscriptionPeriod?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionPlan?: string | null;
}): boolean {
  const endRaw = doctor.subscriptionEndDate;
  if (!endRaw) return false;
  const end = new Date(endRaw);
  if (Number.isNaN(end.getTime())) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (end < startOfToday) return false;

  const period = (doctor.subscriptionPeriod ?? "").trim();
  if (period === "monthly" || period === "half_year") return true;

  const plan = doctor.subscriptionPlan;
  if (plan != null && String(plan).trim() !== "") return true;

  return false;
}

export function doctorMayAddExtraClinicsWhileLinkedToCenter(doctor: {
  canAddExtraClinics?: boolean | null;
  subscriptionPeriod?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionPlan?: string | null;
}): boolean {
  if (Boolean(doctor.canAddExtraClinics)) return true;
  return doctorHasIndependentPlatformSubscription(doctor);
}
