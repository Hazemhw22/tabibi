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

  /** المريض: نفس تجربة الموقع العام — Navbar + Footer من (main) فقط، بدون سايدبار/هيدر لوحة التحكم */
  if (isPatient) {
    return <div className="w-full min-h-0 flex-1 bg-gray-50 dark:bg-gray-950">{children}</div>;
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
