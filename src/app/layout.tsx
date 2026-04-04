import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeInit } from "@/components/theme-init";
import { I18nProvider, Locale } from "@/lib/i18n-context";

export const metadata: Metadata = {
  title: "Tabibi - حجز مواعيد الأطباء في فلسطين",
  description: "منصة Tabibi لحجز مواعيد الأطباء والعيادات في فلسطين مع تجربة بسيطة وآمنة",
  keywords: "Tabibi, طبيب, حجز موعد, فلسطين, عيادة, صحة",
  icons: {
    icon: "/88e178c9-facc-41a2-8f98-9252ccce19ee.png",
    apple: "/88e178c9-facc-41a2-8f98-9252ccce19ee.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = (cookieStore.get("tabibi_locale")?.value as Locale) || "ar";

  return (
    <html lang={initialLocale} dir={initialLocale === "en" ? "ltr" : "rtl"}>
      <body className="font-sans antialiased bg-gray-50 dark:bg-slate-950">
        <ThemeInit />
        <I18nProvider initialLocale={initialLocale}>
          <SessionProvider>
            {children}
            <Toaster position="top-center" richColors />
          </SessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
