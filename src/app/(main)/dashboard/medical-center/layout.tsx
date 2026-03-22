import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMedicalCenterIdForUser } from "@/lib/medical-center-auth";

export default async function MedicalCenterDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const role = session.user.role;
  if (role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN") {
    redirect("/dashboard/admin");
  }
  const centerId = await getMedicalCenterIdForUser(session.user.id);
  if (!centerId) {
    redirect("/dashboard/patient");
  }
  return <>{children}</>;
}
