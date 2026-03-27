import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { assertApprovedMedicalCenter } from "@/lib/medical-center-auth";
import { CENTER_ROLES_ADMIN_ONLY } from "@/lib/medical-center-roles";
import { getLinkedDoctorIdsForCenter } from "@/lib/medical-center-doctors";

export type FinanceRow = {
  doctorId: string;
  doctorName: string;
  appointmentCount: number;
  patientFeesTotal: number;
  doctorClinicFeesTotal: number;
  estimatedNet: number;
};

/** ملخص حسابات المركز: ما دفعه المرضى للمركز × مستحقات الأطباء من العيادة + تفصيل لكل طبيب */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const gate = await assertApprovedMedicalCenter(session.user.id, { roles: CENTER_ROLES_ADMIN_ONLY });
    if (!gate.ok) return gate.response;
    const centerId = gate.centerId;

    const doctorIds = await getLinkedDoctorIdsForCenter(centerId);
    let doctors: { id: string; user?: unknown }[] = [];
    if (doctorIds.length > 0) {
      const { data: doctorRows, error: doctorsErr } = await supabaseAdmin
        .from("Doctor")
        .select("id, user:User(name)")
        .in("id", doctorIds)
        .order("createdAt", { ascending: true });
      if (doctorsErr) {
        console.error(doctorsErr);
        return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
      }
      doctors = (doctorRows ?? []) as { id: string; user?: unknown }[];
    }

    const { data: emergencyRows, error: emErr } = await supabaseAdmin
      .from("EmergencyVisit")
      .select("amount, paymentStatus")
      .eq("medicalCenterId", centerId);

    if (emErr) {
      console.error(emErr);
      return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
    }

    /** دفعات الطوارئ المسدّدة — إيراد مباشر للمركز */
    let emergencyPaidTotal = 0;
    let emergencyPaidCount = 0;
    for (const ev of emergencyRows ?? []) {
      const row = ev as { amount?: number; paymentStatus?: string };
      if (row.paymentStatus === "PAID") {
        emergencyPaidTotal += Number(row.amount ?? 0);
        emergencyPaidCount += 1;
      }
    }

    let apps: { doctorId: string; fee?: number; doctorClinicFeeSnapshot?: number | null; status?: string }[] =
      [];
    if (doctorIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("Appointment")
        .select("doctorId, fee, doctorClinicFeeSnapshot, status, medicalCenterId")
        .in("doctorId", doctorIds)
        .eq("medicalCenterId", centerId);

      if (error) {
        console.error(error);
        return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
      }
      apps = (data ?? []) as typeof apps;
    }

    const active = apps.filter((a) => a.status !== "CANCELLED");

    let totalPatient = 0;
    let totalDoctor = 0;
    for (const a of active) {
      totalPatient += Number(a.fee ?? 0);
      totalDoctor += Number(a.doctorClinicFeeSnapshot ?? 0);
    }

    const totalPatientWithEmergency = totalPatient + emergencyPaidTotal;

    const agg = new Map<string, { patient: number; doctor: number; count: number }>();
    for (const id of doctorIds) {
      agg.set(id, { patient: 0, doctor: 0, count: 0 });
    }
    for (const a of active) {
      const did = (a as { doctorId: string }).doctorId;
      const cur = agg.get(did);
      if (cur) {
        cur.patient += Number((a as { fee?: number }).fee ?? 0);
        cur.doctor += Number((a as { doctorClinicFeeSnapshot?: number | null }).doctorClinicFeeSnapshot ?? 0);
        cur.count += 1;
      }
    }

    const rows: FinanceRow[] = (doctors ?? []).map((d) => {
      const id = (d as { id: string }).id;
      const name = (d as { user?: { name?: string | null } }).user?.name ?? "—";
      const a = agg.get(id) ?? { patient: 0, doctor: 0, count: 0 };
      return {
        doctorId: id,
        doctorName: name,
        appointmentCount: a.count,
        patientFeesTotal: a.patient,
        doctorClinicFeesTotal: a.doctor,
        estimatedNet: a.patient - a.doctor,
      };
    });

    return NextResponse.json({
      stats: {
        totalPatientFees: totalPatientWithEmergency,
        appointmentFeesTotal: totalPatient,
        emergencyFeesPaid: emergencyPaidTotal,
        totalDoctorClinicFees: totalDoctor,
        estimatedCenterNet: totalPatientWithEmergency - totalDoctor,
      },
      appointmentCount: active.length,
      emergencyPaidCount,
      rows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
