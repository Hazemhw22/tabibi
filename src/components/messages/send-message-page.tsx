"use client";

import { useMemo, useState } from "react";
import IconSend from "@/components/icon/icon-send";
import IconUsersGroup from "@/components/icon/icon-users-group";
import IconUser from "@/components/icon/icon-user";
import IconChecks from "@/components/icon/icon-checks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type FixedTemplate = { id: string; label: string; body: string };

const DEFAULT_FIXED_TEMPLATES: FixedTemplate[] = [
  {
    id: "welcome_platform",
    label: "تهنئة انضمام",
    body: "أهلاً وسهلاً بك في منصة طبيبي 🌿\nتم إنشاء حسابك بنجاح.\nلأي استفسار نحن بالخدمة.",
  },
  {
    id: "booking_confirm",
    label: "تأكيد حجز",
    body: "طبيبي: تم تأكيد حجزك. التاريخ: {{date}} الساعة: {{time}}. شكراً لك.",
  },
  {
    id: "booking_pending",
    label: "طلب حجز",
    body: "طبيبي: تم استلام طلب الحجز وسيتم تأكيده قريباً. التاريخ: {{date}} الساعة: {{time}}.",
  },
  {
    id: "payment_received",
    label: "تأكيد دفعة",
    body: "طبيبي: تم تسجيل دفعة بقيمة ₪{{amount}}. شكراً لك.",
  },
  {
    id: "service_added",
    label: "تسجيل خدمة",
    body: "طبيبي: تم تسجيل خدمة ({{service}}) بقيمة ₪{{amount}}.",
  },
  {
    id: "appointment_reminder",
    label: "تذكير موعد",
    body: "طبيبي: تذكير بموعدك بتاريخ {{date}} الساعة {{time}}. الرجاء الحضور قبل 10 دقائق.",
  },
];

type TargetType = "individual";
type RecipientMode = "manual" | "pick";
type Recipient = { id: string; name: string | null; phone: string | null };

export function SendMessagePage(props: { title: string; subtitle?: string }) {
  const { title, subtitle } = props;
  const [targetType, setTargetType] = useState<TargetType>("individual");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("pick");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [selectedTplId, setSelectedTplId] = useState<string>("other");
  const [sending, setSending] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const templates = DEFAULT_FIXED_TEMPLATES;
  const selectedTpl = templates.find((t) => t.id === selectedTplId) ?? null;

  const estimatedSmsCount = useMemo(() => {
    const len = body.length;
    return Math.max(1, Math.ceil(len / 160));
  }, [body]);

  const chooseTemplate = (id: string) => {
    setSelectedTplId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setBody(tpl.body);
  };

  const loadRecipients = async (opts: { all?: boolean; q?: string } = {}) => {
    const q = (opts.q ?? recipientQuery).trim();
    const all = opts.all === true;
    if (!all && q.length < 2) {
      setRecipients([]);
      return;
    }
    setLoadingRecipients(true);
    try {
      const sp = new URLSearchParams();
      if (all) sp.set("all", "1");
      else sp.set("q", q);
      const res = await fetch(`/api/messages/recipients?${sp.toString()}`, { method: "GET" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل جلب العملاء");
        return;
      }
      setRecipients(Array.isArray(j.recipients) ? (j.recipients as Recipient[]) : []);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const send = async () => {
    if (targetType === "individual" && !to.trim()) {
      toast.error("اختر رقم هاتف أولاً");
      return;
    }
    if (!body.trim()) {
      toast.error("نص الرسالة مطلوب");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), body: body.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "فشل الإرسال");
        return;
      }
      toast.success("تم الإرسال");
      setTo("");
      setBody("");
      setSelectedTplId("other");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IconSend className="h-7 w-7 text-blue-600 shrink-0" />
            {title}
          </h1>
          {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Who */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3">
              1) لمن الإرسال؟
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setTargetType("individual")}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                  targetType === "individual"
                    ? "border-blue-600 bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-700"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}
              >
                <IconUser className="h-6 w-6" />
                <span className="font-semibold">رقم محدد</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecipientMode("pick")}
                className={cn(
                  "px-3 py-2 rounded-full text-xs font-semibold border transition-colors",
                  recipientMode === "pick"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-700"
                )}
              >
                اختيار عميل
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode("manual")}
                className={cn(
                  "px-3 py-2 rounded-full text-xs font-semibold border transition-colors",
                  recipientMode === "manual"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-700"
                )}
              >
                إدخال رقم
              </button>
            </div>

            {recipientMode === "manual" ? (
              <div>
                <Label>رقم الهاتف</Label>
                <Input
                  dir="ltr"
                  className="mt-1"
                  placeholder="0599xxxxxx أو +972..."
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
                <p className="text-[11px] text-gray-500 mt-2">
                  يمكن استخدام المتغيرات داخل النص مثل:{" "}
                  <span className="font-mono">{"{{date}}"}</span>{" "}
                  <span className="font-mono">{"{{time}}"}</span>{" "}
                  <span className="font-mono">{"{{amount}}"}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label>ابحث عن عميل (اسم أو هاتف)</Label>
                    <Input
                      className="mt-1"
                      placeholder="059... أو اسم العميل"
                      value={recipientQuery}
                      onChange={(e) => setRecipientQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void loadRecipients({ all: false, q: (e.target as HTMLInputElement).value });
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loadingRecipients || recipientQuery.trim().length < 2}
                    onClick={() => void loadRecipients({ all: false })}
                    className="gap-2"
                  >
                    بحث
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs font-semibold text-blue-700 dark:text-blue-300"
                    onClick={() => void loadRecipients({ all: true })}
                    disabled={loadingRecipients}
                  >
                    عرض كل العملاء
                  </button>
                  {loadingRecipients && <span className="text-[11px] text-gray-500">جاري التحميل...</span>}
                </div>

                <div className="max-h-64 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  {recipients.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">لا يوجد نتائج</div>
                  ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                      {recipients.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            className="w-full text-right p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 flex items-center justify-between gap-3"
                            onClick={() => {
                              if (!r.phone) {
                                toast.error("هذا العميل لا يملك رقم هاتف");
                                return;
                              }
                              setTo(r.phone);
                              toast.success("تم اختيار العميل");
                            }}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <IconUsersGroup className="h-5 w-5 text-gray-500 shrink-0" />
                              <span className="truncate font-semibold">{r.name || "عميل"}</span>
                            </span>
                            <span className="text-xs text-gray-500 shrink-0" dir="ltr">
                              {r.phone || "—"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3">
              2) ماذا نرسل؟
            </h3>

            <div className="space-y-2">
              <Label>رسائل ثابتة</Label>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseTemplate(t.id)}
                    className={cn(
                      "px-3 py-2 rounded-full text-xs font-semibold border transition-colors",
                      selectedTplId === t.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-700"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTplId("other");
                    setBody("");
                  }}
                  className={cn(
                    "px-3 py-2 rounded-full text-xs font-semibold border transition-colors",
                    selectedTplId === "other"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-200 dark:border-gray-700"
                  )}
                >
                  أخرى
                </button>
              </div>
              {selectedTpl && (
                <p className="text-[11px] text-gray-500 mt-2">
                  تم اختيار: <span className="font-semibold">{selectedTpl.label}</span>
                </p>
              )}
            </div>

            <div>
              <Label>نص الرسالة</Label>
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/40"
                placeholder="اكتب الرسالة هنا..."
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                <span>الأحرف: {body.length}</span>
                <span>عدد الرسائل التقريبي: {estimatedSmsCount}</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void send()}
              disabled={sending || !body.trim() || !to.trim()}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <>جاري الإرسال...</>
              ) : (
                <>
                  <IconSend className="h-5 w-5" />
                  إرسال
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-5 sticky top-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-3">
              المعاينة
            </h3>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4 space-y-2">
              <p className="text-xs text-gray-500">إلى:</p>
              <p className="font-semibold" dir="ltr">{to || "—"}</p>
              <p className="text-xs text-gray-500 mt-3">النص:</p>
              <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-200">{body || "—"}</p>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-500">
                <span>SMS × {estimatedSmsCount}</span>
                <span className="flex items-center gap-1">
                  <IconChecks className="h-4 w-4 text-emerald-600" />
                  جاهز للإرسال
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              تنبيه: إذا ظهر <span className="font-mono">H004|IP Not Allowed</span> فهذا من مزود Astra ويحتاج whitelist
              لعنوان IP الحقيقي للسيرفر.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

