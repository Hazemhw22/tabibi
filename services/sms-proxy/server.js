import express from "express";

const app = express();
app.use(express.json({ limit: "256kb" }));

const PORT = process.env.PORT || 3005;

function requireAuth(req, res, next) {
  const secret = process.env.SMS_PROXY_SECRET;
  if (!secret) return res.status(500).json({ error: "SMS_PROXY_SECRET not set" });
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice("Bearer ".length) : "";
  if (!token || token !== secret) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

function buildSendUrl({ id, sender, to, msg }) {
  const baseUrl = process.env.SMS_API_URL || "http://astra.htd.ps/API/SendSMS.aspx";
  const url =
    `${baseUrl}?id=${encodeURIComponent(id)}` +
    `&sender=${encodeURIComponent(sender)}` +
    `&to=${encodeURIComponent(to)}` +
    `&msg=${encodeURIComponent(msg)}`;
  return url;
}

function buildCreditUrl({ id }) {
  const baseUrl = process.env.SMS_CREDIT_URL || "http://astra.htd.ps/API/GetCredit.aspx";
  return `${baseUrl}?id=${encodeURIComponent(id)}`;
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/send", requireAuth, async (req, res) => {
  try {
    const { to, msg } = req.body || {};
    if (!to || !msg) return res.status(400).json({ error: "to and msg are required" });
    const id = mustEnv("SMS_API_ID");
    const sender = process.env.SMS_SENDER || "Tabibi";
    const url = buildSendUrl({ id, sender, to, msg });

    const r = await fetch(url, { method: "GET" });
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: "Astra error", status: r.status, raw: text });
    return res.json({ ok: true, raw: text });
  } catch (e) {
    return res.status(500).json({ error: "Server error", message: e?.message || String(e) });
  }
});

app.get("/credit", requireAuth, async (_req, res) => {
  try {
    const id = mustEnv("SMS_API_ID");
    const url = buildCreditUrl({ id });
    const r = await fetch(url, { method: "GET" });
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: "Astra error", status: r.status, raw: text });
    return res.json({ ok: true, raw: text });
  } catch (e) {
    return res.status(500).json({ error: "Server error", message: e?.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`[sms-proxy] listening on :${PORT}`);
});

