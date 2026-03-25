/** توحيد أرقام الهاتف الفلسطينية (مثل مسار إنشاء الطبيب في المركز) */
export function canonicalPalestinePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const last9 = digits.slice(-9);
  if (last9.length < 9) return "";
  return last9.startsWith("0") ? last9 : `0${last9}`;
}

export function phonesMatchCanonical(a: string, b: string): boolean {
  const ca = canonicalPalestinePhone(a);
  const cb = canonicalPalestinePhone(b);
  if (!ca || !cb) return false;
  return ca === cb;
}
