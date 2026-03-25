/** أخطاء شائعة عندما جدول الإشعارات غير منشور في Supabase أو اسمه مختلف */
export function isNotificationSchemaMissingError(err: {
  message?: string;
  code?: string;
  details?: string;
} | null): boolean {
  if (!err) return false;
  const m = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
  const c = String(err.code ?? "");
  if (m.includes("could not find the table") && m.includes("notification")) return true;
  if (m.includes("relation") && m.includes("notification") && m.includes("does not exist")) return true;
  if (m.includes("schema cache")) return true;
  if (c === "42P01" || c === "PGRST205") return true;
  return false;
}
