import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertMedicalCenterApproved, getMedicalCenterIdForUser } from "@/lib/medical-center-auth";
import { z } from "zod";

const hoursRow = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  nameAr: z.string().optional(),
  address: z.string().min(3).optional(),
  city: z.string().optional(),
  phone: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  operatingHours: z.array(hoursRow).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const centerId = await getMedicalCenterIdForUser(session.user.id);
    if (!centerId) {
      return NextResponse.json({ error: "ليس لديك صلاحية مركز طبي" }, { status: 403 });
    }

    const { data: center, error } = await supabaseAdmin
      .from("MedicalCenter")
      .select(
        "id, name, nameAr, slug, address, city, phone, locationId, description, imageUrl, operatingHoursJson, isActive, approvalStatus, subscriptionEndDate"
      )
      .eq("id", centerId)
      .single();

    if (error || !center) {
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    let operatingHours: z.infer<typeof hoursRow>[] = [];
    if (center.operatingHoursJson) {
      try {
        const parsed = JSON.parse(center.operatingHoursJson as string);
        if (Array.isArray(parsed)) {
          operatingHours = parsed.filter((x) => hoursRow.safeParse(x).success) as z.infer<typeof hoursRow>[];
        }
      } catch {
        /* ignore */
      }
    }

    return NextResponse.json({ center: { ...center, operatingHours } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertMedicalCenterApproved(session.user.id);
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const body = await req.json();
    const data = patchSchema.parse(body);

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.nameAr !== undefined) update.nameAr = data.nameAr;
    if (data.address !== undefined) update.address = data.address;
    if (data.city !== undefined) update.city = data.city;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.description !== undefined) update.description = data.description;
    if (data.locationId !== undefined) update.locationId = data.locationId;
    if (data.imageUrl !== undefined) update.imageUrl = data.imageUrl;
    if (data.operatingHours !== undefined) {
      update.operatingHoursJson = JSON.stringify(data.operatingHours);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("MedicalCenter").update(update).eq("id", centerId);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: "فشل الحفظ" }, { status: 500 });
    }

    return NextResponse.json({ message: "تم حفظ الإعدادات" });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: e.issues }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
