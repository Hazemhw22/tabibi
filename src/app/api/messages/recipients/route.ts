import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMedicalCenterIdForUser } from "@/lib/medical-center-auth";

type RecipientRow = { id: string; name: string | null; phone: string | null };

function normalizeQ(q: string | null) {
  return (q ?? "").trim();
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const role = session.user.role ?? "PATIENT";
    if (role !== "PLATFORM_ADMIN" && role !== "DOCTOR" && !String(role).startsWith("MEDICAL_CENTER_")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = normalizeQ(searchParams.get("q"));
    const all = searchParams.get("all") === "1" || searchParams.get("all") === "true";
    if (!all && q.length < 2) return NextResponse.json({ recipients: [] satisfies RecipientRow[] });

    if (role === "DOCTOR") {
      const { data: docRow } = await supabaseAdmin.from("Doctor").select("id").eq("userId", session.user.id).maybeSingle();
      const doctorId = docRow?.id;
      if (!doctorId) return NextResponse.json({ recipients: [] });

      let query = supabaseAdmin
        .from("ClinicPatient")
        .select("id, name, phone")
        .eq("doctorId", doctorId)
        .order("createdAt", { ascending: false })
        .limit(all ? 100 : 30);

      if (!all) {
        const qq = q.replace(/%/g, "");
        query = query.or(`name.ilike.%${qq}%,phone.ilike.%${qq}%`);
      }

      const { data } = await query;
      const recipients = (data ?? []).map((r) => ({
        id: String((r as { id: string }).id),
        name: (r as { name: string | null }).name ?? null,
        phone: (r as { phone: string | null }).phone ?? null,
      }));
      return NextResponse.json({ recipients });
    }

    if (String(role).startsWith("MEDICAL_CENTER_")) {
      const centerId = await getMedicalCenterIdForUser(session.user.id);
      if (!centerId) return NextResponse.json({ recipients: [] });

      const { data: apts } = await supabaseAdmin
        .from("Appointment")
        .select("id, patient:User(id, name, phone)")
        .eq("medicalCenterId", centerId)
        .order("createdAt", { ascending: false })
        .limit(all ? 500 : 200);

      const seen = new Set<string>();
      const recipients: RecipientRow[] = [];

      type AptRow = {
        patient?: { id: string; name: string | null; phone: string | null } | { id: string; name: string | null; phone: string | null }[] | null;
      };

      for (const a of (apts ?? []) as unknown as AptRow[]) {
        const rawPatient = a.patient ?? null;
        const p = Array.isArray(rawPatient) ? rawPatient[0] : rawPatient;
        if (!p?.id) continue;
        if (seen.has(p.id)) continue;
        const name = p.name ?? null;
        const phone = p.phone ?? null;
        if (!phone) continue;
        if (!all) {
          const ql = q.toLowerCase();
          if (
            !(String(name ?? "").toLowerCase().includes(ql) || String(phone ?? "").toLowerCase().includes(ql))
          ) {
            continue;
          }
        }
        seen.add(p.id);
        recipients.push({ id: p.id, name, phone });
        if (recipients.length >= (all ? 100 : 30)) break;
      }

      return NextResponse.json({ recipients });
    }

    // PLATFORM_ADMIN
    {
      let query = supabaseAdmin
        .from("User")
        .select("id, name, phone")
        .not("phone", "is", null)
        .order("createdAt", { ascending: false })
        .limit(all ? 100 : 30);

      if (!all) {
        const qq = q.replace(/%/g, "");
        query = query.or(`name.ilike.%${qq}%,phone.ilike.%${qq}%`);
      }

      const { data } = await query;
      const recipients = (data ?? []).map((r) => ({
        id: String((r as { id: string }).id),
        name: (r as { name: string | null }).name ?? null,
        phone: (r as { phone: string | null }).phone ?? null,
      }));
      return NextResponse.json({ recipients });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

