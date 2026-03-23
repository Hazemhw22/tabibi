"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import IconSearch from "@/components/icon/icon-search";
import IconFilter from "@/components/icon/icon-filter";
import IconMapPin from "@/components/icon/icon-map-pin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEST_BANK_LOCATIONS } from "@/data/west-bank-locations";
import { DropdownSelect } from "@/components/ui/dropdown-select";

const LOCATION_FILTER_OPTIONS = [
  { value: "", label: "الكل" },
  ...WEST_BANK_LOCATIONS.map((loc) => ({
    value: loc.id,
    label:
      loc.type === "governorate"
        ? `محافظة ${loc.nameAr}`
        : `${loc.nameAr} - ${loc.governorateAr}`,
  })),
];

const SORT_OPTIONS = [
  { value: "rating", label: "الأعلى تقييماً" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "experience", label: "الأكثر خبرة" },
];

interface Specialty {
  id: string;
  name: string;
  nameAr: string;
}

interface Props {
  specialties: Specialty[];
  currentParams: {
    search?: string;
    specialtyId?: string;
    locationId?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  };
}

export default function DoctorFilters({ specialties, currentParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentParams.search || "");
  const [selectedSpecialty, setSelectedSpecialty] = useState(currentParams.specialtyId || "");
  const [locationId, setLocationId] = useState(currentParams.locationId || "");
  const [minPrice, setMinPrice] = useState(currentParams.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(currentParams.maxPrice || "");
  const [sort, setSort] = useState(currentParams.sort || "rating");

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (selectedSpecialty) params.set("specialtyId", selectedSpecialty);
    if (locationId) params.set("locationId", locationId);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sort) params.set("sort", sort);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedSpecialty("");
    setLocationId("");
    setMinPrice("");
    setMaxPrice("");
    setSort("rating");
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconFilter className="h-4 w-4" />
          فلترة البحث
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            بحث
          </label>
          <div className="relative">
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="اسم الطبيب أو التخصص..."
              className="w-full h-10 border border-gray-300 rounded-lg pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Location - الضفة الغربية */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <IconMapPin className="inline h-4 w-4 ml-1" />
            المنطقة (الضفة الغربية)
          </label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">الكل</option>
            {WEST_BANK_LOCATIONS.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.type === "governorate" ? `محافظة ${loc.nameAr}` : loc.nameAr} {loc.type !== "governorate" ? `- ${loc.governorateAr}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Specialty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            التخصص
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50">
              <input
                type="radio"
                name="specialty"
                value=""
                checked={selectedSpecialty === ""}
                onChange={() => setSelectedSpecialty("")}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">الكل</span>
            </label>
            {specialties.map((spec) => (
              <label
                key={spec.id}
                className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="specialty"
                  value={spec.id}
                  checked={selectedSpecialty === spec.id}
                  onChange={() => setSelectedSpecialty(spec.id)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">{spec.nameAr}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نطاق السعر (₪)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="من"
              className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="إلى"
              className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ترتيب حسب
          </label>
          <div className="w-full min-w-0">
            <DropdownSelect
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
              placeholder="ترتيب"
              buttonClassName="h-10 border-gray-300"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={applyFilters}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "جاري البحث..." : "تطبيق الفلتر"}
          </Button>
          <Button
            onClick={clearFilters}
            variant="outline"
            className="w-full"
            disabled={isPending}
          >
            مسح الكل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
