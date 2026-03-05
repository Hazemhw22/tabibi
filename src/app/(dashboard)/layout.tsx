import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50 flex-row-reverse" dir="rtl">
      <Sidebar />
      <main className="flex-1 lg:overflow-auto">
        <div className="lg:hidden h-14" />
        {children}
      </main>
    </div>
  );
}
