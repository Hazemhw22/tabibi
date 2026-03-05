# خطأ 500 على `/api/auth/session` — There was a problem with the server configuration

## فهم الخطأ

عندما يطلب المتصفح **جلسة المستخدم** من `/api/auth/session` ويرجع الرد **500**، وتظهر في الواجهة رسالة:

> There was a problem with the server configuration. Check the server logs for more information.

فهذا يعني أن **إعداد Auth.js (NextAuth)** على الخادم غير مكتمل أو فيه خطأ. السبب الأكثر شيوعاً هو **غياب المتغير `AUTH_SECRET`** في بيئة التشغيل (مثلاً على Vercel).

- Auth.js يستخدم `AUTH_SECRET` لتوقيع وتشفير جلسات JWT.
- إذا لم يُضبط هذا المتغير، لا يستطيع الخادم معالجة طلبات الجلسة فيرجع 500.

مرجع: [Auth.js Errors](https://authjs.dev/reference/core/errors) (مثل `MissingSecret`).

## الحل

1. **إنشاء قيمة سرية (secret)**  
   في الطرفية نفّذ أحد الأمرين:
   ```bash
   npx auth secret
   ```
   أو:
   ```bash
   openssl rand -base64 33
   ```
   واستخدم الناتج كقيمة لـ `AUTH_SECRET`.

2. **إضافة المتغير في Vercel**
   - من لوحة المشروع: **Settings → Environment Variables**
   - اسم المتغير: `AUTH_SECRET`
   - القيمة: الناتج من الخطوة 1
   - اختر البيئة (Production / Preview / Development) ثم احفظ.

3. **إعادة النشر**
   - نفّذ إعادة Deploy للمشروع حتى تُحمّل المتغيرات الجديدة.

4. **التأكد من المتغيرات الأخرى إن وُجدت**
   - إذا كان تسجيل الدخول يعتمد على Supabase، تأكد أيضاً من:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
   في نفس صفحة Environment Variables.

بعد ضبط `AUTH_SECRET` (والمتغيرات الأخرى إن لزم)، طلب `/api/auth/session` يجب أن يعمل بدون 500.
