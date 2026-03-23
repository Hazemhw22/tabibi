import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import BottomNav from "@/components/layout/bottom-nav";
import { auth } from "@/lib/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role ?? null;
  const showBottomNav = !role || role === "PATIENT";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className={`flex-1 ${showBottomNav ? "pb-16 sm:pb-0" : ""}`}>{children}</main>
      <div className="hidden sm:block">
        <Footer />
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
