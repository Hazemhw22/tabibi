import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const loginSchema = z.object({
  login: z.string().min(1, "أدخل رقم الهاتف أو البريد الإلكتروني"),
  password: z.string().min(6),
});

// AUTH_SECRET مطلوب في الإنتاج — بدونه سيعيد /api/auth/session 500 (راجع docs/auth-session-500.md)
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { login, password } = parsed.data;
        const isEmail = login.includes("@");

        try {
          let emailToUse: string;

          if (isEmail) {
            emailToUse = login.trim();
          } else {
            const digits = login.replace(/\D/g, "");
            const normalizedPhone = digits.slice(-9);
            const withZero = "0" + normalizedPhone;
            const with972 = "972" + normalizedPhone;
            const { data: userRow } = await supabaseAdmin
              .from("User")
              .select("id, email, name, image, role, phone, employerDoctorId, doctorStaffRole")
              .or(`phone.eq.${normalizedPhone},phone.eq.${withZero},phone.eq.${with972},phone.eq.${login}`)
              .limit(1)
              .maybeSingle();
            if (!userRow?.email) return null;
            emailToUse = userRow.email;
          }

          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: emailToUse,
            password,
          });

          if (error || !data.user) return null;

          const { data: userRow } = await supabaseAdmin
            .from("User")
            .select("id, email, name, image, role, phone, employerDoctorId, doctorStaffRole")
            .eq("id", data.user.id)
            .single();

          const meta = data.user.user_metadata as {
            name?: string;
            phone?: string;
            role?: string;
            image?: string;
          } | undefined;
          const u = userRow;

          /** جدول User هو مصدر الحقيقة للدور؛ user_metadata قد يكون قديماً أو غير متزامن مع Prisma */
          const role = u?.role ?? meta?.role ?? "PATIENT";

          return {
            id: data.user.id,
            email: data.user.email ?? u?.email ?? "",
            name: meta?.name ?? u?.name ?? "",
            image: meta?.image ?? u?.image ?? null,
            role,
            phone: meta?.phone ?? u?.phone ?? "",
            employerDoctorId: u?.employerDoctorId ?? null,
            doctorStaffRole: u?.doctorStaffRole ?? null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: updateSession }) {
      if (user) {
        const u = user as {
          role?: string;
          id?: string;
          name?: string;
          phone?: string;
          image?: string | null;
          employerDoctorId?: string | null;
          doctorStaffRole?: string | null;
        };
        token.role = u.role;
        token.id = u.id;
        token.name = u.name;
        token.phone = u.phone;
        token.picture = u.image ?? null;
        token.employerDoctorId = u.employerDoctorId ?? null;
        token.doctorStaffRole = u.doctorStaffRole ?? null;
        token.doctorId = null as string | null;
        const r = u.role ?? "";
        if (r === "DOCTOR" && u.id) {
          const { data: doc } = await supabaseAdmin
            .from("Doctor")
            .select("id")
            .eq("userId", u.id)
            .maybeSingle();
          token.doctorId = doc?.id ?? null;
        } else if (r === "DOCTOR_RECEPTION" || r === "DOCTOR_ASSISTANT") {
          token.doctorId = u.employerDoctorId ?? null;
        }
      }
      // عند استدعاء update() من الـ client
      if (trigger === "update" && updateSession) {
        const s = updateSession as { image?: string | null; name?: string; phone?: string };
        if (s.image !== undefined) token.picture = s.image;
        if (s.name !== undefined) token.name = s.name;
        if (s.phone !== undefined) token.phone = s.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        const u = session.user as {
          id?: string;
          role?: string;
          name?: string;
          phone?: string;
          image?: string | null;
          doctorId?: string | null;
          employerDoctorId?: string | null;
          doctorStaffRole?: string | null;
        };
        u.id = token.id as string;
        u.role = token.role as string;
        /* مزامنة الدور من قاعدة البيانات (بعد ترقية مشرف يدوياً أو إصلاح بيانات) */
        if (u.id) {
          const { data: freshUser } = await supabaseAdmin
            .from("User")
            .select("role, employerDoctorId, doctorStaffRole")
            .eq("id", u.id)
            .maybeSingle();
          if (freshUser) {
            if (freshUser.role) u.role = freshUser.role;
            u.employerDoctorId = freshUser.employerDoctorId ?? null;
            u.doctorStaffRole = freshUser.doctorStaffRole ?? null;
          }
        }
        u.name = (token.name as string) ?? session.user?.name ?? "";
        u.phone = (token.phone as string) ?? "";
        u.image = (token.picture as string | null) ?? null;
        u.doctorId = (token.doctorId as string | null) ?? null;
        u.employerDoctorId = (token.employerDoctorId as string | null) ?? null;
        u.doctorStaffRole = (token.doctorStaffRole as string | null) ?? null;
        /* JWT قديم: إعادة جلب doctorId بعد إنشاء سجل Doctor لاحقاً */
        if (u.role === "DOCTOR" && u.id && !u.doctorId) {
          const { data: doc } = await supabaseAdmin
            .from("Doctor")
            .select("id")
            .eq("userId", u.id)
            .maybeSingle();
          if (doc?.id) u.doctorId = doc.id;
        } else if (
          (u.role === "DOCTOR_RECEPTION" || u.role === "DOCTOR_ASSISTANT") &&
          u.id &&
          !u.doctorId
        ) {
          const { data: row } = await supabaseAdmin
            .from("User")
            .select("employerDoctorId")
            .eq("id", u.id)
            .maybeSingle();
          if (row?.employerDoctorId) u.doctorId = row.employerDoctorId;
        }
      }
      return session;
    },
  },
});
