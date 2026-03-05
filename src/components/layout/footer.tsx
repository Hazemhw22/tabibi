import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl mb-3">
              <Image
                src="/88e178c9-facc-41a2-8f98-9252ccce19ee.png"
                alt="Tabibi"
                width={150}
                height={44}
              />
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              منصة حجز مواعيد الأطباء والعيادات في الخليل. احجز موعدك بسهولة وادفع بأمان.
            </p>
            <div className="flex flex-col gap-2 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-400 shrink-0" />
                <span>الخليل، فلسطين</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                <span dir="ltr">+972 507795580</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                <span>info@tabibi.ps</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">روابط سريعة</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "الأطباء", href: "/doctors" },
                { label: "التخصصات", href: "/specialties" },
                { label: "احجز موعد", href: "/doctors?book=1" },
                { label: "عن المنصة", href: "/about" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">الدعم</h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "الأسئلة الشائعة", href: "/faq" },
                { label: "سياسة الخصوصية", href: "/privacy" },
                { label: "شروط الاستخدام", href: "/terms" },
                { label: "تواصل معنا", href: "/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Tabibi. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>مدعوم بـ Stripe للدفع الآمن</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
