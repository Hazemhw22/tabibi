import { NextResponse } from "next/server";
import { DEFAULT_SPECIALTY_SEEDS } from "@/lib/default-specialties";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function ensureDefaultSpecialties(): Promise<void> {
  const { data: rows } = await supabaseAdmin.from("Specialty").select("name");
  const existing = new Set((rows ?? []).map((r) => r.name));
  const missing = DEFAULT_SPECIALTY_SEEDS.filter((s) => !existing.has(s.name));
  if (missing.length === 0) return;
  const { error } = await supabaseAdmin.from("Specialty").insert(missing);
  if (error) {
    console.error("[specialties] ensureDefaultSpecialties:", error.message);
  }
}

export async function GET() {
  await ensureDefaultSpecialties();
  const { data, error } = await supabaseAdmin
    .from("Specialty")
    .select("id, name, nameAr, icon")
    .order("nameAr");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
