import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "Tabibi - حجز مواعيد الأطباء في الخليل",
  description: "منصة Tabibi لحجز مواعيد الأطباء والعيادات في الخليل مع تجربة بسيطة وآمنة",
  keywords: "Tabibi, طبيب, حجز موعد, الخليل, عيادة, صحة",
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
      <body className={`${cairo.variable} font-sans antialiased bg-gray-50`}>
        <SessionProvider>
          {children}
          <Toaster position="top-center" richColors dir="rtl" />
        </SessionProvider>
      </body>
    </html>
  );
}
