"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import IconSearch from "@/components/icon/icon-search";
import IconX from "@/components/icon/icon-x";
import IconHeart from "@/components/icon/icon-heart";
import IconUser from "@/components/icon/icon-user";
import IconCalendar from "@/components/icon/icon-calendar";
import IconUsers from "@/components/icon/icon-users";
import { cn } from "@/lib/utils";
import type { DashboardSearchResult } from "@/lib/dashboard-search-types";

const typeMeta: Record<
  DashboardSearchResult["type"],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  doctor: { label: "طبيب", icon: IconHeart },
  patient: { label: "مريض", icon: IconUser },
  appointment: { label: "موعد", icon: IconCalendar },
  user: { label: "مستخدم", icon: IconUsers },
};

export default function DashboardGlobalSearch({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(-1);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (pathname?.includes("messages")) {
      setQuery("");
      setResults([]);
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setSelected(-1);
      return;
    }
    setOpen(true);
    setSelected(-1);
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  const go = (r: DashboardSearchResult) => {
    router.push(r.link);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => (i < results.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => (i > 0 ? i - 1 : results.length - 1));
    } else if (e.key === "Enter" && selected >= 0) {
      e.preventDefault();
      go(results[selected]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full min-w-0 max-w-full sm:max-w-md lg:max-w-sm"
    >
      <div className="relative">
        <IconSearch
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400",
            "right-3"
          )}
        />
        <input
          type="search"
          name="dashboard-global-search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="ابحث..."
          className={cn(
            "h-10 w-full rounded-lg border pr-10 pl-10 text-right text-sm outline-none transition-colors",
            isDark
              ? "border-gray-700 bg-gray-800/80 text-white placeholder:text-gray-500 focus:border-blue-500"
              : "border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="مسح"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div
          className={cn(
            "absolute top-full z-[100] mt-1 max-h-96 w-full overflow-y-auto rounded-lg border shadow-lg",
            isDark ? "border-gray-800 bg-[#0e1726] text-white" : "border-gray-200 bg-white"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              جاري البحث...
            </div>
          ) : results.length > 0 ? (
            <ul className="py-1">
              {results.map((r, index) => {
                const meta = typeMeta[r.type];
                const Icon = meta.icon;
                return (
                  <li key={`${r.type}-${r.id}-${index}`}>
                    <button
                      type="button"
                      onClick={() => go(r)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b px-4 py-3 text-right last:border-0 transition-colors",
                        index === selected
                          ? isDark
                            ? "bg-gray-800"
                            : "bg-gray-50"
                          : isDark
                            ? "hover:bg-gray-800/80"
                            : "hover:bg-gray-50"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{r.title}</span>
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] font-medium",
                              isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {meta.label}
                          </span>
                        </div>
                        {r.subtitle && (
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{r.subtitle}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500">لا توجد نتائج</div>
          )}
        </div>
      )}
    </div>
  );
}
