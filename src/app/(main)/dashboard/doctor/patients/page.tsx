import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { User, Phone, Mail, Calendar, UserPlus, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DoctorPatientsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "DOCTOR") redirect("/");

  const { data: doctor } = await supabaseAdmin
    .from("Doctor")
    .select("id")
    .eq("userId", session.user.id)
    .single();
  if (!doctor) redirect("/dashboard/doctor/setup");

  const { data: appointments } = await supabaseAdmin
    .from("Appointment")
    .select("patientId, patient:User(id, name, email, phone)")
    .eq("doctorId", doctor.id);

  const { data: clinicPatientsRaw, error: _cpErr } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id, name, phone, email, fileNumber")
    .eq("doctorId", doctor.id)
    .eq("isActive", true)
    .order("createdAt", { ascending: false });
  const clinicPatients = _cpErr ? [] : (clinicPatientsRaw ?? []);

  const byPatient = new Map<string, { name?: string; email?: string; phone?: string; count: number }>();
  appointments?.forEach((a: { patientId: string; patient?: { name?: string; email?: string; phone?: string } }) => {
    const id = a.patientId;
    const current = byPatient.get(id) || {
      name: (a.patient as { name?: string })?.name,
      email: (a.patient as { email?: string })?.email,
      phone: (a.patient as { phone?: string })?.phone,
      count: 0,
    };
    current.count += 1;
    byPatient.set(id, current);
  });

  const fromAppointments = Array.from(byPatient.entries()).map(([id, p]) => ({
    id,
    name: p.name ?? "—",
    email: p.email ?? "—",
    phone: p.phone ?? "—",
    fileNumber: "—",
    count: p.count,
    source: "منصة" as const,
  }));

  const fromClinic = clinicPatients.map((p) => ({
    id: p.id,
    name: p.name ?? "—",
    email: p.email ?? "—",
    phone: p.phone ?? "—",
    fileNumber: p.fileNumber ?? "—",
    count: 0,
    source: "عيادة" as const,
  }));

  const patients = [...fromAppointments, ...fromClinic];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المرضى</h1>
          <p className="text-gray-500 mt-1">مرضى حجزوا معك عبر المنصة أو المسجلون في العيادة</p>
        </div>
        <Link href="/dashboard/doctor/patients/new">
          <Button className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            إضافة مريض جديد
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg shadow-gray-200/50 rounded-2xl">
        <CardHeader className="bg-gradient-to-l from-slate-50 to-white border-b border-gray-100 px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <User className="h-5 w-5" />
            </div>
            قائمة المرضى
            <Badge variant="secondary" className="mr-auto font-normal">
              {patients.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <User className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="font-medium text-gray-600">لا يوجد مرضى مسجلون حتى الآن</p>
              <p className="text-sm mt-1">ستظهر هنا مرضى الحجوزات أو الذين تضيفهم من زر &quot;إضافة مريض جديد&quot;</p>
              <Link href="/dashboard/doctor/patients/new" className="mt-6 inline-block">
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  إضافة مريض جديد
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {patients.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {(p.name as string).charAt(0) || "—"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate" dir="ltr">
                        {p.phone !== "—" ? p.phone : p.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 hidden md:block" dir="ltr">
                    {p.email}
                  </div>
                  <div className="text-sm text-gray-500">{p.fileNumber !== "—" ? p.fileNumber : "—"}</div>
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium">
                    <Calendar className="h-3.5 w-3.5" />
                    {p.count}
                  </span>
                  <Badge variant={p.source === "منصة" ? "default" : "secondary"} className="text-xs shrink-0">
                    {p.source}
                  </Badge>
                  <Link
                    href={`/dashboard/doctor/patients/${p.id}`}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                    title="عرض الملف"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
