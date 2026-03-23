-- ============================================================
-- Supabase Storage Setup — مجلد الصور
-- شغّل هذا السكريبت في Supabase SQL Editor مرة واحدة
-- ============================================================

-- 1) إنشاء الـ bucket "avatars" إن لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,                     -- قابل للقراءة العامة (Public)
  5242880,                  -- 5 MB حد أقصى
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- ============================================================
-- 2) Policies
-- ============================================================

-- حذف الـ policies القديمة إن وجدت
DROP POLICY IF EXISTS "Public read avatars"     ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload avatar" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update avatar" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete avatar" ON storage.objects;

-- القراءة: متاح للجميع (الصور عامة)
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- الرفع: يسمح فقط لصاحب الملف
-- المجلدات: doctors/{userId}/avatar.* أو patients/{userId}/avatar.*
CREATE POLICY "Auth users upload avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    -- doctors/{userId}/... أو patients/{userId}/... أو admins/{userId}/...
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- التحديث: يسمح فقط لصاحب الملف
CREATE POLICY "Auth users update avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- الحذف: يسمح فقط لصاحب الملف
CREATE POLICY "Auth users delete avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
