import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role ?? "PATIENT";

  if (role === "PLATFORM_ADMIN" || role === "CLINIC_ADMIN") {
    redirect("/dashboard/admin");
  }
  if (role === "DOCTOR") {
    redirect("/dashboard/doctor");
  }
  redirect("/dashboard/patient");
}
