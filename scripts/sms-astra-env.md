# إعداد Astra لإرسال SMS عند إضافة دفعة أو خدمة

عند إضافة دفعة أو خدمة لمريض، يُرسل التطبيق رسالة SMS تلقائياً عبر Astra API.

## المتغيرات في `.env.local`

```env
# Astra SMS
SMS_API_ID=383e6bfc179d120e52de0da4d05e6ccd
SMS_SENDER=Tabibi
```

- **SMS_API_ID**: مفتاح API (مطلوب)
- **SMS_SENDER**: اسم المرسل (اختياري، الافتراضي: Tabibi)

## API المستخدم

```
GET http://astra.htd.ps/API/SendSMS.aspx?id=xxx&sender=Tabibi&to=970xxxxxxxx&msg=...
```

- **to**: رقم الهاتف بصيغة 970xxxxxxxx (يُحوّل تلقائياً من 0599xxx)

إذا لم تُضبط `SMS_API_ID`، لا يُرسل أي SMS ولا يفشل الطلب.
