"use client";

export default function SortSelect({
  defaultValue,
  specialtyId,
  search,
}: {
  defaultValue?: string;
  specialtyId?: string;
  search?: string;
}) {
  return (
    <form method="get">
      {specialtyId && <input type="hidden" name="specialtyId" value={specialtyId} />}
      {search && <input type="hidden" name="search" value={search} />}
      <select
        name="sort"
        defaultValue={defaultValue || "rating"}
        onChange={(e) => {
          const form = e.currentTarget.form;
          if (form) form.submit();
        }}
        className="text-xs text-gray-600 bg-gray-100 border-0 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
      >
        <option value="rating">الأعلى تقييماً</option>
        <option value="price_asc">الأقل سعراً</option>
        <option value="price_desc">الأعلى سعراً</option>
        <option value="experience">الأكثر خبرة</option>
      </select>
    </form>
  );
}
