import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved } from "@/lib/medical-center-auth";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isPlausibleEmail(s: string): boolean {
  const t = s.trim();
  if (t.length < 3 || !t.includes("@")) return false;
  const parts = t.split("@");
  if (parts.length !== 2) return false;
  return Boolean(parts[0]?.length && parts[1]?.length);
}

/** قيم email.eq لـ PostgREST مع اقتباس آمن */
function buildEmailOrClause(variants: string[]): string {
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const v of variants) {
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    uniq.push(t);
  }
  return uniq
    .map((v) => {
      const escaped = v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `email.eq."${escaped}"`;
    })
    .join(",");
}

function isDoctorRole(role: unknown): boolean {
  return String(role ?? "").toUpperCase() === "DOCTOR";
}

/**
 * GET ?email=... — أطباء مسجّلون في المنصة يطابق بريدهم (لربطهم بالمركز بطلب موافقة)
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("email") ?? "").trim();
    if (!isPlausibleEmail(raw)) {
      return NextResponse.json({ doctors: [] });
    }

    const emailNorm = normalizeEmail(raw);
    const variants = [...new Set([raw, emailNorm, raw.toLowerCase()])];
    const orClause = buildEmailOrClause(variants);

    let rows = await supabaseAdmin
      .from("User")
      .select("id, name, phone, email, role")
      .or(orClause);

    let users = (rows.data ?? []).filter((u: { role?: unknown }) => isDoctorRole(u.role));
    let uErr = rows.error;

    if (!users.length && !uErr) {
      rows = await supabaseAdmin
        .from("User")
        .select("id, name, phone, email, role")
        .eq("role", "DOCTOR")
        .ilike("email", emailNorm);
      users = rows.data ?? [];
      uErr = rows.error;
    }

    if (uErr) {
      console.error(uErr);
      return NextResponse.json({ error: "تعذر البحث" }, { status: 500 });
    }

    const userIds = users.map((u: { id: string }) => u.id);
    if (userIds.length === 0) {
      return NextResponse.json({ doctors: [] });
    }

    const userById = new Map(users.map((u: { id: string; name?: string; phone?: string; email?: string }) => [u.id, u]));

    const { data: doctorRows, error: dErr } = await supabaseAdmin
      .from("Doctor")
      .select(`id, status, medicalCenterId, userId, specialty:Specialty(nameAr)`)
      .in("userId", userIds)
      .eq("status", "APPROVED");

    if (dErr) {
      console.error(dErr);
      return NextResponse.json({ error: "تعذر تحميل الأطباء" }, { status: 500 });
    }

    const list = (doctorRows ?? [])
      .filter((d: { medicalCenterId?: string | null }) => {
        if (d.medicalCenterId === centerId) return false;
        if (d.medicalCenterId && d.medicalCenterId !== centerId) return false;
        return true;
      })
      .map(
        (d: {
          id: string;
          userId: string;
          specialty?: { nameAr?: string } | null | unknown;
        }) => {
          const u = userById.get(d.userId);
          const sp = Array.isArray(d.specialty) ? d.specialty[0] : d.specialty;
          return {
            id: d.id,
            name: u?.name ?? "",
            email: u?.email ?? "",
            phone: u?.phone ?? "",
            specialtyAr: (sp as { nameAr?: string } | null)?.nameAr ?? "",
          };
        }
      );

    return NextResponse.json({ doctors: list });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
