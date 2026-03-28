import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMedicalCenterIdForUser } from "@/lib/medical-center-auth";
import { isMedicalCenterStaffRole } from "@/lib/medical-center-roles";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";
import type { DashboardSearchResult } from "@/lib/dashboard-search-types";

function match(q: string, ...fields: (string | undefined | null)[]) {
  const ql = q.toLowerCase();
  return fields.some((f) => f && String(f).toLowerCase().includes(ql));
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return NextResponse.json({ results: [] satisfies DashboardSearchResult[] });
    }

    const role = session.user.role;
    const results: DashboardSearchResult[] = [];

    if (isMedicalCenterStaffRole(role ?? "")) {
      const centerId = await getMedicalCenterIdForUser(session.user.id);
      if (!centerId) {
        return NextResponse.json({ results: [] });
      }

      const linkedIds = await getLinkedDoctorIdsForCenter(centerId);
      const { data: doctors } =
        linkedIds.length > 0
          ? await supabaseAdmin
              .from("Doctor")
              .select(
                `id, status, consultationFee,
           user:User!Doctor_userId_fkey(name, email, phone),
           specialty:Specialty(nameAr)`
              )
              .in("id", linkedIds)
          : { data: [] as Record<string, unknown>[] };

      for (const d of doctors ?? []) {
        const u = Array.isArray(d.user) ? d.user[0] : d.user;
        const sp = Array.isArray((d as { specialty?: unknown }).specialty)
          ? (d as { specialty: { nameAr?: string }[] }).specialty[0]
          : (d as { specialty?: { nameAr?: string } }).specialty;
        if (
          match(q, u?.name, u?.email, u?.phone, sp?.nameAr, (d as { id: string }).id)
        ) {
          results.push({
            id: (d as { id: string }).id,
            type: "doctor",
            title: `د. ${u?.name ?? "طبيب"}`,
            subtitle: sp?.nameAr ?? "",
            link: `/dashboard/medical-center/doctors/${(d as { id: string }).id}`,
          });
        }
      }

      const doctorIds = (doctors ?? []).map((x) => (x as { id: string }).id);
      if (doctorIds.length) {
        const { data: apps } = await supabaseAdmin
          .from("Appointment")
          .select("id, patient:User(name, phone, email)")
          .eq("medicalCenterId", centerId)
          .in("doctorId", doctorIds)
          .limit(80);

        const seen = new Set<string>();
        for (const a of apps ?? []) {
          const p = Array.isArray(a.patient) ? a.patient[0] : a.patient;
          const pid = (p as { name?: string })?.name ?? "";
          if (!seen.has((a as { id: string }).id) && match(q, pid, (p as { phone?: string })?.phone, (p as { email?: string })?.email)) {
            seen.add((a as { id: string }).id);
            results.push({
              id: (a as { id: string }).id,
              type: "appointment",
              title: `موعد — ${pid || "مريض"}`,
              subtitle: "حجز",
              link: `/dashboard/medical-center/appointments`,
            });
          }
        }
      }
    } else if (role === "DOCTOR") {
      const { data: docRow } = await supabaseAdmin.from("Doctor").select("id").eq("userId", session.user.id).maybeSingle();
      const doctorId = docRow?.id;
      if (doctorId) {
        const { data: patients } = await supabaseAdmin
          .from("ClinicPatient")
          .select("id, name, phone, email")
          .eq("doctorId", doctorId)
          .limit(50);

        for (const p of patients ?? []) {
          if (match(q, p.name, p.phone, p.email)) {
            results.push({
              id: p.id,
              type: "patient",
              title: p.name ?? "مريض",
              subtitle: p.phone ?? "",
              link: `/dashboard/doctor/patients/${p.id}`,
            });
          }
        }
      }
    } else if (role === "PATIENT") {
      const { data: doctors } = await supabaseAdmin
        .from("Doctor")
        .select(`id, user:User!Doctor_userId_fkey(name), specialty:Specialty(nameAr)`)
        .eq("status", "APPROVED")
        .eq("visibleToPatients", true)
        .limit(100);

      for (const d of doctors ?? []) {
        const u = Array.isArray(d.user) ? d.user[0] : d.user;
        const sp = Array.isArray((d as { specialty?: unknown }).specialty)
          ? (d as { specialty: { nameAr?: string }[] }).specialty[0]
          : (d as { specialty?: { nameAr?: string } }).specialty;
        if (match(q, u?.name, sp?.nameAr)) {
          results.push({
            id: (d as { id: string }).id,
            type: "doctor",
            title: `د. ${u?.name ?? ""}`,
            subtitle: sp?.nameAr ?? "",
            link: `/doctors/${(d as { id: string }).id}`,
          });
        }
      }
    } else if (role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN") {
      const { data: users } = await supabaseAdmin.from("User").select("id, name, email, role, phone").limit(200);

      for (const u of users ?? []) {
        if (match(q, u.name, u.email, u.phone, u.role)) {
          results.push({
            id: u.id,
            type: "user",
            title: u.name ?? u.email ?? "",
            subtitle: u.role ?? "",
            link: `/dashboard/admin/users`,
          });
        }
      }
    }

    return NextResponse.json({
      results: results.slice(0, 15),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في البحث" }, { status: 500 });
  }
}
