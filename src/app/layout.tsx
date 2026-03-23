import type { Metadata } from "next";
import { Tajawal, El_Messiri } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

const elMessiri = El_Messiri({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-messiri",
  display: "swap",
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} ${elMessiri.variable} font-sans antialiased bg-gray-50`}>
        <SessionProvider>
          {children}
          <Toaster position="top-center" richColors dir="rtl" />
        </SessionProvider>
      </body>
    </html>
  );
}
