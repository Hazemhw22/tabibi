import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/sidebar";
import DashboardHeader from "@/components/layout/dashboard-header";
import { DashboardThemeSync } from "@/components/layout/dashboard-theme-sync";
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
    return (
      <div className="min-h-0 w-full min-w-0 max-w-[100vw] flex-1 overflow-x-hidden bg-gray-50 px-3 py-4 sm:px-4 sm:py-5 md:px-6 dark:bg-gray-950">
        {children}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gray-50 lg:flex-row">
      <DashboardThemeSync />
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 lg:pt-0">
        <DashboardHeader />
        <main className="min-h-0 min-w-0 w-full max-w-[100vw] flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 md:px-6">
          {children}
        </main>
      </div>
      {isDoctor && <DoctorWhatsAppFloat />}
    </div>
  );
}
