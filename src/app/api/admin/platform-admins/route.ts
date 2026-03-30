import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const promoteSchema = z.object({
  /** ترقية مستخدم موجود */
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  /** إنشاء حساب جديد (اختياري) */
  createIfMissing: z.boolean().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(2).optional(),
});

function normalizePhoneLoose(s: string): string[] {
  const raw = (s ?? "").trim();
  if (!raw) return [];
  const digits = raw.replace(/\D/g, "");
  if (!digits) return [raw];
  const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
  const with0 = last9.length === 9 ? `0${last9}` : last9;
  const with972 = last9.length === 9 ? `972${last9}` : last9;
  return Array.from(new Set([raw, digits, last9, with0, with972])).filter(Boolean);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("User")
      .select("id, name, email, phone, role, createdAt")
      .eq("role", "PLATFORM_ADMIN")
      .order("createdAt", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ admins: data ?? [] });
  } catch (e) {
    console.error("[admin/platform-admins] GET", e);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PLATFORM_ADMIN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = promoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const email = parsed.data.email?.trim().toLowerCase() || "";
    const phone = parsed.data.phone?.trim() || "";
    if (!email && !phone) {
      return NextResponse.json({ error: "أدخل البريد أو الهاتف" }, { status: 400 });
    }

    let q = supabaseAdmin.from("User").select("id, name, email, phone, role").limit(1);
    // البريد في الواقع قد يُخزَّن بحروف كبيرة/صغيرة؛ نطابقه بدون حساسية حالة لتفادي ازدواج/فشل upsert
    if (email) q = q.ilike("email", email);
    if (!email && phone) {
      const candidates = normalizePhoneLoose(phone);
      q = q.or(candidates.map((p) => `phone.eq.${p}`).join(","));
    }

    const { data: userRow, error: findErr } = await q.maybeSingle();
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
    const createIfMissing = Boolean(parsed.data.createIfMissing);

    if (!userRow) {
      if (!createIfMissing) {
        return NextResponse.json(
          { error: "لم يتم العثور على مستخدم بهذا البريد/الهاتف" },
          { status: 404 },
        );
      }

      if (!email) {
        return NextResponse.json({ error: "لإنشاء مشرف جديد يلزم بريد إلكتروني" }, { status: 400 });
      }
      const password = parsed.data.password?.trim() || "";
      if (!password) {
        return NextResponse.json({ error: "أدخل كلمة سر (6 أحرف على الأقل)" }, { status: 400 });
      }

      const displayName = parsed.data.name?.trim() || "مشرف منصة";
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email_confirm: true,
        email,
        password,
        user_metadata: {
          name: displayName,
          role: "PLATFORM_ADMIN",
        },
      });

      if (authErr || !authData.user?.id) {
        return NextResponse.json({ error: authErr?.message ?? "فشل إنشاء الحساب" }, { status: 400 });
      }

      const userId = authData.user.id;
      const { error: upsertErr } = await supabaseAdmin.from("User").upsert({
        id: userId,
        email,
        name: displayName,
        role: "PLATFORM_ADMIN",
      });
      if (upsertErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: `فشل حفظ بيانات المستخدم: ${upsertErr.message}` },
          { status: 500 },
        );
      }

      const { data: created } = await supabaseAdmin
        .from("User")
        .select("id, name, email, phone, role, createdAt")
        .eq("id", userId)
        .maybeSingle();

      return NextResponse.json({ user: created, created: true, promoted: true }, { status: 201 });
    }

    if ((userRow as { role?: string }).role === "PLATFORM_ADMIN") {
      return NextResponse.json({ user: userRow, promoted: false });
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("User")
      .update({ role: "PLATFORM_ADMIN" })
      .eq("id", (userRow as { id: string }).id)
      .select("id, name, email, phone, role, createdAt")
      .maybeSingle();

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    if (!updated) return NextResponse.json({ error: "لم يتم التحديث" }, { status: 500 });

    return NextResponse.json({ user: updated, promoted: true });
  } catch (e) {
    console.error("[admin/platform-admins] POST", e);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}

