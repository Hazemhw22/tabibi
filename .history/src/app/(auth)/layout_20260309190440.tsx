import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <div className="flex items-center justify-center px-3 sm:px-4 pt-6 sm:pt-8 pb-2 sm:pb-4">
        <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl sm:text-2xl">
          <Image
            src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
            alt="Tabibi"
            width={220}
            height={56}
            className="h-22 w-auto sm:h-16 max-w-[200px] sm:max-w-[240px]"
            priority
          />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 pb-8 sm:pb-12 w-full min-w-0">
        {children}
      </div>
    </div>
  );
}
