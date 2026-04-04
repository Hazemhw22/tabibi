import { ForgotPasswordClient } from "../forgot-password-client";

export default function ForgotPasswordPatientPage() {
  return (
    <ForgotPasswordClient
      title="استعادة كلمة مرور المريض"
      description="أدخل رقم الهاتف المسجّل في حسابك. سنرسل لك رمز تأكيد عبر SMS لتغيير كلمة المرور."
      loginLabel="رقم الهاتف"
      loginPlaceholder="0599123456"
    />
  );
}
