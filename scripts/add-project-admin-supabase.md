# جعل hazemhaw221@gmail.com مسؤول المشروع من Supabase

## الخطوة 1: إنشاء المستخدم في المصادقة (إن لم يكن موجوداً)

1. افتح **Supabase Dashboard** → **Authentication** → **Users**.
2. اضغط **Add user** → **Create new user**.
3. أدخل:
   - **Email:** `hazemhaw221@gmail.com`
   - **Password:** `12345678`
4. اضغط **Create user**.
5. إن كان المستخدم موجوداً مسبقاً وتريد تغيير كلمة المرور: من قائمة المستخدمين اختر المستخدم → **⋮** → **Send password recovery** أو من **Authentication** → **Users** → اختر المستخدم → **Reset password** وأدخل `12345678`.

---

## الخطوة 2: إضافة/تحديث السجل في جدول User وتعيين الدور

1. اذهب إلى **SQL Editor** → **New query**.
2. الصق السكربت التالي ثم اضغط **Run**:

```sql
-- ربط المستخدم بجدول User وتعيينه مسؤول منصة (PLATFORM_ADMIN)
INSERT INTO public."User" (id, email, name, role, "createdAt", "updatedAt")
SELECT id, email, COALESCE(raw_user_meta_data->>'name', 'hazem'), 'PLATFORM_ADMIN', now(), now()
FROM auth.users
WHERE email = 'hazemhaw221@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'PLATFORM_ADMIN',
  name = COALESCE(EXCLUDED.name, public."User".name),
  "updatedAt" = now();

-- حتى يظهر الاسم والدور في الجلسة عند تسجيل الدخول
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name":"hazem","role":"PLATFORM_ADMIN"}'::jsonb
WHERE email = 'hazemhaw221@gmail.com';
```

---

## الخطوة 3: تسجيل الدخول من التطبيق

- **الرابط:** صفحة تسجيل الدخول في مشروعك (مثلاً `/login`).
- **البريد:** `hazemhaw221@gmail.com`
- **كلمة المرور:** `12345678`

بعد الدخول سيُعامل كمسؤول منصة (مشرف) ويمكنه الوصول إلى لوحة الأدمن.
