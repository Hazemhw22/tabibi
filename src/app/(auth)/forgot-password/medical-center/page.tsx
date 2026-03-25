import { ForgotPasswordClient } from "../forgot-password-client";

export default function ForgotPasswordMedicalCenterPage() {
  return (
    <ForgotPasswordClient
      title="استعادة كلمة مرور المركز الطبي"
      description="أدخل بريد مسؤول المركز المسجّل عند التسجيل. سنرسل رابطاً لتعيين كلمة مرور جديدة."
      loginLabel="البريد الإلكتروني"
      loginPlaceholder="center@example.com"
      preferEmail
    />
  );
}
