"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type LookupPatientUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type Props = {
  whatsapp: string;
  onWhatsappChange: (v: string) => void;
  onSelectUser: (u: LookupPatientUser) => void;
  existingUserId: string | null;
  onClearExistingUser: () => void;
  label?: string;
  placeholder?: string;
};

export function ClinicPatientPhoneLookupField({
  whatsapp,
  onWhatsappChange,
  onSelectUser,
  existingUserId,
  onClearExistingUser,
  label = "رقم الهاتف",
  placeholder = "0599xxxxxx (لإرسال رسائل SMS للدفعات والديون)",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<LookupPatientUser[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const digits = whatsapp.replace(/\D/g, "");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (digits.length < 9) {
      setMatches(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/clinic/patients/lookup-user?phone=${encodeURIComponent(whatsapp.trim())}`,
        );
        const data = await res.json();
        setMatches(Array.isArray(data.users) ? data.users : []);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [whatsapp]);

  const handleChange = (v: string) => {
    onWhatsappChange(v);
    onClearExistingUser();
  };

  const showNoMatchHint =
    !loading &&
    matches &&
    matches.length === 0 &&
    whatsapp.replace(/\D/g, "").length >= 9;

  return (
    <div className="space-y-2">
      <Input
        label={label}
        placeholder={placeholder}
        value={whatsapp}
        onChange={(e) => handleChange(e.target.value)}
        dir="ltr"
      />
      {loading && (
        <p className="text-xs text-gray-500">جاري البحث عن حساب على المنصة...</p>
      )}
      {!loading && matches && matches.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/80 p-2 text-right">
          <p className="mb-1.5 text-xs font-medium text-blue-900">
            يوجد حساب بهذا الرقم — اختر لملء الاسم والبريد تلقائياً:
          </p>
          <ul className="space-y-1">
            {matches.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => onSelectUser(u)}
                  className={cn(
                    "w-full rounded-md border px-2 py-1.5 text-right text-sm transition-colors",
                    existingUserId === u.id
                      ? "border-blue-600 bg-white text-blue-900"
                      : "border-transparent bg-white/80 hover:bg-white",
                  )}
                >
                  <span className="font-medium">{u.name || "بدون اسم"}</span>
                  {u.email ? (
                    <span className="mr-2 text-xs text-gray-600" dir="ltr">
                      {u.email}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showNoMatchHint && (
        <p className="text-xs text-gray-600">
          لا يوجد حساب بهذا الرقم — سيتم إنشاء حساب تلقائياً (كلمة المرور = أرقام الهاتف
          فقط).
        </p>
      )}
      {existingUserId && (
        <p className="text-xs text-green-700">تم اختيار حساب موجود على المنصة.</p>
      )}
    </div>
  );
}
