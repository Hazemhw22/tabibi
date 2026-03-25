import { ForgotPasswordClient } from "../forgot-password-client";

export default function ForgotPasswordDoctorPage() {
  return (
    <ForgotPasswordClient
      title="استعادة كلمة مرور الطبيب"
      description="أدخل البريد الإلكتروني المسجّل في حسابك. سنرسل رابطاً لتعيين كلمة مرور جديدة."
      loginLabel="البريد الإلكتروني"
      loginPlaceholder="doctor@example.com"
      preferEmail
    />
  );
}
