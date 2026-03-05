# إعداد Twilio لإرسال SMS عند إضافة دفعة أو خدمة

عند إضافة دفعة أو خدمة لمريض، يُرسل التطبيق رسالة SMS تلقائياً إلى رقم المريض.  
لتفعيل الإرسال يجب ضبط متغيرات Twilio.

## الخطوات

### 1. إنشاء حساب Twilio
- سجّل في [twilio.com](https://www.twilio.com/try-twilio)
- من [لوحة التحكم](https://console.twilio.com) احصل على:
  - **Account SID**
  - **Auth Token**
- اشترِ أو فعّل **رقم مرسل** يدعم SMS (لفلسطين/972 اختر رقم يحمل رمز +972 إن وُجد)

### 2. إضافة المتغيرات إلى `.env` أو `.env.local`

في مجلد المشروع (نفس مستوى `package.json`) أنشئ أو عدّل الملف `.env.local` وأضف:

```env
# Twilio - إرسال SMS للمرضى (دفعة/خدمة)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+972xxxxxxxxx
```

- **TWILIO_ACCOUNT_SID**: يبدأ عادةً بـ `AC` (من Twilio Console)
- **TWILIO_AUTH_TOKEN**: من Twilio Console → Auth Token
- **TWILIO_PHONE_NUMBER**: رقم المرسل بصيغة دولية، مثال: `+972501234567`

### 3. إعادة تشغيل السيرفر
بعد حفظ `.env.local` أعد تشغيل الأمر:
```bash
npm run dev
```

---

إذا لم تُضبط هذه المتغيرات، إضافة الدفعة/الخدمة تبقى تعمل ولا يُرسل أي SMS (ستظهر في الطرفية: `[SMS] Twilio غير مضبوط`).
