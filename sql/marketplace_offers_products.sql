-- Marketplace: Offers + Products + Orders
-- مهم: كل أسماء الأعمدة camelCase يجب أن تكون بين علامتي اقتباس "..." وإلا Postgres يحوّلها إلى lowercase ويتعارض مع PostgREST/الكود.
--
-- إذا أنشأت الجداول سابقاً بأعمدة lowercase (doctorid، …): شغّل أولاً: sql/marketplace_fix_lowercase_columns.sql
--
-- Supabase: تشغيل كامل من SQL Editor. المحفّزات تستخدم EXECUTE PROCEDURE (متوافقة مع إصدارات Postgres في Supabase).
--

-- gen_random_uuid() — يوفّرها pgcrypto (مفعّلة افتراضياً في أغلب مشاريع Supabase؛ الإنشاء آمن إن وُجدت مسبقاً)
create extension if not exists pgcrypto;

-- =========================
-- Tables
-- =========================

create table if not exists public."DoctorOffer" (
  "id" uuid primary key default gen_random_uuid(),
  "doctorId" text not null references public."Doctor"(id) on delete cascade,
  "title" text not null,
  "imageUrl" text not null,
  "price" numeric not null default 0,
  "currency" text not null default 'ILS',
  "isActive" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "DoctorOffer_doctorId_idx" on public."DoctorOffer" ("doctorId");
create index if not exists "DoctorOffer_isActive_idx" on public."DoctorOffer" ("isActive");

create table if not exists public."DoctorProduct" (
  "id" uuid primary key default gen_random_uuid(),
  "doctorId" text not null references public."Doctor"(id) on delete cascade,
  "name" text not null,
  "description" text null,
  "imageUrl" text not null,
  "price" numeric not null default 0,
  "currency" text not null default 'ILS',
  "isActive" boolean not null default true,
  "stock" int not null default 0,
  "pickupAvailable" boolean not null default true,
  "deliveryAvailable" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "DoctorProduct_doctorId_idx" on public."DoctorProduct" ("doctorId");
create index if not exists "DoctorProduct_isActive_idx" on public."DoctorProduct" ("isActive");

create table if not exists public."ProductOrder" (
  "id" uuid primary key default gen_random_uuid(),
  "productId" uuid not null references public."DoctorProduct"(id) on delete restrict,
  "doctorId" text not null references public."Doctor"(id) on delete restrict,
  "patientUserId" text not null references public."User"(id) on delete restrict,
  "quantity" int not null default 1,
  "unitPrice" numeric not null default 0,
  "totalPrice" numeric not null default 0,
  "currency" text not null default 'ILS',
  "fulfillmentMethod" text not null check ("fulfillmentMethod" in ('PICKUP', 'DELIVERY')),
  "deliveryAddress" text null,
  "paymentMethod" text not null default 'COD' check ("paymentMethod" in ('COD')),
  "status" text not null default 'PENDING' check ("status" in ('PENDING', 'CONFIRMED', 'CANCELLED', 'FULFILLED')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "ProductOrder_patientUserId_idx" on public."ProductOrder" ("patientUserId");
create index if not exists "ProductOrder_doctorId_idx" on public."ProductOrder" ("doctorId");
create index if not exists "ProductOrder_createdAt_idx" on public."ProductOrder" ("createdAt");

-- Auto-update updatedAt
create or replace function public.set_marketplace_updated_at()
returns trigger as $$
begin
  new."updatedAt" := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at_offer on public."DoctorOffer";
create trigger set_updated_at_offer
before update on public."DoctorOffer"
for each row execute function public.set_marketplace_updated_at();

drop trigger if exists set_updated_at_product on public."DoctorProduct";
create trigger set_updated_at_product
before update on public."DoctorProduct"
for each row execute function public.set_marketplace_updated_at();

drop trigger if exists set_updated_at_order on public."ProductOrder";
create trigger set_updated_at_order
before update on public."ProductOrder"
for each row execute function public.set_marketplace_updated_at();

-- =========================
-- RLS
-- =========================

alter table public."DoctorOffer" enable row level security;
alter table public."DoctorProduct" enable row level security;
alter table public."ProductOrder" enable row level security;

create or replace function public.is_platform_admin(uid_text text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1 from public."User" u
    where u."id" = uid_text and u."role" = 'PLATFORM_ADMIN'
  );
$$;

-- ===== DoctorOffer
drop policy if exists "offer_select_public_active" on public."DoctorOffer";
create policy "offer_select_public_active"
on public."DoctorOffer"
for select
to anon, authenticated
using ("isActive" = true);

drop policy if exists "offer_crud_doctor_owner" on public."DoctorOffer";
create policy "offer_crud_doctor_owner"
on public."DoctorOffer"
for all
to authenticated
using (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "DoctorOffer"."doctorId"
      and d."userId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "DoctorOffer"."doctorId"
      and d."userId" = auth.uid()::text
  )
);

drop policy if exists "offer_crud_platform_admin" on public."DoctorOffer";
create policy "offer_crud_platform_admin"
on public."DoctorOffer"
for all
to authenticated
using (public.is_platform_admin(auth.uid()::text))
with check (public.is_platform_admin(auth.uid()::text));

-- ===== DoctorProduct
drop policy if exists "product_select_public_active" on public."DoctorProduct";
create policy "product_select_public_active"
on public."DoctorProduct"
for select
to anon, authenticated
using ("isActive" = true);

drop policy if exists "product_crud_doctor_owner" on public."DoctorProduct";
create policy "product_crud_doctor_owner"
on public."DoctorProduct"
for all
to authenticated
using (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "DoctorProduct"."doctorId"
      and d."userId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "DoctorProduct"."doctorId"
      and d."userId" = auth.uid()::text
  )
);

drop policy if exists "product_crud_platform_admin" on public."DoctorProduct";
create policy "product_crud_platform_admin"
on public."DoctorProduct"
for all
to authenticated
using (public.is_platform_admin(auth.uid()::text))
with check (public.is_platform_admin(auth.uid()::text));

-- ===== ProductOrder
drop policy if exists "order_insert_patient" on public."ProductOrder";
create policy "order_insert_patient"
on public."ProductOrder"
for insert
to authenticated
with check ("patientUserId" = auth.uid()::text);

drop policy if exists "order_select_patient_self" on public."ProductOrder";
create policy "order_select_patient_self"
on public."ProductOrder"
for select
to authenticated
using ("patientUserId" = auth.uid()::text);

drop policy if exists "order_select_doctor_owner" on public."ProductOrder";
create policy "order_select_doctor_owner"
on public."ProductOrder"
for select
to authenticated
using (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "ProductOrder"."doctorId"
      and d."userId" = auth.uid()::text
  )
);

drop policy if exists "order_update_doctor_owner" on public."ProductOrder";
create policy "order_update_doctor_owner"
on public."ProductOrder"
for update
to authenticated
using (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "ProductOrder"."doctorId"
      and d."userId" = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public."Doctor" d
    where d."id" = "ProductOrder"."doctorId"
      and d."userId" = auth.uid()::text
  )
);

drop policy if exists "order_crud_platform_admin" on public."ProductOrder";
create policy "order_crud_platform_admin"
on public."ProductOrder"
for all
to authenticated
using (public.is_platform_admin(auth.uid()::text))
with check (public.is_platform_admin(auth.uid()::text));

-- =========================
-- Grants (Supabase: الجداول المُنشأة بـ SQL لا تأخذ صلاحيات تلقائياً كما في محرر الجداول)
-- =========================

grant select on public."DoctorOffer" to anon;
grant select, insert, update, delete on public."DoctorOffer" to authenticated;
grant all on public."DoctorOffer" to service_role;

grant select on public."DoctorProduct" to anon;
grant select, insert, update, delete on public."DoctorProduct" to authenticated;
grant all on public."DoctorProduct" to service_role;

grant select, insert, update, delete on public."ProductOrder" to authenticated;
grant all on public."ProductOrder" to service_role;
