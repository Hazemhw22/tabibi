"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import Dropdown, { type DropdownHandle } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

export type DropdownSelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** تنسيق إضافي للزر */
  buttonClassName?: string;
  /** غلاف خارجي (مثلاً w-full) */
  className?: string;
  id?: string;
  /** افتراضياً true — قائمة بنفس عرض المشغّل */
  sameWidth?: boolean;
};

/**
 * قائمة منسدلة قابلة للوصول بنفس عرض المشغّل (مناسبة لليوم، الموقع، التخصص…)
 */
export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = "اختر...",
  disabled,
  buttonClassName,
  className,
  id,
  sameWidth = true,
}: Props) {
  const ref = useRef<DropdownHandle>(null);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("w-full min-w-0", className)} id={id}>
      <Dropdown
        ref={ref}
        placement="bottom-start"
        sameWidth={sameWidth}
        disabled={disabled}
        btnClassName={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-right shadow-sm",
          buttonClassName
        )}
        popperClassName="min-w-0"
        button={
          <>
            <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </>
        }
      >
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="block w-full px-3 py-2.5 text-right text-sm text-gray-900 hover:bg-gray-100"
              onClick={() => {
                onChange(opt.value);
                ref.current?.close();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
