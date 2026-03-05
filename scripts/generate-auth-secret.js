#!/usr/bin/env node
/**
 * يولد AUTH_SECRET ويطبع السطر الذي تضعه في .env.local
 * Run: node scripts/generate-auth-secret.js
 */
const crypto = require("crypto");
const secret = crypto.randomBytes(32).toString("base64");
console.log("\nأضف السطر التالي إلى .env.local (أو Environment Variables في Vercel):\n");
console.log("AUTH_SECRET=" + secret);
console.log("\nثم أعد تشغيل السيرفر (npm run dev) أو أعد النشر على Vercel.\n");
