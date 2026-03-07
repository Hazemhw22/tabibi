import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
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

        const { email, password } = parsed.data;

        try {
          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
          });

          if (error || !data.user) return null;

          const meta = data.user.user_metadata;

          return {
            id: data.user.id,
            email: data.user.email ?? "",
            name: meta?.name ?? "",
            image: meta?.image ?? null,
            role: meta?.role ?? "PATIENT",
            phone: meta?.phone ?? "",
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
