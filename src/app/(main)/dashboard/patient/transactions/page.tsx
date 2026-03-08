import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

type PatientTxRow = {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  doctorName: string;
  source: "منصة" | "عيادة";
};

export default async function PatientTransactionsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/");

  const { data: platformTxRes } = await supabaseAdmin
    .from("PlatformPatientTransaction")
    .select(`id, type, description, amount, date, doctor:Doctor(User(name))`)
    .eq("patientId", session.user.id)
    .order("date", { ascending: false });

  const { data: clinicPatients } = await supabaseAdmin
    .from("ClinicPatient")
    .select("id")
    .eq("userId", session.user.id);

  let clinicTxList:
    | Array<{
        id: string;
        type: string;
        description: string;
        amount: number;
        date: string;
        clinicPatient?: { name?: string; doctor?: { User?: { name?: string } } };
      }>
    | null = null;

  const cpIds = (clinicPatients ?? []).map((p: { id: string }) => p.id);
  if (cpIds.length > 0) {
    const { data: clinicTxData } = await supabaseAdmin
      .from("ClinicTransaction")
      .select(
        `id, type, description, amount, date,
         clinicPatient:ClinicPatient(name, doctor:Doctor(User(name)))`
      )
      .in("clinicPatientId", cpIds)
      .order("date", { ascending: false });
    clinicTxList = clinicTxData as Array<{
      id: string;
      type: string;
      description: string;
      amount: number;
      date: string;
      clinicPatient?: { name?: string; doctor?: { User?: { name?: string } } };
    }> | null;
  }

  const platformTxList = (platformTxRes ?? []) as Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
    doctor?: { User?: { name?: string } };
  }>;

  const txRows: PatientTxRow[] = [
    ...platformTxList.map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      description: t.description,
      amount: t.amount,
      doctorName: t.doctor?.User?.name ?? "—",
      source: "منصة" as const,
    })),
    ...((clinicTxList ?? []) as Array<{
      id: string;
      type: string;
      description: string;
      amount: number;
      date: string;
      clinicPatient?: { name?: string; doctor?: { User?: { name?: string } } };
    }>).map((t) => ({
      id: t.id,
      date: t.date,
      type: t.type,
      description: t.description,
      amount: t.amount,
      doctorName:
        (t.clinicPatient as { doctor?: { User?: { name?: string } } })?.doctor?.User?.name ?? "—",
      source: "عيادة" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">معاملاتي</h1>
        <p className="text-gray-500 mt-1 text-sm">
          جميع الدفعات والديون التي تم تسجيلها لك عند الأطباء
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-blue-500" />
            <span>سجل المعاملات المالية</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0 sm:px-6 overflow-hidden">
          {txRows.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm px-6">
              لا توجد دفعات أو ديون مسجلة حتى الآن.
            </div>
          ) : (
            <div className="table-scroll-mobile w-full min-w-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-right text-xs text-gray-500 border-b border-gray-100 bg-gray-50/70">
                    <th className="pb-3 pr-4 font-medium whitespace-nowrap">التاريخ</th>
                    <th className="pb-3 font-medium whitespace-nowrap">الطبيب</th>
                    <th className="pb-3 font-medium whitespace-nowrap">النوع</th>
                    <th className="pb-3 font-medium whitespace-nowrap">عن ماذا</th>
                    <th className="pb-3 font-medium whitespace-nowrap">المبلغ</th>
                    <th className="pb-3 font-medium whitespace-nowrap">المصدر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">
                        {tx.date ? format(new Date(tx.date), "dd/MM/yyyy") : "—"}
                      </td>
                      <td className="py-3 text-gray-900 font-medium whitespace-nowrap">
                        {tx.doctorName !== "—" ? `د. ${tx.doctorName}` : "—"}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <Badge variant={tx.type === "PAYMENT" ? "default" : "secondary"}>
                          {tx.type === "PAYMENT" ? "دفعة" : "خدمة / دين"}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-700 min-w-[80px]">{tx.description}</td>
                      <td
                        className={`py-3 font-semibold whitespace-nowrap ${
                          tx.type === "PAYMENT" ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {tx.type === "PAYMENT" ? "+" : "-"}₪{tx.amount}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {tx.source}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

