# المراكز الطبية

## 1) تطبيق قاعدة البيانات

نفّذ السكربت على PostgreSQL / Supabase SQL Editor:

```bash
# الملف: scripts/add-medical-center.sql
```

يتضمن:

- قيمة الدور `MEDICAL_CENTER_ADMIN` في الـ enum `Role`
- جداول `MedicalCenter` و `EmergencyVisit`
- أعمدة `User.medicalCenterId` و `Doctor.medicalCenterId`

> إذا فشل `ALTER TYPE ... ADD VALUE`، نفّذه كجملة منفصلة ثم باقي السكربت.

## 2) التدفق

1. **تسجيل مركز**: `/register/medical-center` → ينشئ مستخدم `MEDICAL_CENTER_ADMIN` + سجل `MedicalCenter`.
2. **ربط أطباء بالمركز**: من لوحة المنصة (مشرف) استدعِ:
   - `PATCH /api/admin/doctors/[doctorId]/medical-center`
   - Body: `{ "medicalCenterId": "<uuid>" }` أو `null` لإلغاء الربط.
3. **المريض**: `/medical-centers` → اختيار مركز → قائمة الأطباء → `/doctors/[id]` للحجز.
4. **لوحة المركز**: `/dashboard/medical-center` — أطباء، مرضى، حجوزات، طوارئ.

## 3) Prisma (اختياري)

بعد تطبيق SQL:

```bash
npx prisma generate
```

---

## ملفات مهمة

| المسار | الوصف |
|--------|--------|
| `src/app/(main)/medical-centers/` | قائمة وتفاصيل المركز للجمهور |
| `src/app/(main)/dashboard/medical-center/` | لوحة المركز |
| `src/app/api/medical-center/*` | APIs للمركز |
| `src/app/api/register/medical-center` | تسجيل مركز + مشرف |
