import Link from "next/link";

const SUPPORT_WA_DISPLAY = "0507795580";
// wa.me يحتاج رقم دولي بدون +
const SUPPORT_WA_E164_DIGITS = "972507795580";

export function WhatsAppSupportNotice(props: { className?: string; context?: string }) {
  const context = (props.context ?? "").trim();
  const msg = context
    ? `مرحبا، لدي مشكلة في التسجيل (${context}).`
    : "مرحبا، لدي مشكلة في التسجيل.";
  const href = `https://wa.me/${SUPPORT_WA_E164_DIGITS}?text=${encodeURIComponent(msg)}`;

  return (
    <div className={props.className ?? ""}>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="font-semibold">هل تواجه مشكلة في التسجيل؟</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>تواصل واتساب:</span>
          <span dir="ltr" className="font-semibold">{SUPPORT_WA_DISPLAY}</span>
          <Link href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            فتح واتساب
          </Link>
        </div>
      </div>
    </div>
  );
}

