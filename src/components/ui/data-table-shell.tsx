"use client";

import type { TdHTMLAttributes } from "react";
import { Search, LayoutGrid, List, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TableViewMode = "grid" | "table";

type Props = {
  /** شريط علوي: بحث + ملخص + أزرار */
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  /** مثال: إجمالي الرصيد */
  summaryLabel?: string;
  summaryValue?: string;
  showViewToggle?: boolean;
  viewMode?: TableViewMode;
  onViewModeChange?: (m: TableViewMode) => void;
  /** زر فلاتر أو محتوى مخصص */
  filterSlot?: React.ReactNode;
  /** أزرار يمين: إضافة، حذف، إلخ */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * غلاف جدول/شبكة بأسلوب لوحة التحكم: شريط بحث، ملخص، تبديل عرض، فلاتر.
 */
export function DataTableShell({
  searchPlaceholder = "ابحث...",
  searchQuery,
  onSearchChange,
  summaryLabel,
  summaryValue,
  showViewToggle = true,
  viewMode = "table",
  onViewModeChange,
  filterSlot,
  actions,
  children,
  className,
}: Props) {
  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/50", className)}>
      <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-gray-200 bg-gray-50 pr-10 text-right dark:border-gray-700 dark:bg-gray-800/80"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {summaryLabel != null && summaryValue != null && (
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">{summaryLabel}: </span>
              <span className="font-bold text-gray-900 dark:text-white">{summaryValue}</span>
            </div>
          )}

          {showViewToggle && onViewModeChange && (
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600">
              <Button
                type="button"
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => onViewModeChange("table")}
                title="عرض جدول"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => onViewModeChange("grid")}
                title="عرض شبكة"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          )}

          {filterSlot && (
            <div className="flex items-center gap-1 text-violet-700 dark:text-violet-400">
              <Filter className="h-4 w-4" />
              {filterSlot}
            </div>
          )}

          {actions}
        </div>
      </div>

      <div className="overflow-x-auto p-4 pt-0 sm:p-5 sm:pt-0">{children}</div>
    </div>
  );
}

/** رأس جدول HTML بأسلوب رمادي فاتح */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700", className)}>
      <table className="w-full min-w-[640px] table-auto text-right">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/80">{children}</tr>
    </thead>
  );
}

export function DataTableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-3 text-xs font-semibold text-gray-700 dark:text-gray-300 sm:text-sm", className)}>{children}</th>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-200 dark:divide-gray-700">{children}</tbody>;
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60", className)}>{children}</tr>
  );
}

export function DataTableCell({
  children,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-sm text-gray-900 dark:text-gray-100", className)} {...props}>
      {children}
    </td>
  );
}
