-- إصلاح أعمدة الجداول إذا كُوّنت سابقاً بدون اقتباس (Postgres يحوّلها إلى lowercase: doctorid، imageurl، ...)
-- شغّل هذا مرة واحدة في Supabase SQL Editor، ثم أعد تشغيل سياسات RLS من marketplace_offers_products.sql (جزء RLS فقط) إن لزم.

-- DoctorOffer
ALTER TABLE public."DoctorOffer" RENAME COLUMN doctorid TO "doctorId";
ALTER TABLE public."DoctorOffer" RENAME COLUMN imageurl TO "imageUrl";
ALTER TABLE public."DoctorOffer" RENAME COLUMN isactive TO "isActive";
ALTER TABLE public."DoctorOffer" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE public."DoctorOffer" RENAME COLUMN updatedat TO "updatedAt";

-- DoctorProduct
ALTER TABLE public."DoctorProduct" RENAME COLUMN doctorid TO "doctorId";
ALTER TABLE public."DoctorProduct" RENAME COLUMN imageurl TO "imageUrl";
ALTER TABLE public."DoctorProduct" RENAME COLUMN isactive TO "isActive";
ALTER TABLE public."DoctorProduct" RENAME COLUMN pickupavailable TO "pickupAvailable";
ALTER TABLE public."DoctorProduct" RENAME COLUMN deliveryavailable TO "deliveryAvailable";
ALTER TABLE public."DoctorProduct" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE public."DoctorProduct" RENAME COLUMN updatedat TO "updatedAt";

-- ProductOrder
ALTER TABLE public."ProductOrder" RENAME COLUMN productid TO "productId";
ALTER TABLE public."ProductOrder" RENAME COLUMN doctorid TO "doctorId";
ALTER TABLE public."ProductOrder" RENAME COLUMN patientuserid TO "patientUserId";
ALTER TABLE public."ProductOrder" RENAME COLUMN unitprice TO "unitPrice";
ALTER TABLE public."ProductOrder" RENAME COLUMN totalprice TO "totalPrice";
ALTER TABLE public."ProductOrder" RENAME COLUMN fulfillmentmethod TO "fulfillmentMethod";
ALTER TABLE public."ProductOrder" RENAME COLUMN deliveryaddress TO "deliveryAddress";
ALTER TABLE public."ProductOrder" RENAME COLUMN paymentmethod TO "paymentMethod";
ALTER TABLE public."ProductOrder" RENAME COLUMN createdat TO "createdAt";
ALTER TABLE public."ProductOrder" RENAME COLUMN updatedat TO "updatedAt";
