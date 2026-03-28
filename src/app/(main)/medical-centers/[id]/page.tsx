import Link from "next/link";
import { notFound } from "next/navigation";
import IconMapPin from "@/components/icon/icon-map-pin";
import IconBuilding from "@/components/icon/icon-building";
import IconArrowLeft from "@/components/icon/icon-arrow-left";
import IconPhone from "@/components/icon/icon-phone";
import IconShare from "@/components/icon/icon-share";
import { supabaseAdmin } from "@/lib/supabase-admin";
import FavoriteButton from "@/components/ui/favorite-button";
import { getDoctorAvatar } from "@/lib/avatar";
import { getLocationFullName } from "@/data/west-bank-locations";
import MedicalCenterDoctorsSection from "./medical-center-doctors-section";
import { CENTER_ACCENT_GRADIENT } from "./center-theme";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from("MedicalCenter").select("name, nameAr").eq("id", id).maybeSingle();
  const title = (data as { nameAr?: string; name?: string } | null)?.nameAr || (data as { name?: string } | null)?.name;
  return { title: title ? `${title} | مركز طبي` : "مركز طبي" };
}

export default async function MedicalCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: center, error: cErr } = await supabaseAdmin
    .from("MedicalCenter")
    .select("*")
    .eq("id", id)
    .eq("isActive", true)
    .maybeSingle();

  if (cErr || !center) notFound();

  const { data: doctorsRaw } = await supabaseAdmin
    .from("Doctor")
    .select(`
      id,
      consultationFee,
      patientFeeServiceType,
      rating,
      experienceYears,
      totalReviews,
      locationId,
      gender,
      whatsapp,
      user:User!Doctor_userId_fkey(name, phone, image),
      specialty:Specialty(nameAr)
    `)
    .eq("medicalCenterId", id)
    .eq("status", "APPROVED")
    .order("createdAt", { ascending: true });

  type RawDoc = {
    id: string;
    consultationFee?: number | null;
    patientFeeServiceType?: string | null;
    rating?: number | null;
    experienceYears?: number | null;
    totalReviews?: number | null;
    locationId?: string | null;
    gender?: string | null;
    whatsapp?: string | null;
    user?: { name?: string | null; phone?: string | null; image?: string | null } | null | Array<{
      name?: string | null;
      phone?: string | null;
      image?: string | null;
    }>;
    specialty?: { nameAr?: string | null } | { nameAr?: string | null }[] | null;
  };

  function normalizeOne<T>(x: T | T[] | null | undefined): T | null {
    if (x == null) return null;
    return Array.isArray(x) ? x[0] ?? null : x;
  }

  const centerName = (center as { nameAr?: string; name: string }).nameAr || center.name;
  const address = (center as { address?: string }).address;
  const city = (center as { city?: string }).city;
  const phone = (center as { phone?: string }).phone;
  const description = (center as { description?: string }).description;
  const centerLocFallback = [address, city].filter(Boolean).join("، ") || null;

  const doctors = (doctorsRaw ?? [])
    .map((d: RawDoc) => {
      const u = normalizeOne(d.user);
      const sp = normalizeOne(d.specialty);
      const rawName = u?.name?.trim() || "طبيب";
      const name = rawName.replace(/^د\.?\s*/u, "").trim() || rawName;
      const region = d.locationId ? getLocationFullName(d.locationId) : null;
      const contact = d.whatsapp || u?.phone || "";
      const waDigits = contact.replace(/\D/g, "");
      return {
        id: d.id,
        consultationFee: d.consultationFee ?? 0,
        feeServiceType: d.patientFeeServiceType === "EXAMINATION" ? ("EXAMINATION" as const) : ("CONSULTATION" as const),
        name,
        specialtyAr: sp?.nameAr ?? "",
        rating: d.rating ?? 0,
        experienceYears: d.experienceYears ?? 0,
        totalReviews: d.totalReviews ?? 0,
        avatarSrc: getDoctorAvatar(u?.image ?? null, d.gender ?? null),
        locationLabel: region || centerLocFallback,
        waDigits,
      };
    });

  const specialtiesCount = new Set(doctors.map((d) => d.specialtyAr).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* شريط علوي */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/medical-centers"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800"
            aria-label="رجوع"
          >
            <IconArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold text-slate-900">تفاصيل المركز</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
              aria-label="مشاركة"
            >
              <IconShare className="h-4 w-4" />
            </button>
            <FavoriteButton id={id} type="center" size="sm" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-4">
        {/* بطاقة الهيرو */}
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
          <div className={`relative h-32 bg-gradient-to-br ${CENTER_ACCENT_GRADIENT}`}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_55%)]" />
            <div className="absolute inset-0 bg-black/[0.06]" />
          </div>
          <div className="relative px-5 pb-6 pt-0">
            <div className="-mt-14 mb-4 flex justify-center">
              <div
                className={`flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-3xl bg-gradient-to-br ${CENTER_ACCENT_GRADIENT} shadow-xl ring-4 ring-white`}
              >
                <IconBuilding className="h-11 w-11 text-white drop-shadow-sm" />
              </div>
            </div>
            <h2 className="mb-1.5 text-center text-xl font-extrabold tracking-tight text-slate-900">{centerName}</h2>
            <div className="mb-5 flex items-center justify-center gap-2 text-sm text-slate-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <IconMapPin className="h-4 w-4" />
              </span>
              <span>
                {[address, city].filter(Boolean).join("، ") || "—"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/80">
              <div className="px-2 py-3 text-center">
                <div className="text-lg font-extrabold tabular-nums text-slate-900">{doctors.length}</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500">طبيب</div>
              </div>
              <div className="border-x border-slate-100 px-2 py-3 text-center">
                <div className="text-lg font-extrabold tabular-nums text-slate-900">{specialtiesCount}</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500">تخصص</div>
              </div>
              <div className="px-2 py-3 text-center">
                <div className="text-sm font-extrabold text-emerald-700">متاح</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500">للحجز</div>
              </div>
            </div>
          </div>
        </div>

        {description ? (
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
              <span className="h-1 w-8 rounded-full bg-emerald-500" aria-hidden />
              عن المركز
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">{description}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-slate-900">التواصل مع المركز</h3>
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${CENTER_ACCENT_GRADIENT} shadow-md`}
            >
              <IconBuilding className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{centerName}</p>
              <p className="text-xs text-slate-500">مركز طبي</p>
            </div>
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
                aria-label="اتصال"
              >
                <IconPhone className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">أطباء المركز</h3>
              <p className="mt-0.5 text-xs text-slate-500">اختر التخصص ثم احجز مع الطبيب المناسب</p>
            </div>
          </div>
          <MedicalCenterDoctorsSection centerId={id} doctors={doctors} />
        </section>
      </div>
    </div>
  );
}
