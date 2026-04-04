import { ForgotPasswordClient } from "../forgot-password-client";

export default function ForgotPasswordDoctorPage() {
  return (
    <ForgotPasswordClient
      title="استعادة كلمة مرور الطبيب"
      description="أدخل رقم الهاتف المسجّل في حسابك. سنرسل رمز تأكيد عبر SMS لتغيير كلمة المرور."
      loginLabel="رقم الهاتف"
      loginPlaceholder="0599123456"
    />
  );
}
