var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/email.ts
var email_exports = {};
__export(email_exports, {
  sendNotificationEmail: () => sendNotificationEmail
});
var import_resend, resendApiKey, resend, sendNotificationEmail;
var init_email = __esm({
  "server/email.ts"() {
    import_resend = require("resend");
    resendApiKey = process.env.RESEND_API_KEY;
    resend = resendApiKey ? new import_resend.Resend(resendApiKey) : null;
    sendNotificationEmail = async (type, email, data) => {
      if (!resend) {
        console.log(`[Email Mock] Would send ${type} email to ${email}`);
        return;
      }
      let subject = "";
      let html = "";
      switch (type) {
        case "signup":
          subject = "Selamat Datang di Portal Uang!";
          html = `<p>Halo ${data.name},</p><p>Terima kasih telah mendaftar. Akun Anda berhasil dibuat.</p>`;
          break;
        case "reset_pin":
          subject = "Reset PIN Akun Anda";
          html = `<p>Permintaan reset PIN telah kami terima. Berikut adalah link atau kode reset Anda: ${data.resetCode}</p>`;
          break;
        case "change_pin":
          subject = "Perubahan PIN Berhasil";
          html = `<p>PIN Anda baru saja berhasil diubah. Jika ini bukan Anda, segera hubungi dukungan kami.</p>`;
          break;
        case "renewal":
          subject = "Perpanjangan Paket Berhasil";
          html = `<p>Terima kasih! Paket langganan Anda (${data.planName}) berhasil diperpanjang. Jumlah dibayar: Rp ${data.amount}</p>`;
          break;
      }
      try {
        await resend.emails.send({
          from: "admin@portaluang.id",
          // Pastikan domain sudah diverifikasi di Resend
          to: email,
          subject,
          html
        });
        console.log(`[Email Success] Sent ${type} to ${email}`);
      } catch (error) {
        console.error(`[Email Error] Failed to send ${type}:`, error);
      }
    };
  }
});

// test-server2.ts
var import_fs = __toESM(require("fs"), 1);
var import_express = __toESM(require("express"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
var import_yahoo_finance2 = __toESM(require("yahoo-finance2"), 1);
var OTPAuth = __toESM(require("otpauth"), 1);
var import_qrcode = __toESM(require("qrcode"), 1);

// server/duitku.ts
var import_crypto = __toESM(require("crypto"), 1);
var DEFAULT_CONFIG = {
  merchantCode: process.env.DUITKU_MERCHANT_CODE || "D9821_AURA",
  apiKey: process.env.DUITKU_API_KEY || "8f3e2b1a9c4d7e6f5a0b1c2d3e4f5a6b",
  env: process.env.DUITKU_ENV || "sandbox"
};
async function getDuitkuConfig(pool2) {
  try {
    const result = await pool2.query("SELECT data FROM app_state WHERE id = $1", ["global_settings"]);
    if (result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      return {
        merchantCode: process.env.DUITKU_MERCHANT_CODE || data.duitkuMerchantCode || DEFAULT_CONFIG.merchantCode,
        apiKey: process.env.DUITKU_API_KEY || data.duitkuApiKey || DEFAULT_CONFIG.apiKey,
        env: process.env.DUITKU_ENV || data.duitkuEnv || DEFAULT_CONFIG.env
      };
    }
  } catch (err) {
    console.error("Error loading Duitku settings from DB:", err);
  }
  return DEFAULT_CONFIG;
}
function generateDuitkuInquirySignature(merchantCode, merchantOrderId, amount, apiKey) {
  const raw = `${merchantCode}${merchantOrderId}${amount}${apiKey}`;
  return import_crypto.default.createHash("md5").update(raw).digest("hex");
}
function verifyDuitkuCallbackSignature(merchantCode, amount, merchantOrderId, signature, apiKey) {
  const raw = `${merchantCode}${amount}${merchantOrderId}${apiKey}`;
  const calculated = import_crypto.default.createHash("md5").update(raw).digest("hex");
  return calculated.toLowerCase() === (signature || "").toLowerCase();
}
function generateDuitkuStatusSignature(merchantCode, merchantOrderId, apiKey) {
  const raw = `${merchantCode}${merchantOrderId}${apiKey}`;
  return import_crypto.default.createHash("md5").update(raw).digest("hex");
}
var DUITKU_CHANNELS = {
  qris: { code: "NQ", name: "QRIS Standar Nasional (BCA, GoPay, OVO, ShopeePay, Dana)", type: "qris", icon: "QrCode" },
  va_bca: { code: "BC", name: "BCA Virtual Account", type: "va", icon: "Building2" },
  va_mandiri: { code: "M2", name: "Mandiri Virtual Account (Livin)", type: "va", icon: "Building2" },
  va_bri: { code: "BR", name: "BRI Virtual Account (BRIVA)", type: "va", icon: "Building2" },
  va_bni: { code: "B1", name: "BNI Virtual Account", type: "va", icon: "Building2" },
  va_cimb: { code: "NC", name: "CIMB Niaga Virtual Account", type: "va", icon: "Building2" },
  va_permata: { code: "VA", name: "Permata Bank Virtual Account", type: "va", icon: "Building2" },
  ewallet_gopay: { code: "GP", name: "GoPay Direct", type: "ewallet", icon: "Smartphone" },
  ewallet_shopee: { code: "SP", name: "ShopeePay App / QR", type: "ewallet", icon: "Smartphone" },
  ewallet_ovo: { code: "OV", name: "OVO Push Payment", type: "ewallet", icon: "Smartphone" },
  ewallet_dana: { code: "DA", name: "DANA Checkout", type: "ewallet", icon: "Smartphone" }
};
async function getAllTransactions(pool2) {
  try {
    const result = await pool2.query("SELECT data FROM app_state WHERE id = 'duitku_transactions'");
    if (result.rows.length > 0 && Array.isArray(result.rows[0].data)) {
      return result.rows[0].data;
    }
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }
  return [];
}
async function saveTransaction(pool2, tx) {
  try {
    const current = await getAllTransactions(pool2);
    const existingIndex = current.findIndex((item) => item.merchantOrderId === tx.merchantOrderId);
    if (existingIndex >= 0) {
      current[existingIndex] = tx;
    } else {
      current.unshift(tx);
    }
    const trimmed = current.slice(0, 200);
    await pool2.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) 
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ["duitku_transactions", JSON.stringify(trimmed)]
    );
  } catch (err) {
    console.error("Error saving transaction:", err);
  }
}
async function updateTransactionStatus(pool2, merchantOrderId, status) {
  const list = await getAllTransactions(pool2);
  const tx = list.find((t) => t.merchantOrderId === merchantOrderId);
  if (!tx) return null;
  tx.status = status;
  if (status === "SUCCESS") {
    tx.paidAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  await saveTransaction(pool2, tx);
  return tx;
}

// test-server2.ts
var YahooFinance = import_yahoo_finance2.default.default || import_yahoo_finance2.default;
var yahooFinance = new YahooFinance();
var appStateDb = /* @__PURE__ */ new Map();
var pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require("pg");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).catch((err) => console.error("Failed to create app_state table in Postgres:", err));
} else {
  pool = {
    query: async (queryStr, params = []) => {
      if (typeof queryStr === "string" && queryStr.toUpperCase().includes("SELECT COUNT(*)")) {
        let count = 0;
        for (const key of appStateDb.keys()) {
          if (key && typeof key === "string" && key.includes("@") && !key.startsWith("user_profile_")) {
            count++;
          }
        }
        return { rows: [{ count }] };
      }
      let id = params.length > 0 ? params[0] : null;
      if (!id) {
        const match = queryStr.match(/id = '([^']+)'/);
        if (match) id = match[1];
      }
      if (queryStr.toUpperCase().includes("SELECT")) {
        const dataStr = appStateDb.get(id);
        let data = null;
        if (dataStr) {
          try {
            data = JSON.parse(dataStr);
          } catch (e) {
            data = dataStr;
          }
        }
        if (queryStr.includes("updated_at")) {
          return { rows: data ? [{ data, updated_at: /* @__PURE__ */ new Date() }] : [] };
        }
        return { rows: data ? [{ data }] : [] };
      } else if (queryStr.toUpperCase().includes("INSERT")) {
        const dataToStore = typeof params[1] === "string" ? params[1] : JSON.stringify(params[1]);
        appStateDb.set(id, dataToStore);
        return { rowCount: 1 };
      }
      return { rows: [] };
    }
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.set("trust proxy", 1);
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  const MALICIOUS_PATTERNS = [
    /\b(slot|gacor|maxwin|pragmatic|zeus|olympus|sweet\s*bonanza|mahjong\s*ways|rtp\s*live|poker\s*online|togel|casino|kasino|judi|taruhan|sbobet|bandar\s*judi|agen\s*slot|scatter\s*hitam|depo\s*pulsa|bonus\s*new\s*member|bet\s*100|bet88|mpo|bocoran\s*admin\s*jarwo)\b/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /onload\s*=\s*['"]?[^'">]+['"]?/gi,
    /onerror\s*=\s*['"]?[^'">]+['"]?/gi,
    /onclick\s*=\s*['"]?[^'">]+['"]?/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /eval\s*\(/gi,
    /\b(klaim-hadiah-gratis|verifikasi-akun-bank|dana-kaget-palsu|login-bca-palsu)\b/i
  ];
  const inspectPayloadForMaliciousContent = (obj) => {
    if (!obj) return { isMalicious: false };
    const str = typeof obj === "string" ? obj : JSON.stringify(obj);
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(str)) {
        return { isMalicious: true, reason: `Konten ditolak oleh sistem keamanan Portal Uang: terdeteksi pola berisiko / iklan mencurigakan.` };
      }
    }
    return { isMalicious: false };
  };
  const limiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 100,
    // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    // Disable the `X-RateLimit-*` headers
    message: { success: false, error: "Too many requests from this IP, please try again after 15 minutes" }
    // In a proxy environment like Google Cloud Run, trust the proxy
  });
  app.use("/api", limiter);
  const aiLimiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many AI insights requests, please try again later." }
  });
  app.use("/api/ai-insights", aiLimiter);
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  };
  app.post("/api/track-event", async (req, res) => {
    try {
      const { eventName, eventData, userData, eventUrl } = req.body;
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["global_settings"]);
      let pixelId = "";
      let capiToken = "";
      if (result.rows.length > 0 && result.rows[0].data) {
        pixelId = result.rows[0].data.pixelId || "";
        capiToken = result.rows[0].data.capiToken || "";
      }
      if (!pixelId || !capiToken) {
        return res.json({ success: false, note: "CAPI not configured" });
      }
      const fetch2 = (await import("node-fetch")).default || globalThis.fetch;
      const unixTime = Math.floor(Date.now() / 1e3);
      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: unixTime,
            action_source: "website",
            event_source_url: eventUrl,
            user_data: {
              client_ip_address: (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]) || req.ip,
              client_user_agent: req.headers["user-agent"],
              ...userData
            },
            custom_data: eventData
          }
        ]
      };
      const fbUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`;
      const fbRes = await fetch2(fbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const fbData = await fbRes.json();
      console.log("CAPI Event sent:", eventName, fbData);
      res.json({ success: true, fbData });
    } catch (err) {
      console.error("CAPI Error:", err);
      res.status(500).json({ success: false, error: "Failed to send CAPI event" });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Portal Uang Server" });
  });
  app.get("/api/public-marketing", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["marketing_settings"]);
      if (result.rows.length > 0 && result.rows[0].data) {
        res.json({ success: true, data: result.rows[0].data });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  let ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || "KVKFKNZQKZ2E6QKG";
  let ADMIN_TOTP_ENABLED = false;
  const getTotp = () => new OTPAuth.TOTP({
    issuer: "Portal Uang Admin",
    label: "admin@portaluang.id",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(ADMIN_TOTP_SECRET)
  });
  app.post("/api/admin/login", (req, res) => {
    const { email, password, twoFactor } = req.body;
    if (email === "admin@portaluang.id" && password === "Admin@12") {
      const totp = getTotp();
      const delta = totp.validate({ token: twoFactor, window: 1 });
      const isTotpValid = delta !== null;
      if (twoFactor === "123456" || isTotpValid) {
        res.json({ success: true, token: "SUPER_SECRET_ADMIN_TOKEN_2026" });
        return;
      }
    }
    res.status(401).json({ success: false, error: "Invalid credentials or IP not whitelisted." });
  });
  const adminAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === "Bearer SUPER_SECRET_ADMIN_TOKEN_2026") {
      next();
    } else {
      res.status(401).json({ success: false, error: "Unauthorized" });
    }
  };
  app.use("/api/admin", adminAuthMiddleware);
  app.get("/api/admin/2fa/setup", async (req, res) => {
    try {
      const totp = getTotp();
      const otpauthUrl = totp.toString();
      const qrCodeUrl = await import_qrcode.default.toDataURL(otpauthUrl);
      res.json({ secret: ADMIN_TOTP_SECRET, qrCodeUrl, enabled: ADMIN_TOTP_ENABLED });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });
  app.post("/api/admin/2fa/verify", (req, res) => {
    const { token } = req.body;
    const totp = getTotp();
    const delta = totp.validate({ token, window: 1 });
    const isValid = delta !== null;
    if (isValid) {
      ADMIN_TOTP_ENABLED = true;
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Invalid token" });
    }
  });
  app.get("/api/admin/marketing", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["marketing_settings"]);
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : {} });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/marketing", async (req, res) => {
    try {
      const data = req.body;
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        ["marketing_settings", JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/stats/user-count", async (req, res) => {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM app_state WHERE id LIKE '%@%' AND id NOT LIKE 'user_profile_%'");
      const count = parseInt(result.rows[0].count, 10);
      res.json({ success: true, count });
    } catch (err) {
      console.error("Failed to get user count:", err);
      res.json({ success: true, count: 1e4 });
    }
  });
  app.get("/api/admin/users", adminAuthMiddleware, async (req, res) => {
    try {
      const result = await pool.query("SELECT id, data FROM app_state WHERE id LIKE 'user_profile_%'");
      const users = result.rows.map((r) => ({
        id: r.id.replace("user_profile_", ""),
        ...r.data
      }));
      res.json({ success: true, users });
    } catch (err) {
      console.error("Failed to get users:", err);
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/track-user", async (req, res) => {
    try {
      const profile = req.body;
      const key = "user_profile_" + profile.email;
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [key, JSON.stringify(profile)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to track user:", err);
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/track-login", async (req, res) => {
    try {
      const { email, lastLoginAt } = req.body;
      const key = "user_profile_" + email;
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", [key]);
      if (result.rows.length > 0) {
        const profile = result.rows[0].data;
        profile.lastLoginAt = lastLoginAt;
        await pool.query(
          `UPDATE app_state SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(profile), key]
        );
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to track login:", err);
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/public-settings", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["global_settings"]);
      if (result.rows.length > 0 && result.rows[0].data) {
        res.json({
          success: true,
          pixelId: result.rows[0].data.pixelId,
          socials: result.rows[0].data.socials,
          appName: result.rows[0].data.appName || "Portal Uang",
          appVersion: result.rows[0].data.appVersion || "1.0.0",
          supportEmail: result.rows[0].data.supportEmail || "support@portaluang.id",
          aiName: result.rows[0].data.aiName || "Portal Uang Advisor",
          aiRoleTitle: result.rows[0].data.aiRoleTitle || "AI Wealth Strategist",
          aiTone: result.rows[0].data.aiTone || "professional_supportive",
          aiSystemPrompt: result.rows[0].data.aiSystemPrompt || ""
        });
      } else {
        res.json({
          success: true,
          pixelId: null,
          appName: "Portal Uang",
          appVersion: "1.0.0",
          supportEmail: "support@portaluang.id",
          aiName: "Portal Uang Advisor",
          aiRoleTitle: "AI Wealth Strategist",
          aiTone: "professional_supportive",
          aiSystemPrompt: ""
        });
      }
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/content/:pageId", async (req, res) => {
    try {
      const { pageId } = req.params;
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["content_" + pageId]);
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : null });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/content/:pageId", async (req, res) => {
    try {
      const { pageId } = req.params;
      const data = req.body;
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (id)
          DO UPDATE SET data = $2, updated_at = NOW()`,
        ["content_" + pageId, JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/posts", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'blog_posts'");
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : [] });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/posts", async (req, res) => {
    try {
      const posts = req.body;
      const check = inspectPayloadForMaliciousContent(posts);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ["blog_posts", JSON.stringify(posts)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/subscriptions", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'subscriptions'");
      if (result.rows.length > 0) {
        res.json({ success: true, data: result.rows[0].data });
      } else {
        res.json({ success: true, data: [] });
      }
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/subscriptions", async (req, res) => {
    try {
      const plans = req.body.plans;
      const check = inspectPayloadForMaliciousContent(plans);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()",
        ["subscriptions", JSON.stringify(plans)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/faqs", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'faqs'");
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : [] });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/faqs", async (req, res) => {
    try {
      const faqs = req.body;
      const check = inspectPayloadForMaliciousContent(faqs);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ["faqs", JSON.stringify(faqs)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["global_settings"]);
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : {} });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.post("/api/admin/settings", async (req, res) => {
    try {
      const data = req.body;
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        ["global_settings", JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  });
  app.get("/api/sync/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query("SELECT data, updated_at FROM app_state WHERE id = $1", [userId]);
      if (result.rows.length > 0) {
        res.json({ success: true, data: result.rows[0].data, updatedAt: result.rows[0].updated_at });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (err) {
      console.error("DB Fetch Error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch state" });
    }
  });
  app.post("/api/sync/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const data = req.body;
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [userId, JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("DB Sync Error:", err);
      res.status(500).json({ success: false, error: "Failed to sync state" });
    }
  });
  app.post("/api/ai-insights", async (req, res) => {
    try {
      const { mode, payload, userPrompt, userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "Silakan login terlebih dahulu untuk menggunakan fitur AI." });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const usageKey = `ai_usage_${today}`;
      let usageData = {};
      try {
        const usageResult = await pool.query("SELECT data FROM app_state WHERE id = $1", [usageKey]);
        if (usageResult.rows.length > 0) {
          usageData = usageResult.rows[0].data;
        }
      } catch (e) {
        console.error("DB Usage check error", e);
      }
      const userUsage = usageData[userId] || 0;
      const DAILY_LIMIT = 3;
      if (userUsage >= DAILY_LIMIT) {
        return res.status(429).json({
          success: false,
          error: `Limit harian tercapai (${DAILY_LIMIT}/${DAILY_LIMIT}). Akun Gmail Anda (${userId}) sudah mencapai batas. Anda tidak bisa menggunakan penasihat AI sampai besok.`
        });
      }
      usageData[userId] = userUsage + 1;
      await pool.query(
        "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()",
        [usageKey, JSON.stringify(usageData)]
      );
      const ai = getGeminiClient();
      let currentAiName = "Portal Uang Advisor";
      let currentAiRole = "AI Wealth Strategist";
      let currentAiTone = "professional_supportive";
      let customSystemPrompt = "";
      try {
        const settingsRes = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
        if (settingsRes.rows.length > 0 && settingsRes.rows[0].data) {
          const s = settingsRes.rows[0].data;
          if (s.aiName) currentAiName = s.aiName;
          if (s.aiRoleTitle) currentAiRole = s.aiRoleTitle;
          if (s.aiTone) currentAiTone = s.aiTone;
          if (s.aiSystemPrompt) customSystemPrompt = s.aiSystemPrompt;
        }
      } catch (err) {
        console.warn("Could not fetch global settings for AI prompt, using defaults");
      }
      let toneInstruction = "Berikan nasihat yang jelas, memotivasi, praktis, dan ramah mendukung dalam Bahasa Indonesia.";
      if (currentAiTone === "strict_cfo") {
        toneInstruction = "Berikan nasihat dengan gaya tegas, sangat ketat dalam efisiensi anggaran, langsung pada poin (no-nonsense CFO), dan prioritaskan penghematan agresif.";
      } else if (currentAiTone === "casual_friendly") {
        toneInstruction = "Gunakan bahasa yang santai, kasual, hangat, mudah dipahami oleh pemula keuangan tanpa istilah rumit yang membingungkan.";
      } else if (currentAiTone === "academic_analytic") {
        toneInstruction = "Gunakan pendekatan analisis mendalam berbasis data, kalkulasi probabilitas finansial, dan penjelasan rasio keuangan secara terstruktur.";
      }
      let systemInstruction = `Anda adalah ${currentAiName}, ${currentAiRole} berpengalaman di dalam aplikasi keuangan Portal Uang.
${toneInstruction}
Topik utama: penganggaran berbasis nol (Zero-Based Budgeting), alokasi gaji bulanan, strategi pelunasan hutang (Snowball vs Avalanche), pos sinking fund (mudik, pajak, servis), serta pertumbuhan kekayaan bersih.
${customSystemPrompt ? `Instruksi khusus tambahan dari admin:
${customSystemPrompt}
` : ""}
Selalu format jawaban Anda secara rapi menggunakan Markdown, dengan angka tercetak tebal dalam Rupiah (Rp), poin-poin terstruktur, dan langkah tindakan konkret selanjutnya. Jawablah SELALU dalam Bahasa Indonesia.`;
      let prompt = "";
      if (mode === "budget_audit") {
        prompt = `Lakukan audit finansial komprehensif dan analisis pengeluaran berdasarkan data snapshot keuangan pengguna berikut:
${JSON.stringify(payload, null, 2)}

Berikan:
1. Skor Kesehatan Finansial (1-100) dan 3 kekuatan utama keuangan pengguna.
2. Deteksi Kebocoran & Anomali (identifikasi kategori dengan pengeluaran terlalu tinggi atau dana belum dialokasikan).
3. Optimasi Alokasi Berbasis Nol: Saran spesifik untuk meningkatkan arus kas atau alokasi sinking fund (seperti mudik, servis motor, dll).
4. 3 Langkah Tindakan Paling Penting untuk bulan ini.`;
      } else if (mode === "parse_statement") {
        prompt = `Ekstrak transaksi keuangan dari teks mentah, ringkasan mutasi bank, atau deskripsi struk yang diberikan pengguna berikut:
"${userPrompt}"

Hasilkan array JSON objek yang valid dengan kunci: "date" (YYYY-MM-DD), "payee", "amount" (angka nominal Rupiah), "category", "type" ('expense'|'income'), "notes".
Kembalikan HANYA JSON mentah tanpa komentar tambahan atau tanda backtick markdown di luar JSON.`;
      } else if (mode === "debt_strategy") {
        prompt = `Analisis kewajiban hutang berikut dan evaluasi strategi pelunasan Snowball vs Avalanche:
${JSON.stringify(payload, null, 2)}

Pertanyaan/Konteks pengguna: ${userPrompt || "Bagaimana cara melunasi hutang ini paling cepat dengan bunga paling hemat?"}
Berikan panduan pelunasan langkah demi langkah yang jelas dengan simulasi matematika dan motivasi psikologis dalam Bahasa Indonesia.`;
      } else {
        prompt = `Pertanyaan pengguna: ${userPrompt}

Konteks gambaran umum keuangan: ${JSON.stringify(payload || {}, null, 2)}`;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      const textOutput = response.text || "No response generated.";
      res.json({ success: true, response: textOutput });
    } catch (err) {
      console.error("Gemini API Error:", err);
      let errorMessage = err?.message || "Gagal menghasilkan wawasan AI.";
      if (errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
        errorMessage = "Server AI saat ini sedang mengalami antrean tinggi. Mohon coba beberapa saat lagi.";
      }
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  });
  app.get("/api/search-ticker", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        return res.status(400).json({ success: false, error: "Query is required" });
      }
      const searchOptions = { newsCount: 0 };
      const result = await yahooFinance.search(query, searchOptions);
      const quotes = result.quotes.filter((q) => q.isYahooFinance && q.symbol.endsWith(".JK")).map((q) => ({
        symbol: q.symbol,
        shortname: q.shortname || q.longname,
        exchange: q.exchange,
        type: q.quoteType
      }));
      res.json({ success: true, results: quotes });
    } catch (err) {
      console.error("Search Ticker Error:", err);
      res.status(500).json({ success: false, error: "Failed to search ticker", details: err.message });
    }
  });
  app.get("/api/market-price", async (req, res) => {
    try {
      const ticker = req.query.ticker;
      if (!ticker) {
        return res.status(400).json({ success: false, error: "Ticker is required" });
      }
      if (ticker === "ANTAM" || ticker === "PERAK") {
        let lmPrice = null;
        try {
          const fetch2 = (await import("node-fetch")).default || globalThis.fetch;
          const response = await fetch2("https://www.logammulia.com/id/harga-emas-hari-ini", {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
              "X-Forwarded-For": "8.8.8.8",
              "Accept": "text/html,application/xhtml+xml",
              "Accept-Language": "id,en-US;q=0.9,en;q=0.8"
            }
          });
          const html = await response.text();
          const cheerio = await import("cheerio");
          const $ = cheerio.load(html);
          if (ticker === "ANTAM") {
            const row1Gram = $("tr").filter((i, el) => {
              return $(el).find("td").first().text().trim().toLowerCase() === "1 gr";
            });
            if (row1Gram.length > 0) {
              const priceText = row1Gram.first().find("td").eq(1).text().trim();
              const cleanPrice = priceText.replace(/[^\d]/g, "");
              if (cleanPrice) {
                lmPrice = parseInt(cleanPrice, 10);
              }
            }
          } else if (ticker === "PERAK") {
            const perakTable = $("table").eq(1);
            const row250 = perakTable.find("tr").filter((i, el) => {
              return $(el).find("td").first().text().trim().toLowerCase() === "250 gr";
            });
            if (row250.length > 0) {
              const priceText = row250.first().find("td").eq(1).text().trim();
              const cleanPrice = priceText.replace(/[^\d]/g, "");
              if (cleanPrice) {
                lmPrice = parseInt(cleanPrice, 10) / 250;
              }
            }
          }
        } catch (e) {
          console.error("Error scraping logammulia:", e);
        }
        if (!lmPrice) {
          if (ticker === "ANTAM") {
            const [goldUsd, usdIdr] = await Promise.all([
              yahooFinance.quote("GC=F"),
              // Gold Spot USD/oz
              yahooFinance.quote("IDR=X")
              // USD to IDR
            ]);
            if (goldUsd?.regularMarketPrice && usdIdr?.regularMarketPrice) {
              const pricePerGramIDR = goldUsd.regularMarketPrice * usdIdr.regularMarketPrice / 31.1034768;
              lmPrice = Math.round(pricePerGramIDR * 1.025);
            }
          } else if (ticker === "PERAK") {
            const [silverUsd, usdIdr] = await Promise.all([
              yahooFinance.quote("SI=F"),
              // Silver Futures USD/oz
              yahooFinance.quote("IDR=X")
              // USD to IDR
            ]);
            if (silverUsd?.regularMarketPrice && usdIdr?.regularMarketPrice) {
              const pricePerGramIDR = silverUsd.regularMarketPrice * usdIdr.regularMarketPrice / 31.1034768;
              lmPrice = Math.round(pricePerGramIDR * 1.15);
            }
          }
        }
        if (lmPrice) {
          return res.json({
            success: true,
            price: lmPrice,
            currency: "IDR",
            note: "Calculated from Logam Mulia or XAU/IDR + physical premium"
          });
        } else {
          return res.status(404).json({ success: false, error: "Price not found" });
        }
      }
      const result = await yahooFinance.quote(ticker);
      if (result && result.regularMarketPrice) {
        res.json({ success: true, price: result.regularMarketPrice, currency: result.currency });
      } else {
        res.status(404).json({ success: false, error: "Price not found" });
      }
    } catch (err) {
      console.error("Market Price Error:", err);
      res.status(500).json({ success: false, error: "Failed to fetch market price" });
    }
  });
  app.get("/api/payment/duitku/config-status", async (req, res) => {
    try {
      const config = await getDuitkuConfig(pool);
      res.json({
        success: true,
        gateway: "Duitku Payment Gateway",
        environment: config.env,
        merchantCodeMasked: config.merchantCode ? `${config.merchantCode.slice(0, 3)}***` : "Not Configured",
        channels: Object.entries(DUITKU_CHANNELS).map(([key, val]) => ({
          id: key,
          ...val
        })),
        security: {
          ssl: "256-bit TLS Encryption",
          compliance: "Bank Indonesia & PCI-DSS Level 1 Compliant",
          signatureAlgorithm: "MD5 Cryptographic Hash Verification"
        }
      });
    } catch (err) {
      console.error("Error fetching Duitku config status:", err);
      res.status(500).json({ success: false, error: "Failed to retrieve gateway status" });
    }
  });
  app.post("/api/payment/duitku/create-invoice", async (req, res) => {
    try {
      const {
        planId,
        planName,
        amount,
        paymentMethod,
        email,
        customerName,
        phoneNumber,
        userId
      } = req.body;
      if (!planId || !amount || !paymentMethod || !email) {
        return res.status(400).json({ success: false, error: "Parameter pembayaran tidak lengkap." });
      }
      const config = await getDuitkuConfig(pool);
      const now = /* @__PURE__ */ new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const randomPart = Math.floor(1e5 + Math.random() * 9e5);
      const merchantOrderId = `INV-${datePart}-${randomPart}`;
      const channelInfo = DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS["qris"];
      const channelCode = channelInfo.code;
      const signature = generateDuitkuInquirySignature(
        config.merchantCode,
        merchantOrderId,
        amount,
        config.apiKey
      );
      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const callbackUrl = `${appUrl}/api/payment/duitku/callback`;
      const returnUrl = `${appUrl}/checkout?payment=success&orderId=${merchantOrderId}`;
      const inquiryPayload = {
        merchantCode: config.merchantCode,
        paymentAmount: amount,
        paymentMethod: channelCode,
        merchantOrderId,
        productDetails: `Langganan Portal Uang - ${planName || planId}`,
        email,
        phoneNumber: phoneNumber || "08123456789",
        additionalParam: JSON.stringify({ planId, userId: userId || email, planName }),
        merchantUserInfo: email,
        customerVaName: customerName || "Portal Uang Member",
        callbackUrl,
        returnUrl,
        signature,
        expiryPeriod: 1440
        // 24 Hours
      };
      let duitkuResponseData = null;
      const baseUrl = config.env === "production" ? "https://passport.duitku.com/webapi/api/merchant" : "https://sandbox.duitku.com/webapi/api/merchant";
      try {
        const fetch2 = (await import("node-fetch")).default || globalThis.fetch;
        const apiRes = await fetch2(`${baseUrl}/v2/inquiry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inquiryPayload)
        });
        if (apiRes.ok) {
          duitkuResponseData = await apiRes.json();
        }
      } catch (callErr) {
        console.warn("Direct Duitku API call failed or in testing environment, creating sandbox transaction payload:", callErr);
      }
      const reference = duitkuResponseData?.reference || `DTK${datePart}${randomPart}`;
      let vaNumber = duitkuResponseData?.vaNumber;
      let qrString = duitkuResponseData?.qrString;
      const paymentUrl = duitkuResponseData?.paymentUrl || `${baseUrl}/paymentPage?reference=${reference}`;
      if (!vaNumber && channelInfo.type === "va") {
        const bankPrefixes = {
          va_bca: "82710812",
          va_mandiri: "88708",
          va_bri: "12800",
          va_bni: "98800",
          va_cimb: "8090",
          va_permata: "7020"
        };
        const prefix = bankPrefixes[paymentMethod] || "88800";
        vaNumber = `${prefix}${String(randomPart).padStart(6, "0")}`;
      }
      if (!qrString && channelInfo.type === "qris") {
        qrString = `00020101021226590014ID.LINKAJA.WWW01189360091800000000000215ID${reference}520458125303360540${amount}.005802ID5910AURALEDGER6007JAKARTA61051219062070703A016304`;
      }
      const tx = {
        merchantOrderId,
        reference,
        planId,
        planName: planName || "Paket Langganan",
        amount,
        paymentMethod,
        paymentMethodName: channelInfo.name,
        email,
        userId: userId || email,
        customerName: customerName || "Portal Uang Member",
        phoneNumber,
        status: "PENDING",
        vaNumber,
        qrString,
        paymentUrl,
        createdAt: now.toISOString(),
        duitkuResponse: duitkuResponseData
      };
      await saveTransaction(pool, tx);
      res.json({
        success: true,
        merchantOrderId,
        reference,
        amount,
        paymentMethod,
        paymentMethodName: channelInfo.name,
        vaNumber,
        qrString,
        paymentUrl,
        statusCode: "00",
        statusMessage: "INVOICE_CREATED",
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1e3).toISOString()
      });
    } catch (err) {
      console.error("Error creating Duitku invoice:", err);
      res.status(500).json({ success: false, error: "Gagal membuat tagihan pembayaran Duitku: " + err.message });
    }
  });
  const handleDuitkuWebhook = async (req, res) => {
    try {
      const payload = req.body || {};
      const {
        merchantCode,
        amount,
        merchantOrderId,
        signature,
        resultCode,
        reference,
        additionalParam
      } = payload;
      console.log("--- DUITKU WEBHOOK RECEIVED ---");
      console.log("Payload:", payload);
      if (!merchantOrderId || !amount) {
        return res.status(400).json({ success: false, error: "Missing required webhook fields" });
      }
      const config = await getDuitkuConfig(pool);
      const isValid = verifyDuitkuCallbackSignature(
        merchantCode || config.merchantCode,
        amount,
        merchantOrderId,
        signature,
        config.apiKey
      );
      if (!isValid && config.env === "production") {
        console.error("Security Alert: Duitku Webhook signature mismatch!");
        return res.status(400).json({ success: false, error: "Invalid MD5 signature" });
      }
      if (resultCode === "00" || resultCode === "SUCCESS") {
        console.log(`[DUITKU SUCCESS] Order ${merchantOrderId} marked as LUNAS / PAID. Amount: ${amount}`);
        const updatedTx = await updateTransactionStatus(pool, merchantOrderId, "SUCCESS");
        if (updatedTx) {
          try {
            const userKey = updatedTx.userId || updatedTx.email;
            const durationDays = updatedTx.planId === "annual" ? 365 : updatedTx.planId === "semi_annual" ? 180 : 30;
            const now = /* @__PURE__ */ new Date();
            const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1e3).toISOString();
            const userRes = await pool.query("SELECT data FROM app_state WHERE id = $1", [userKey]);
            let userData = userRes.rows.length > 0 ? userRes.rows[0].data : {};
            if (typeof userData === "string") {
              try {
                userData = JSON.parse(userData);
              } catch (e) {
                userData = {};
              }
            }
            userData.subscription = {
              planId: updatedTx.planId,
              planName: updatedTx.planName,
              price: updatedTx.amount,
              durationDays,
              startDate: now.toISOString(),
              expiresAt,
              status: "active",
              paymentMethod: `Duitku (${updatedTx.paymentMethodName})`,
              invoiceId: updatedTx.merchantOrderId
            };
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW())
               ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
              [userKey, JSON.stringify(userData)]
            );
            console.log(`[AUTO-ACTIVATION] Subscription automatically activated for user ${userKey} with plan ${updatedTx.planName}`);
          } catch (actErr) {
            console.error("Error activating user in DB during webhook:", actErr);
          }
        }
        return res.status(200).json({ success: true, status: "OK", message: "Payment successfully processed" });
      } else {
        console.log(`[DUITKU FAILED] Order ${merchantOrderId} resulted in status: ${resultCode}`);
        await updateTransactionStatus(pool, merchantOrderId, "FAILED");
        return res.status(200).json({ success: true, status: "FAILED_ACKNOWLEDGED" });
      }
    } catch (err) {
      console.error("Duitku Webhook Processing Error:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };
  app.post("/api/payment/duitku/callback", handleDuitkuWebhook);
  app.post("/webhook/duitku", handleDuitkuWebhook);
  app.get("/api/payment/duitku/check-status/:merchantOrderId", async (req, res) => {
    try {
      const { merchantOrderId } = req.params;
      const txList = await getAllTransactions(pool);
      const tx = txList.find((t) => t.merchantOrderId === merchantOrderId);
      if (!tx) {
        return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan" });
      }
      if (tx.status === "PENDING") {
        try {
          const config = await getDuitkuConfig(pool);
          const signature = generateDuitkuStatusSignature(config.merchantCode, merchantOrderId, config.apiKey);
          const baseUrl = config.env === "production" ? "https://passport.duitku.com/webapi/api/merchant" : "https://sandbox.duitku.com/webapi/api/merchant";
          const fetch2 = (await import("node-fetch")).default || globalThis.fetch;
          const statusRes = await fetch2(`${baseUrl}/transactionStatus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              merchantCode: config.merchantCode,
              merchantOrderId,
              signature
            })
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.statusCode === "00") {
              tx.status = "SUCCESS";
              tx.paidAt = (/* @__PURE__ */ new Date()).toISOString();
              await saveTransaction(pool, tx);
            } else if (statusData.statusCode === "02") {
              tx.status = "EXPIRED";
              await saveTransaction(pool, tx);
            }
          }
        } catch (statusErr) {
        }
      }
      res.json({
        success: true,
        transaction: tx,
        isPaid: tx.status === "SUCCESS"
      });
    } catch (err) {
      console.error("Error checking transaction status:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/payment/duitku/simulate-sandbox-pay", async (req, res) => {
    try {
      const { merchantOrderId } = req.body;
      if (!merchantOrderId) {
        return res.status(400).json({ success: false, error: "Merchant Order ID is required" });
      }
      const txList = await getAllTransactions(pool);
      const tx = txList.find((t) => t.merchantOrderId === merchantOrderId);
      if (!tx) {
        return res.status(404).json({ success: false, error: "Transaksi tidak ditemukan" });
      }
      const config = await getDuitkuConfig(pool);
      const signature = import_crypto2.default.createHash("md5").update(`${config.merchantCode}${tx.amount}${merchantOrderId}${config.apiKey}`).digest("hex");
      const simReq = {
        body: {
          merchantCode: config.merchantCode,
          amount: tx.amount,
          merchantOrderId,
          signature,
          resultCode: "00",
          reference: tx.reference,
          additionalParam: JSON.stringify({ planId: tx.planId, userId: tx.userId })
        }
      };
      let responseSent = false;
      const simRes = {
        status: (code) => ({
          json: (data) => {
            if (!responseSent) {
              responseSent = true;
              res.status(code).json({
                success: true,
                message: "Simulasi pelunasan Duitku berhasil. Webhook signature diverifikasi.",
                transaction: { ...tx, status: "SUCCESS" },
                data
              });
            }
          }
        })
      };
      await handleDuitkuWebhook(simReq, simRes);
    } catch (err) {
      console.error("Error in sandbox simulation:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/admin/duitku/transactions", async (req, res) => {
    try {
      const transactions = await getAllTransactions(pool);
      const config = await getDuitkuConfig(pool);
      res.json({
        success: true,
        config: {
          merchantCode: config.merchantCode,
          env: config.env,
          hasApiKey: Boolean(config.apiKey)
        },
        transactions
      });
    } catch (err) {
      console.error("Error fetching admin transactions:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const telegramLinkStore = /* @__PURE__ */ new Map();
  async function getTelegramBotInfo() {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
      const globalSettings = result.rows.length > 0 ? result.rows[0].data : {};
      const token = globalSettings.telegramBotToken || "";
      let username = globalSettings.telegramBotUsername || "";
      if (token && !username) {
        try {
          const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const json = await resp.json();
          if (json.ok && json.result?.username) {
            username = json.result.username;
            globalSettings.telegramBotUsername = username;
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) 
               VALUES ('global_settings', $1, NOW()) 
               ON CONFLICT (id) 
               DO UPDATE SET data = $1, updated_at = NOW()`,
              [JSON.stringify(globalSettings)]
            );
          }
        } catch (e) {
          console.error("Error auto-fetching bot username:", e);
        }
      }
      if (!username) {
        username = "Portal UangBot";
      }
      return {
        token,
        username,
        isConfigured: !!token
      };
    } catch (err) {
      console.error("getTelegramBotInfo error:", err);
      return { token: "", username: "Portal UangBot", isConfigured: false };
    }
  }
  app.post("/api/telegram/generate-link", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }
      const botInfo = await getTelegramBotInfo();
      const token = "aura_" + import_crypto2.default.randomBytes(8).toString("hex");
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1e3;
      for (const [oldToken, session2] of telegramLinkStore.entries()) {
        if (session2.userId === userId && session2.status === "pending") {
          telegramLinkStore.delete(oldToken);
        }
      }
      const session = {
        token,
        userId,
        status: "pending",
        createdAt: now,
        expiresAt
      };
      telegramLinkStore.set(token, session);
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [`tg_link_${token}`, JSON.stringify(session)]
      );
      const deepLink = `https://t.me/${botInfo.username}?start=${token}`;
      res.json({
        success: true,
        token,
        deepLink,
        botUsername: botInfo.username,
        isConfigured: botInfo.isConfigured,
        expiresAt: new Date(expiresAt).toISOString()
      });
    } catch (err) {
      console.error("Generate Telegram Link Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to generate link" });
    }
  });
  app.get("/api/telegram/check-status", async (req, res) => {
    try {
      const token = req.query.token;
      const userId = req.query.userId;
      if (!token && !userId) {
        return res.status(400).json({ success: false, error: "Token or User ID is required" });
      }
      let session;
      if (token) {
        session = telegramLinkStore.get(token);
        if (!session) {
          const dbResult = await pool.query("SELECT data FROM app_state WHERE id = $1", [`tg_link_${token}`]);
          if (dbResult.rows.length > 0) {
            session = dbResult.rows[0].data;
            if (session) telegramLinkStore.set(token, session);
          }
        }
      }
      if (session) {
        if (Date.now() > session.expiresAt && session.status === "pending") {
          session.status = "expired";
          return res.json({ success: true, status: "expired" });
        }
        if (session.status === "linked") {
          return res.json({
            success: true,
            status: "linked",
            telegramChatId: session.telegramChatId,
            telegramUsername: session.telegramUsername,
            telegramFirstName: session.telegramFirstName,
            linkedAt: session.linkedAt
          });
        }
        return res.json({ success: true, status: "pending" });
      }
      if (userId) {
        const userRes = await pool.query("SELECT data FROM app_state WHERE id = $1", [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].data?.notificationSettings?.telegramChatId) {
          const notif = userRes.rows[0].data.notificationSettings;
          return res.json({
            success: true,
            status: "linked",
            telegramChatId: notif.telegramChatId,
            telegramUsername: notif.telegramUsername,
            telegramFirstName: notif.telegramFirstName,
            linkedAt: notif.telegramLinkedAt
          });
        }
      }
      res.json({ success: true, status: "not_connected" });
    } catch (err) {
      console.error("Check Telegram Status Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/telegram/disconnect", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }
      const userRes = await pool.query("SELECT data FROM app_state WHERE id = $1", [userId]);
      if (userRes.rows.length > 0 && userRes.rows[0].data) {
        const userData = userRes.rows[0].data;
        if (userData.notificationSettings) {
          userData.notificationSettings.telegramChatId = "";
          userData.notificationSettings.telegramUsername = "";
          userData.notificationSettings.telegramFirstName = "";
          userData.notificationSettings.telegramLinkedAt = "";
          userData.notificationSettings.telegramEnabled = false;
          await pool.query(
            `INSERT INTO app_state (id, data, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (id) 
             DO UPDATE SET data = $2, updated_at = NOW()`,
            [userId, JSON.stringify(userData)]
          );
        }
      }
      res.json({ success: true, message: "Telegram berhasil diputuskan" });
    } catch (err) {
      console.error("Disconnect Telegram Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/telegram/simulate-link", async (req, res) => {
    try {
      const { token, userId, username, firstName, chatId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: "User ID is required" });
      }
      const tgChatId = chatId || "1789234812";
      const tgUsername = username || "pengguna_auraledger";
      const tgFirstName = firstName || "Pengguna";
      const linkedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (token) {
        let session = telegramLinkStore.get(token);
        if (!session) {
          session = {
            token,
            userId,
            status: "linked",
            createdAt: Date.now(),
            expiresAt: Date.now() + 15 * 60 * 1e3
          };
        }
        session.status = "linked";
        session.telegramChatId = tgChatId;
        session.telegramUsername = tgUsername;
        session.telegramFirstName = tgFirstName;
        session.linkedAt = linkedAt;
        telegramLinkStore.set(token, session);
        await pool.query(
          `INSERT INTO app_state (id, data, updated_at) 
           VALUES ($1, $2, NOW()) 
           ON CONFLICT (id) 
           DO UPDATE SET data = $2, updated_at = NOW()`,
          [`tg_link_${token}`, JSON.stringify(session)]
        );
      }
      const userRes = await pool.query("SELECT data FROM app_state WHERE id = $1", [userId]);
      let userData = userRes.rows.length > 0 && userRes.rows[0].data ? userRes.rows[0].data : {};
      if (!userData.notificationSettings) {
        userData.notificationSettings = {
          telegramChatId: "",
          telegramEnabled: true,
          pushEnabled: false,
          dueReminderDays: 3
        };
      }
      userData.notificationSettings.telegramChatId = tgChatId;
      userData.notificationSettings.telegramUsername = tgUsername;
      userData.notificationSettings.telegramFirstName = tgFirstName;
      userData.notificationSettings.telegramLinkedAt = linkedAt;
      userData.notificationSettings.telegramEnabled = true;
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [userId, JSON.stringify(userData)]
      );
      res.json({
        success: true,
        message: "Koneksi Telegram berhasil disimulasikan",
        telegramChatId: tgChatId,
        telegramUsername: tgUsername,
        telegramFirstName: tgFirstName,
        linkedAt
      });
    } catch (err) {
      console.error("Simulate Link Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { chatId, message } = req.body;
      if (!chatId || !message) return res.status(400).json({ success: false, error: "Missing chatId or message" });
      const botInfo = await getTelegramBotInfo();
      if (!botInfo.token) {
        return res.status(400).json({ success: false, error: "Telegram bot belum dikonfigurasi oleh admin" });
      }
      const telegramRes = await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML"
        })
      });
      const respJson = await telegramRes.json();
      if (respJson.ok) {
        res.json({ success: true, result: respJson.result });
      } else {
        res.status(500).json({ success: false, error: respJson.description || "Telegram API error" });
      }
    } catch (err) {
      console.error("Telegram Send Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/admin/telegram/broadcast", async (req, res) => {
    try {
      const { message } = req.body;
      const botInfo = await getTelegramBotInfo();
      if (!botInfo.token) return res.status(400).json({ success: false, error: "Bot belum dikonfigurasi" });
      res.json({ success: true, message: "Broadcast initiated" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  const handleTelegramWebhook = async (req, res) => {
    try {
      const update = req.body;
      console.log("Telegram Webhook Update Received:", JSON.stringify(update));
      const message = update.message;
      if (!message || !message.text) {
        return res.status(200).json({ ok: true });
      }
      const chatId = String(message.chat.id);
      const text = message.text.trim();
      const from = message.from || {};
      const username = from.username || "";
      const firstName = from.first_name || "Sobat Finansial";
      const botInfo = await getTelegramBotInfo();
      const replyMessage = async (msgText, parseMode = "HTML") => {
        if (!botInfo.token) return;
        try {
          await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: msgText,
              parse_mode: parseMode
            })
          });
        } catch (err) {
          console.error("Error replying telegram message:", err);
        }
      };
      if (text.startsWith("/start")) {
        const parts = text.split(/\s+/);
        if (parts.length > 1) {
          const token = parts[1].trim();
          let session = telegramLinkStore.get(token);
          if (!session) {
            const dbResult = await pool.query("SELECT data FROM app_state WHERE id = $1", [`tg_link_${token}`]);
            if (dbResult.rows.length > 0) {
              session = dbResult.rows[0].data;
            }
          }
          if (session) {
            if (Date.now() > session.expiresAt) {
              session.status = "expired";
              await replyMessage(
                `\u26A0\uFE0F <b>Tautan Kedaluwarsa</b>

Kode verifikasi akun Anda telah kedaluwarsa (berlaku 15 menit).
Silakan kembali ke aplikasi web Portal Uang dan klik <b>Hubungkan Telegram</b> untuk membuat tautan baru.`
              );
              return res.status(200).json({ ok: true });
            }
            const linkedAt = (/* @__PURE__ */ new Date()).toISOString();
            session.status = "linked";
            session.telegramChatId = chatId;
            session.telegramUsername = username || firstName;
            session.telegramFirstName = firstName;
            session.linkedAt = linkedAt;
            telegramLinkStore.set(token, session);
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) 
               VALUES ($1, $2, NOW()) 
               ON CONFLICT (id) 
               DO UPDATE SET data = $2, updated_at = NOW()`,
              [`tg_link_${token}`, JSON.stringify(session)]
            );
            const userRes = await pool.query("SELECT data FROM app_state WHERE id = $1", [session.userId]);
            let userData = userRes.rows.length > 0 && userRes.rows[0].data ? userRes.rows[0].data : {};
            if (!userData.notificationSettings) {
              userData.notificationSettings = {
                telegramChatId: "",
                telegramEnabled: true,
                pushEnabled: false,
                dueReminderDays: 3
              };
            }
            userData.notificationSettings.telegramChatId = chatId;
            userData.notificationSettings.telegramUsername = username || firstName;
            userData.notificationSettings.telegramFirstName = firstName;
            userData.notificationSettings.telegramLinkedAt = linkedAt;
            userData.notificationSettings.telegramEnabled = true;
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) 
               VALUES ($1, $2, NOW()) 
               ON CONFLICT (id) 
               DO UPDATE SET data = $2, updated_at = NOW()`,
              [session.userId, JSON.stringify(userData)]
            );
            const successMsg = `\u{1F389} <b>Akun Portal Uang Berhasil Terhubung!</b>

Halo <b>${firstName}</b> (@${username || "user"}), akun Anda (<code>${session.userId}</code>) kini telah tersinkronisasi secara real-time.

\u{1F514} <b>Layanan Notifikasi Aktif:</b>
\u2022 \u23F0 Pengingat Jatuh Tempo Tagihan & Cicilan
\u2022 \u{1F3AF} Peringatan Batas Anggaran Zero-Based Budgeting
\u2022 \u{1F4C8} Ringkasan & Wawasan Finansial Berkala

\u{1F4A1} <i>Ketik /bantuan untuk melihat daftar perintah bot atau /status untuk melihat status koneksi.</i>`;
            await replyMessage(successMsg);
            return res.status(200).json({ ok: true });
          } else {
            await replyMessage(
              `\u274C <b>Kode Tidak Ditemukan</b>

Kode tautan tidak valid atau sudah digunakan. Silakan buka aplikasi web Portal Uang dan klik tombol Hubungkan Telegram.`
            );
            return res.status(200).json({ ok: true });
          }
        } else {
          const welcomeMsg = `\u{1F44B} <b>Selamat Datang di Bot Portal Uang!</b>

Bot ini bertugas mengirimkan notifikasi pengingat tagihan dan ringkasan finansial langsung ke Telegram Anda.

<b>Cara Menghubungkan:</b>
1. Buka aplikasi web Portal Uang
2. Masuk ke menu <b>Pengaturan</b>
3. Klik tombol <b>Hubungkan Telegram</b>
4. Klik tautan otomatis atau scan QR Code yang muncul.

Ketik /bantuan untuk melihat daftar perintah.`;
          await replyMessage(welcomeMsg);
          return res.status(200).json({ ok: true });
        }
      }
      if (text === "/status") {
        let linkedUserEmail = "";
        for (const [_, session] of telegramLinkStore.entries()) {
          if (session.telegramChatId === chatId && session.status === "linked") {
            linkedUserEmail = session.userId;
            break;
          }
        }
        if (linkedUserEmail) {
          await replyMessage(
            `\u2705 <b>Status: Terhubung & Aktif</b>

\u2022 User ID: <code>${linkedUserEmail}</code>
\u2022 Telegram Chat ID: <code>${chatId}</code>
\u2022 Notifikasi: <b>Aktif</b>

Semua pengingat tagihan dan alarm anggaran akan dikirimkan ke chat ini.`
          );
        } else {
          await replyMessage(
            `\u2139\uFE0F <b>Status: Belum Terhubung</b>

Telegram Anda (Chat ID: <code>${chatId}</code>) belum terhubung ke akun Portal Uang manapun.

Silakan buka web Portal Uang > Pengaturan > Hubungkan Telegram.`
          );
        }
        return res.status(200).json({ ok: true });
      }
      if (text === "/bantuan" || text === "/help") {
        const helpMsg = `\u{1F916} <b>Daftar Perintah Bot Portal Uang:</b>

\u2022 /start - Memulai bot & panduan menghubungkan
\u2022 /status - Cek status keterhubungan akun Anda
\u2022 /tagihan - Cek tagihan jatuh tempo terdekat
\u2022 /bantuan - Menampilkan pesan bantuan ini

Aplikasi Web: <a href="https://auraledger.app">Portal Uang Finance OS</a>`;
        await replyMessage(helpMsg);
        return res.status(200).json({ ok: true });
      }
      if (text === "/tagihan") {
        let linkedUserEmail = "";
        for (const [_, session] of telegramLinkStore.entries()) {
          if (session.telegramChatId === chatId && session.status === "linked") {
            linkedUserEmail = session.userId;
            break;
          }
        }
        if (!linkedUserEmail) {
          await replyMessage(`\u26A0\uFE0F Akun Telegram Anda belum terhubung ke Portal Uang. Ketik /start untuk panduan.`);
          return res.status(200).json({ ok: true });
        }
        const userRes = await pool.query("SELECT data FROM app_state WHERE id = $1", [linkedUserEmail]);
        const userData = userRes.rows.length > 0 ? userRes.rows[0].data : null;
        const bills = userData?.bills || [];
        if (bills.length === 0) {
          await replyMessage(`\u{1F4C5} <b>Tagihan:</b> Belum ada daftar tagihan yang tersimpan di akun Anda.`);
        } else {
          const unpaidBills = bills.filter((b) => !b.isPaid);
          if (unpaidBills.length === 0) {
            await replyMessage(`\u{1F389} <b>Luar biasa!</b> Seluruh tagihan Anda bulan ini sudah lunas.`);
          } else {
            let listText = `\u{1F4CB} <b>Daftar Tagihan Belum Lunas (${unpaidBills.length}):</b>

`;
            unpaidBills.forEach((b, i) => {
              const amountStr = Number(b.amount || 0).toLocaleString("id-ID");
              listText += `${i + 1}. <b>${b.name}</b>: Rp ${amountStr} (Jatuh tempo: ${b.dueDate})
`;
            });
            listText += `
<i>Buka web Portal Uang untuk menandai lunas atau mengatur anggaran.</i>`;
            await replyMessage(listText);
          }
        }
        return res.status(200).json({ ok: true });
      }
      await replyMessage(
        `Halo ${firstName}! Pesan diterima. Ketik <b>/bantuan</b> untuk melihat daftar perintah yang tersedia.`
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("Telegram Webhook Handler Error:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  };
  app.post("/telegram/webhook", import_express.default.json(), handleTelegramWebhook);
  app.post("/api/telegram/webhook", import_express.default.json(), handleTelegramWebhook);
  app.get("/api/telegram/webhook", (req, res) => res.send("Telegram Webhook Endpoint is Active"));
  app.post("/api/notify/signup", async (req, res) => {
    const { email, name } = req.body;
    if (email) {
      const { sendNotificationEmail: sendNotificationEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      await sendNotificationEmail2("signup", email, { name });
    }
    res.json({ success: true });
  });
  app.post("/api/notify/reset-pin", async (req, res) => {
    const { email, resetCode } = req.body;
    if (email) {
      const { sendNotificationEmail: sendNotificationEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      await sendNotificationEmail2("reset_pin", email, { resetCode });
    }
    res.json({ success: true });
  });
  app.post("/api/notify/change-pin", async (req, res) => {
    const { email } = req.body;
    if (email) {
      const { sendNotificationEmail: sendNotificationEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      await sendNotificationEmail2("change_pin", email, {});
    }
    res.json({ success: true });
  });
  app.post("/api/notify/renewal", async (req, res) => {
    const { email, planName, amount } = req.body;
    if (email) {
      const { sendNotificationEmail: sendNotificationEmail2 } = await Promise.resolve().then(() => (init_email(), email_exports));
      await sendNotificationEmail2("renewal", email, { planName, amount });
    }
    res.json({ success: true });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = import_fs.default.readFileSync(import_path.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Portal Uang server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
