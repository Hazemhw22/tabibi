import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionDoctorRecordId } from "@/lib/doctor-api-scope";
import { doctorHasCareAccessToPlatformPatient } from "@/lib/doctor-platform-patient-care-access";
import { isDoctorOrStaffRole } from "@/lib/doctor-team-roles";
import type { CarePlanType } from "@/lib/specialty-plan-registry";

const BUCKET = "doctor-patient-imaging";

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: [
        "application/pdf",
        "application/dicom",
        "application/octet-stream",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ],
      fileSizeLimit: 20 * 1024 * 1024,
    });
  }
}

async function assertClinicPatientOwnedByDoctor(doctorId: string, clinicPatientId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("id", clinicPatientId)
    .eq("doctorId", doctorId)
    .maybeSingle();
  return Boolean(data?.id);
}

type ImagingFileRow = {
  id: string;
  title: string;
  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  createdAt: string;
};

function safeString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !isDoctorOrStaffRole(session.user.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const doctorId = getSessionDoctorRecordId(session);
    if (!doctorId) {
      return NextResponse.json({ error: "لم يُعثر على ملف الطبيب في الجلسة" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "يجب إرسال multipart/form-data" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const patientSource = safeString(form.get("patientSource"));
    const patientId = safeString(form.get("patientId"));
    const planType = safeString(form.get("planType")) as CarePlanType;
    const title = safeString(form.get("title"));
    const notes = safeString(form.get("notes"));

    if (!file?.size) return NextResponse.json({ error: "اختر ملفاً" }, { status: 400 });
    if (!patientId) return NextResponse.json({ error: "معرّف المريض مطلوب" }, { status: 400 });
    if (patientSource !== "clinic" && patientSource !== "platform") {
      return NextResponse.json({ error: "مصدر المريض غير صالح" }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "عنوان الملف مطلوب" }, { status: 400 });
    if (!planType) return NextResponse.json({ error: "نوع الخطة مطلوب" }, { status: 400 });

    if (patientSource === "clinic") {
      const ok = await assertClinicPatientOwnedByDoctor(doctorId, patientId);
      if (!ok) return NextResponse.json({ error: "المريض غير موجود أو غير مصرح" }, { status: 404 });
    } else {
      const allowed = await doctorHasCareAccessToPlatformPatient(doctorId, patientId);
      if (!allowed) {
        return NextResponse.json({ error: "لا يوجد ربط بعد بينك وبين هذا المريض" }, { status: 404 });
      }
    }

    await ensureBucket();

    const safeName = file.name.replace(/[^\w.\-()\u0600-\u06FF]+/g, "_").slice(0, 120);
    const ext = safeName.includes(".") ? safeName.split(".").pop()?.toLowerCase() : "";
    const objectPath = `${doctorId}/${patientSource}/${patientId}/${Date.now()}_${randomUUID().slice(0, 8)}${ext ? `.${ext}` : ""}`;

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
    const fileUrl = urlData.publicUrl;

    const newRow: ImagingFileRow = {
      id: randomUUID(),
      title,
      fileUrl,
      fileName: file.name,
      mimeType: file.type || null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    // Persist inside care-plan JSON so it shows in "الملفات الطبية" for this patient.
    if (patientSource === "clinic") {
      const { data: existing } = await supabaseAdmin
        .from("ClinicPatientCarePlan")
        .select("id, data")
        .eq("doctorId", doctorId)
        .eq("clinicPatientId", patientId)
        .maybeSingle();
      const prev = (existing?.data as Record<string, unknown>) ?? {};
      const prevList = Array.isArray((prev as any).imagingFiles) ? ((prev as any).imagingFiles as unknown[]) : [];
      const nextData = { ...prev, imagingFiles: [newRow, ...prevList] };

      if (existing?.id) {
        await supabaseAdmin
          .from("ClinicPatientCarePlan")
          .update({ data: nextData, updatedAt: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("doctorId", doctorId);
      } else {
        await supabaseAdmin.from("ClinicPatientCarePlan").insert({
          id: randomUUID(),
          doctorId,
          clinicPatientId: patientId,
          planType,
          data: nextData,
          doctorNotes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      const { data: existing } = await supabaseAdmin
        .from("PlatformPatientCarePlan")
        .select("id, data")
        .eq("doctorId", doctorId)
        .eq("patientUserId", patientId)
        .maybeSingle();
      const prev = (existing?.data as Record<string, unknown>) ?? {};
      const prevList = Array.isArray((prev as any).imagingFiles) ? ((prev as any).imagingFiles as unknown[]) : [];
      const nextData = { ...prev, imagingFiles: [newRow, ...prevList] };

      if (existing?.id) {
        await supabaseAdmin
          .from("PlatformPatientCarePlan")
          .update({ data: nextData, updatedAt: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("PlatformPatientCarePlan").insert({
          id: randomUUID(),
          doctorId,
          patientUserId: patientId,
          planType,
          data: nextData,
          doctorNotes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ file: newRow, message: "تم رفع صورة/ملف الأشعة" }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

