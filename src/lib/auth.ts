import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";
import { linkClinicPatientToUser } from "@/lib/link-clinic-patient";

const loginSchema = z.object({
  login: z.string().min(1, "أدخل رقم الهاتف أو البريد الإلكتروني"),
  password: z.string().optional(),
  token: z.string().optional(),
});

// AUTH_SECRET مطلوب في الإنتاج — بدونه سيعيد /api/auth/session 500 (راجع docs/auth-session-500.md)
export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  /** مطلوب في Auth.js v5 عند الاعتماد على Host من الطلب؛ بدونه قد يفشل تسجيل الدخول (Credentials) ويُرمى UntrustedHost. */
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { login, password, token } = parsed.data;
        const isEmail = login.includes("@");

        try {
          // --- OTP LOGIN CASE ---
          if (token) {
            const phone = login.trim();
            // 1. Verify token
            const { data: vToken, error: vError } = await supabaseAdmin
              .from("VerificationToken")
              .select("*")
              .eq("identifier", phone)
              .eq("token", token)
              .single();

            if (vError || !vToken || new Date(vToken.expires) < new Date()) {
              console.warn("[auth/otp] invalid or expired token for:", phone);
              return null;
            }

            // 2. Consume token
            await supabaseAdmin
              .from("VerificationToken")
              .delete()
              .eq("identifier", phone)
              .eq("token", token);

            // 3. Find or Create User
            const clean = phone.replace(/\D/g, "");
            const last9 = clean.slice(-9);
            const variations = [phone, clean, `+${clean}`, last9, `0${last9}`, `972${last9}`];
            
            let { data: userRow } = await supabaseAdmin
              .from("User")
              .select("id, email, name, image, role, phone, employerDoctorId, doctorStaffRole")
              .or(`phone.in.(${variations.join(",")}),email.eq.${phone}`)
              .limit(1)
              .maybeSingle();

            if (!userRow) {
              // Create new patient user
              const { data: newUser, error: createError } = await supabaseAdmin
                .from("User")
                .insert({
                  phone: phone,
                  role: "PATIENT",
                  name: "مريض جديد",
                  email: `${clean}@tabibi.app`, // placeholder email for Supabase Auth if needed
                })
                .select()
                .single();
              
              if (createError) {
                console.error("[auth/otp] failed to create user:", createError);
                return null;
              }
              userRow = newUser;
            }

            if (userRow) {
              // --- BRIDGING LOGIC ---
              await linkClinicPatientToUser(userRow.id, userRow.phone || phone);
            }

            return {
              id: userRow!.id,
              email: userRow!.email || "",
              name: userRow!.name || "",
              image: userRow!.image || null,
              role: userRow!.role || "PATIENT",
              phone: userRow!.phone || phone,
              employerDoctorId: userRow!.employerDoctorId || null,
              doctorStaffRole: userRow!.doctorStaffRole || null,
            };
          }

          // --- PASSWORD LOGIN CASE ---
          if (!password) return null;
          let emailToUse: string;

          if (isEmail) {
            emailToUse = login.trim().toLowerCase();
          } else {
            const digits = login.replace(/\D/g, "");
            const normalizedPhone = digits.slice(-9);
            const withZero = "0" + normalizedPhone;
            const with972 = "972" + normalizedPhone;
            const { data: userRow, error: phoneLookupErr } = await supabaseAdmin
              .from("User")
              .select("id, email, name, image, role, phone, employerDoctorId, doctorStaffRole")
              .or(`phone.eq.${normalizedPhone},phone.eq.${withZero},phone.eq.${with972},phone.eq.${login}`)
              .limit(1)
              .maybeSingle();
            if (phoneLookupErr) {
              console.error("[auth] phone lookup failed:", phoneLookupErr.code, phoneLookupErr.message, phoneLookupErr.details);
              return null;
            }
            if (!userRow?.email) return null;
            emailToUse = userRow.email;
          }

          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: emailToUse,
            password,
          });

          if (error || !data.user) {
            if (error) console.error("[auth] supabase signInWithPassword failed:", error.message);
            return null;
          }

          const { data: userRow, error: userLookupErr } = await supabaseAdmin
            .from("User")
            .select("id, email, name, image, role, phone, employerDoctorId, doctorStaffRole")
            .eq("id", data.user.id)
            .maybeSingle();
          if (userLookupErr) {
            console.error("[auth] user lookup failed:", userLookupErr.code, userLookupErr.message, userLookupErr.details);
            return null;
          }

          const meta = data.user.user_metadata as {
            name?: string;
            phone?: string;
            role?: string;
            image?: string;
          } | undefined;
          const u = userRow;

          /** جدول User هو مصدر الحقيقة للدور؛ user_metadata قد يكون قديماً أو غير متزامن مع Prisma */
          const role = u?.role ?? meta?.role ?? "PATIENT";

          if (u) {
            // Also run syncing for password login just in case
            await linkClinicPatientToUser(u.id, u.phone || "");
          }

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
          try {
            const { data: freshUser } = await supabaseAdmin
              .from("User")
              .select("role, employerDoctorId, doctorStaffRole")
              .eq("id", u.id)
              .maybeSingle();
            if (freshUser) {
              if (freshUser.role) u.role = freshUser.role;
              u.employerDoctorId = freshUser.employerDoctorId ?? null;
              u.doctorStaffRole = freshUser.doctorStaffRole ?? null;
              const r = freshUser.role ?? u.role;
              if (r === "DOCTOR_RECEPTION" || r === "DOCTOR_ASSISTANT") {
                u.doctorId = freshUser.employerDoctorId ?? u.doctorId ?? null;
              }
            }
          } catch (e) {
            console.error("[auth/session] User refresh failed:", e);
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
          try {
            const { data: doc } = await supabaseAdmin
              .from("Doctor")
              .select("id")
              .eq("userId", u.id)
              .maybeSingle();
            if (doc?.id) u.doctorId = doc.id;
          } catch (e) {
            console.error("[auth/session] Doctor lookup failed:", e);
          }
        } else if (
          (u.role === "DOCTOR_RECEPTION" || u.role === "DOCTOR_ASSISTANT") &&
          u.id &&
          !u.doctorId
        ) {
          try {
            const { data: row } = await supabaseAdmin
              .from("User")
              .select("employerDoctorId")
              .eq("id", u.id)
              .maybeSingle();
            if (row?.employerDoctorId) u.doctorId = row.employerDoctorId;
          } catch (e) {
            console.error("[auth/session] employerDoctorId lookup failed:", e);
          }
        }
      }
      return session;
    },
  },
});
