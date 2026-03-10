import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/sidebar";
import DashboardHeader from "@/components/layout/dashboard-header";
import { DoctorWhatsAppFloat } from "@/components/doctor/whatsapp-float";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isPatient = session?.user?.role === "PATIENT";
  const isDoctor = session?.user?.role === "DOCTOR";

  if (isPatient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row bg-gray-50 z-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 pt-14 lg:pt-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">{children}</main>
      </div>
      {isDoctor && <DoctorWhatsAppFloat />}
    </div>
  );
}
