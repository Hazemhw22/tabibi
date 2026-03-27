# SMS Proxy (VPS) — Tabibi

خدمة وسيطة لتجاوز مشكلة Astra `H004|IP Not Allowed` عند النشر على Vercel (لأن Vercel لا يملك IP خروج ثابت).

## الفكرة
- تطبيق Tabibi (على Vercel) يرسل الطلب إلى هذا الـ VPS عبر `SMS_PROXY_URL`.
- الـ VPS يرسل إلى Astra من خلال IP ثابت (تعمله Astra whitelist).

## متطلبات البيئة على الـ VPS
- `SMS_PROXY_SECRET` سرّ مشترك (طويل).
- `SMS_API_ID` من Astra.
- `SMS_SENDER` (اختياري، افتراضي `Tabibi`).
- (اختياري) `SMS_API_URL` و `SMS_CREDIT_URL`.
- `PORT` (اختياري).

## تشغيل سريع

```bash
cd services/sms-proxy
npm i
SMS_PROXY_SECRET="CHANGE_ME" SMS_API_ID="YOUR_ASTRA_ID" npm start
```

## Health check
- `GET /health`

## إرسال
- `POST /send`
- Header: `Authorization: Bearer <SMS_PROXY_SECRET>`
- Body JSON: `{ "to": "97059xxxxxx", "msg": "..." }`

## رصيد
- `GET /credit`
- Header: `Authorization: Bearer <SMS_PROXY_SECRET>`

## ربطه داخل Tabibi (Vercel env)
اضف في Vercel Environment Variables:
- `SMS_PROXY_URL=https://your-vps-domain-or-ip:3005`
- `SMS_PROXY_SECRET=...`

