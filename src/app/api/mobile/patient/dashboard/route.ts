import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_jwt";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "AUTH_DEBUG: Missing Authorization header" }, { status: 401 });
    }
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "AUTH_DEBUG: Invalid Authorization header format" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let userId;
    try {
      const decoded = verify(token, JWT_SECRET) as { id: string };
      userId = decoded.id;
    } catch (e: any) {
      return NextResponse.json({ error: `AUTH_DEBUG: JWT fail - ${e.message}` }, { status: 401 });
    }
    // userId is already set in the try block above from decoded.id

    // 1. Fetch Appointments
    const { data: appointments, error: aptError } = await supabaseAdmin
      .from("Appointment")
      .select(`
        id, appointmentDate, startTime, endTime, status, fee, paymentStatus,
        doctor:Doctor(rating, gender, user:User!Doctor_userId_fkey(name, image), specialty:Specialty(nameAr)),
        clinic:Clinic(name, address)
      `)
      .eq("patientId", userId)
      .order("appointmentDate", { ascending: false });

    if (aptError) throw aptError;

    // 2. Fetch Platform Transactions
    const { data: platformTx, error: pTxError } = await supabaseAdmin
      .from("PlatformPatientTransaction")
      .select(`id, type, description, amount, date, doctor:Doctor(user:User!Doctor_userId_fkey(name))`)
      .eq("patientId", userId)
      .order("date", { ascending: false });

    // 3. Fetch Clinic Transactions
    const { data: clinicPatients } = await supabaseAdmin
      .from("ClinicPatient")
      .select("id")
      .eq("userId", userId);

    const cpIds = (clinicPatients ?? []).map((p) => p.id);
    let clinicTx: any[] = [];
    if (cpIds.length > 0) {
      const { data: cTxData } = await supabaseAdmin
        .from("ClinicTransaction")
        .select(`id, type, description, amount, date, clinicPatient:ClinicPatient(name, doctor:Doctor(user:User!Doctor_userId_fkey(name)))`)
        .in("clinicPatientId", cpIds)
        .order("date", { ascending: false });
      clinicTx = cTxData ?? [];
    }

    // 4. Combine and Calculate Stats
    const allTransactions = [
      ...(platformTx ?? []).map((t: any) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        description: t.description,
        amount: t.amount,
        doctorName: t.doctor?.user?.name || t.doctor?.User?.name || "—",
        source: "منصة",
      })),
      ...(clinicTx ?? []).map((t: any) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        description: t.description,
        amount: t.amount,
        doctorName: t.clinicPatient?.doctor?.user?.name || t.clinicPatient?.doctor?.User?.name || "—",
        source: "عيادة",
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalPaid = allTransactions
      .filter((t) => t.type === "PAYMENT")
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
    const totalServices = allTransactions
      .filter((t) => t.type === "SERVICE")
      .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    
    const totalDebts = Math.max(0, totalServices - totalPaid);

    return NextResponse.json({
      appointments: appointments ?? [],
      transactions: allTransactions,
      stats: {
        totalPaid,
        totalServices,
        totalDebts,
        upcomingCount: (appointments ?? []).filter(a => ["CONFIRMED", "DRAFT"].includes(a.status) && new Date(a.appointmentDate) >= new Date()).length,
        completedCount: (appointments ?? []).filter(a => a.status === "COMPLETED").length,
      }
    });

  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
