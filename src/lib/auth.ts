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
              .select("id, email, name, image, role, phone")
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
            .select("id, email, name, image, role, phone")
            .eq("id", data.user.id)
            .single();

          const meta = data.user.user_metadata;
          const u = userRow;

          return {
            id: data.user.id,
            email: data.user.email ?? u?.email ?? "",
            name: meta?.name ?? u?.name ?? "",
            image: meta?.image ?? u?.image ?? null,
            role: meta?.role ?? u?.role ?? "PATIENT",
            phone: meta?.phone ?? u?.phone ?? "",
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role?: string; id?: string; name?: string; phone?: string };
        token.role = u.role;
        token.id = u.id;
        token.name = u.name;
        token.phone = u.phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        const u = session.user as { id?: string; role?: string; name?: string; phone?: string };
        u.id = token.id as string;
        u.role = token.role as string;
        u.name = (token.name as string) ?? session.user?.name ?? "";
        u.phone = (token.phone as string) ?? "";
      }
      return session;
    },
  },
});
