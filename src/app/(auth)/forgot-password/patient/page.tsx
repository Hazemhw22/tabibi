import { ForgotPasswordClient } from "../forgot-password-client";

export default function ForgotPasswordPatientPage() {
  return (
    <ForgotPasswordClient
      title="استعادة كلمة مرور المريض"
      description="أدخل رقم الهاتف المسجّل عند إنشاء الحساب. سنرسل لك رسالة نصية برابط لتعيين كلمة مرور جديدة وتأكيدها."
      loginLabel="رقم الهاتف"
      loginPlaceholder="05991234567"
    />
  );
}
