import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      /** معرف Doctor: للطبيب من جدول Doctor، لموظف العيادة من employerDoctorId */
      doctorId?: string | null;
      employerDoctorId?: string | null;
      doctorStaffRole?: string | null;
    } & DefaultSession["user"];
  }
}
