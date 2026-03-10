import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import RegionModal from "@/components/region/region-modal";
import RoleChoiceModal from "@/components/region/role-choice-modal";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <RoleChoiceModal />
      <RegionModal />
    </div>
  );
}
