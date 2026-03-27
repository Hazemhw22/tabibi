import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ADMIN_LAB } from "@/lib/medical-center-roles";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";

const BUCKET = "medical-center-docs";

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
      fileSizeLimit: 15 * 1024 * 1024,
    });
  }
}

async function patientHasCenterRelationship(patientUserId: string, centerId: string): Promise<boolean> {
  const { data: row } = await supabaseAdmin
    .from("Appointment")
    .select("id")
    .eq("medicalCenterId", centerId)
    .eq("patientId", patientUserId)
    .limit(1)
    .maybeSingle();
  if (row) return true;

  const ids = await getLinkedDoctorIdsForCenter(centerId);
  if (!ids.length) return false;
  const { data: cp } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("userId", patientUserId)
    .in("doctorId", ids)
    .limit(1)
    .maybeSingle();
  return !!cp;
}

/** نتائج تحاليل وأشعة — رفع وعرض من لوحة المركز */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_LAB });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const { searchParams } = new URL(req.url);
    const patientUserId = searchParams.get("patientUserId")?.trim();

    let q = supabaseAdmin
      .from("MedicalCenterPatientDocument")
      .select(
        "id, medicalCenterId, patientUserId, category, title, fileUrl, fileName, mimeType, notes, createdAt, uploadedByUserId"
      )
      .eq("medicalCenterId", centerId)
      .order("createdAt", { ascending: false })
      .limit(200);

    if (patientUserId) {
      q = q.eq("patientUserId", patientUserId);
    }

    const { data, error } = await q;

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    return NextResponse.json({ documents: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

const postFormSchema = z.object({
  patientUserId: z.string().min(1),
  category: z.enum(["LAB", "IMAGING", "MEDICAL_REPORT"]),
  title: z.string().min(1).max(200),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_LAB });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "يجب إرسال multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const patientUserId = String(form.get("patientUserId") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const notes = form.get("notes") ? String(form.get("notes")) : undefined;

    const parsed = postFormSchema.safeParse({ patientUserId, category, title, notes });
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.issues }, { status: 400 });
    }

    if (!file?.size) {
      return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
    }

    const { data: patientRow } = await supabaseAdmin
      .from("User")
      .select("id, role")
      .eq("id", parsed.data.patientUserId)
      .maybeSingle();
    const pr = patientRow as { id?: string; role?: string } | null;
    if (!pr || pr.role !== "PATIENT") {
      return NextResponse.json({ error: "المريض غير موجود أو ليس حساب مريض" }, { status: 400 });
    }

    const okRel = await patientHasCenterRelationship(parsed.data.patientUserId, centerId);
    if (!okRel) {
      return NextResponse.json(
        { error: "لا يمكن ربط الملف بهذا المريض قبل وجود حجز أو سجل عند أطباء المركز" },
        { status: 400 }
      );
    }

    await ensureBucket();

    const safeName = file.name.replace(/[^\w.\-()\u0600-\u06FF]+/g, "_").slice(0, 120);
    const ext = safeName.includes(".") ? safeName.split(".").pop()?.toLowerCase() : "";
    const objectPath = `${centerId}/${parsed.data.patientUserId}/${Date.now()}_${randomUUID().slice(0, 8)}${ext ? `.${ext}` : ""}`;

    const buf = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;

    const id = randomUUID();
    const now = new Date().toISOString();
    const { data: row, error: insErr } = await supabaseAdmin
      .from("MedicalCenterPatientDocument")
      .insert({
        id,
        medicalCenterId: centerId,
        patientUserId: parsed.data.patientUserId,
        category: parsed.data.category,
        title: parsed.data.title,
        fileUrl: publicUrl,
        fileName: file.name,
        mimeType: file.type || null,
        notes: parsed.data.notes ?? null,
        uploadedByUserId: session.user.id,
        updatedAt: now,
      })
      .select("id")
      .single();

    if (insErr || !row) {
      console.error(insErr);
      await supabaseAdmin.storage.from(BUCKET).remove([objectPath]);
      return NextResponse.json({ error: "فشل حفظ السجل" }, { status: 500 });
    }

    return NextResponse.json({ id: row.id, fileUrl: publicUrl, message: "تم رفع الملف" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
