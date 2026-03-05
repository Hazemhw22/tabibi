"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import { Search, X } from "lucide-react";

export default function PatientSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue || "");

  const handleSearch = (v: string) => {
    setValue(v);
    const params = new URLSearchParams();
    if (v) params.set("q", v);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="ابحث بالاسم أو رقم الهاتف أو رقم الملف..."
        className="w-full h-11 border border-gray-200 rounded-xl pr-10 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
      />
      {value && (
        <button
          onClick={() => handleSearch("")}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
