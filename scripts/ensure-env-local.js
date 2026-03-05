/**
 * إنشاء .env.local تلقائياً من .env.example إذا لم يكن موجوداً.
 * يُشغّل قبل npm run dev.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envLocal = path.join(root, ".env.local");
const envExample = path.join(root, ".env.example");

if (!fs.existsSync(envLocal) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envLocal);
  console.log("[setup] تم إنشاء .env.local من .env.example. أضف قيم Twilio الحقيقية ثم أعد التشغيل.");
}
