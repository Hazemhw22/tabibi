import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex items-center justify-center px-3 pb-2 pt-6 sm:px-4 sm:pb-4 sm:pt-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-blue-600 dark:text-blue-400 sm:text-2xl"
        >
          <Image
            src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
            alt="Tabibi"
            width={220}
            height={56}
            className="h-24 w-auto sm:h-24 max-w-[200px] sm:max-w-[240px]"
            priority
          />
        </Link>
      </div>
      <div className="flex w-full min-w-0 flex-1 items-center justify-center px-3 pb-8 sm:px-4 sm:pb-12">
        {children}
      </div>
    </div>
  );
}
