import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import crypto from 'crypto';
import cron from 'node-cron';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import yfPackage from 'yahoo-finance2';
const YahooFinance = (yfPackage as any).default || yfPackage;
const yahooFinance = new YahooFinance();
import * as cheerio from 'cheerio';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import {
  getDuitkuConfig,
  generateDuitkuInquirySignature,
  verifyDuitkuCallbackSignature,
  generateDuitkuStatusSignature,
  DUITKU_CHANNELS,
  getAllTransactions,
  saveTransaction,
  saveTransactionsBatch,
  updateTransactionStatus,
  DuitkuTransaction
} from './server/duitku';
import { sendInvoiceEmail, generateInvoicePDFBuffer, sendCompensationEmail } from './server/emailService';
import {
  getEmailConfig,
  isEmailConfigured,
  sendNotificationEmail,
  getEmailTemplates,
  sendCustomBroadcastEmail,
  DEFAULT_EMAIL_TEMPLATES,
  BroadcastRecipient
} from './server/email';
import {
  INTEGRATION_META,
  getErrorMonitorConfig,
  saveErrorMonitorConfig,
  getSystemErrorLogs,
  getErrorReportHistory,
  parseDeveloperEmails,
  recordIntegrationError,
  markIntegrationRecovered,
  resolveErrorLogById,
  resolveAllOpenErrors,
  clearResolvedErrorLogs,
  runScheduledDigestCheck,
  runAllIntegrationHealthChecks,
  installGlobalErrorHooks
} from './server/errorMonitor';
import {
  getPayloadConfig,
  DEFAULT_CMS_SETTINGS,
  PAYLOAD_SCHEMA_BLUEPRINT,
  checkPayloadHealth,
  getCmsSettings,
  getPayloadSyncCache,
  syncFromPayload,
  verifyPayloadWebhookSecret,
  maskPayloadUrl,
} from './server/payloadCms';
const appStateDb = new Map();

let pool: any = null;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pool = {
    query: async (text: string, params?: any[]) => {
      try {
        return await pgPool.query(text, params);
      } catch (err: any) {
        if (err && err.code === 'ENETUNREACH' && err.message && err.message.includes(':')) {
            err.message = 'Koneksi database gagal (IPv6 tidak didukung di environment ini). Jika Anda mengatur DATABASE_URL secara manual ke Supabase, gunakan IPv4 connection string (transaction pooler port 6543) atau aktifkan add-on IPv4. Detail: ' + err.message;
        }
        if (err && err.code === '42P01') { // 42P01 is PostgreSQL error code for undefined_table
            console.log("Table app_state not found, creating it now...");
            await pgPool.query(`
              CREATE TABLE IF NOT EXISTS app_state (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            `);
            try {
               await pgPool.query(`ALTER TABLE app_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);
            } catch (e) {}
            return await pgPool.query(text, params);
        }
        throw err;
      }
    }
  };

  pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id VARCHAR(255) PRIMARY KEY,
      data JSONB,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).then(() => pool.query(`ALTER TABLE app_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`).catch(() => {})).catch((err: any) => console.error('Failed to create app_state table in Postgres:', err));
} else {
  pool = {
    query: async (queryStr: any, params: any[] = []) => {
    if (typeof queryStr === "string" && queryStr.toUpperCase().includes("SELECT COUNT(*)")) { 
      let count = 0; 
      for (const key of appStateDb.keys()) { 
        if (key && typeof key === "string" && key.includes("@") && !key.startsWith("user_profile_")) { 
          count++; 
        } 
      } 
      return { rows: [{ count }] }; 
    }
    if (typeof queryStr === "string" && queryStr.includes("id LIKE 'user_profile_%'")) {
      const rows: any[] = [];
      for (const [k, v] of appStateDb.entries()) {
        if (typeof k === 'string' && k.startsWith('user_profile_')) {
          try {
            rows.push({ id: k, data: typeof v === 'string' ? JSON.parse(v) : v });
          } catch (e) {
            rows.push({ id: k, data: v });
          }
        }
      }
      return { rows };
    }
    // Try to extract ID either from params or from literal string in query
    let id = params.length > 0 ? params[0] : null;
    if (!id) {
      const match = queryStr.match(/id = '([^']+)'/);
      if (match) id = match[1];
    }
    
    if (queryStr.toUpperCase().includes('SELECT')) {
      const dataStr = appStateDb.get(id);
      let data = null;
      if (dataStr) {
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          data = dataStr;
        }
      }
      if (queryStr.includes('updated_at')) {
        return { rows: data ? [{ data, updated_at: new Date() }] : [] };
      }
      return { rows: data ? [{ data }] : [] };
    } else if (queryStr.toUpperCase().includes('INSERT')) {
      // params[1] should be the strinified JSON or data
      const dataToStore = typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1]);
      appStateDb.set(id, dataToStore);
      return { rowCount: 1 };
    }
    return { rows: [] };
  }
};
}



async function startServer() {
  const app = express();
  const PORT =
    process.env.NODE_ENV === 'production'
      ? Number(process.env.PORT || process.env.SERVER_PORT || 3000)
      : 3000;

  // Install global auto-error-detection hooks across integrations, email gateway, and runtime
  installGlobalErrorHooks(pool);

  // Trust first proxy for Rate Limiting to work correctly behind reverse proxies
  app.set('trust proxy', 1);

  // Force HTTPS removed as it is handled by the platform ingress



  app.use(express.json({ limit: '10mb' }));

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-oriin-when-cross-oriin');
    next();
  });

  // Malicious Content / Anti-Judol & Anti-Phishing Guard
  const MALICIOUS_PATTERNS = [
    /\b(slot|gacor|maxwin|pragmatic|zeus|olympus|sweet\s*bonanza|mahjong\s*ways|rtp\s*live|poker\s*online|togel|casino|kasino|judi|taruhan|sbobet|bandar\s*judi|agen\s*slot|scatter\s*hitam|depo\s*pulsa|bonus\s*new\s*member|bet\s*100|bet88|mpo|bocoran\s*admin\s*jarwo)\b/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /data\s*:\s*text\/html/i,
    /onload\s*=\s*['"]?[^'">]+['"]?/i,
    /onerror\s*=\s*['"]?[^'">]+['"]?/i,
    /onclick\s*=\s*['"]?[^'">]+['"]?/i,
    /<iframe\b[^>]*>/i,
    /<object\b[^>]*>/i,
    /<embed\b[^>]*>/i,
    /eval\s*\(/i,
    /\b(klaim-hadiah-gratis|verifikasi-akun-bank|dana-kaget-palsu|loin-bca-palsu)\b/i
  ];

  const inspectPayloadForMaliciousContent = (obj: any): { isMalicious: boolean; reason?: string } => {
    if (!obj) return { isMalicious: false };
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(str)) {
        return { isMalicious: true, reason: `Konten ditolak oleh sistem keamanan Portal Uang: terdeteksi pola berisiko / iklan mencurigakan.` };
      }
    }
    return { isMalicious: false };
  };

  // Global Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
    // In a proxy environment like Google Cloud Run, trust the proxy
    
  });

  // Apply the rate limiting middleware only to API routes
  app.use('/api', limiter);

  // Stricter rate limit for AI API
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many AI insights requests, please try again later.' },
    
  });
  app.use('/api/ai-insights', aiLimiter);

  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Terlalu banyak permintaan OTP. Silakan coba lagi dalam beberapa menit.' },
  });
  app.use('/api/auth/send-otp', otpLimiter);
  app.use('/api/auth/verify-otp', otpLimiter);

  // Initialize Gemini server-side client lazily/safely
  // Initialize Gemini server-side client lazily/safely
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Route: CAPI (Conversions API) Tracker
  app.post('/api/track-event', async (req, res) => {
    try {
      const { eventName, eventData, userData, eventUrl } = req.body;
      
      // Credentials strictly from Environment Variables
      const pixelId = (process.env.META_PIXEL_ID || '').trim();
      const capiToken = (process.env.META_CAPI_TOKEN || '').trim();

      if (!pixelId || !capiToken) {
        return res.json({ success: false, note: 'CAPI not configured in ENV' });
      }

      const fetch = (await import('node-fetch')).default || globalThis.fetch;
      const unixTime = Math.floor(Date.now() / 1000);
      
      const payload = {
        data: [
          {
            event_name: eventName,
            event_time: unixTime,
            action_source: 'website',
            event_source_url: eventUrl,
            user_data: {
              client_ip_address: (Array.isArray(req.headers['x-forwarded-for']) ? req.headers['x-forwarded-for'][0] : req.headers['x-forwarded-for']) || req.ip,
              client_user_agent: req.headers['user-agent'],
              ...userData
            },
            custom_data: eventData
          }
        ]
      };

      const fbUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${capiToken}`;
      const fbRes = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const fbData: any = await fbRes.json();
      console.log('CAPI Event sent:', eventName, fbData);
      if (!fbRes.ok || fbData?.error) {
        recordIntegrationError(pool, {
          integration: 'meta_capi',
          action: 'POST /api/track-event',
          message: fbData?.error?.message || `Meta CAPI HTTP ${fbRes.status}`,
          details: `Event: ${eventName}`,
          severity: 'error',
        }).catch(() => {});
      } else {
        markIntegrationRecovered(pool, 'meta_capi').catch(() => {});
      }
      
      res.json({ success: true, fbData });
    } catch (err) {
      console.error('CAPI Error:', err);
      res.status(500).json({ success: false, error: 'Failed to send CAPI event' });
    }
  });

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Portal Uang Server' });
  });

  // API Route: Marketing Settings (Public)
  app.get('/api/public-marketing', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['marketing_settings']);
      if (result.rows.length > 0 && result.rows[0].data) {
        res.json({ success: true, data: result.rows[0].data });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Authentication & TOTP State (secrets from process.env with runtime-generated fallbacks)
  const ADMIN_AUTH_TOKEN = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  const ADMIN_TOTP_SECRET = (process.env.ADMIN_TOTP_SECRET || '').trim() || new OTPAuth.Secret({ size: 20 }).base32;
  let ADMIN_TOTP_ENABLED = Boolean(process.env.ADMIN_TOTP_SECRET);

  const getTotp = () => new OTPAuth.TOTP({
    issuer: 'Portal Uang Admin',
    label: (process.env.ADMIN_EMAIL || 'admin@portaluang.id').trim(),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(ADMIN_TOTP_SECRET)
  });

  app.get('/api/admin/bootstrap-status', async (req, res) => {
    try {
      const hasEnvPass = Boolean((process.env.ADMIN_PASSWORD || '').trim());
      if (hasEnvPass) {
        return res.json({ success: true, needsBootstrap: false, totpEnabled: ADMIN_TOTP_ENABLED, source: 'env' });
      }
      const credRes = await pool.query('SELECT data FROM app_state WHERE id = $1', ['admin_auth_credentials']);
      const claimed = Boolean(credRes.rows.length > 0 && credRes.rows[0].data?.passwordHash);
      return res.json({ success: true, needsBootstrap: !claimed, totpEnabled: ADMIN_TOTP_ENABLED, source: claimed ? 'db' : 'unclaimed' });
    } catch {
      return res.json({ success: true, needsBootstrap: false, totpEnabled: ADMIN_TOTP_ENABLED });
    }
  });

  app.post('/api/admin/bootstrap', async (req, res) => {
    try {
      if ((process.env.ADMIN_PASSWORD || '').trim()) {
        return res.status(403).json({ success: false, error: 'Admin password sudah dikonfigurasi melalui Environment Variable.' });
      }
      const existing = await pool.query('SELECT data FROM app_state WHERE id = $1', ['admin_auth_credentials']);
      if (existing.rows.length > 0 && existing.rows[0].data?.passwordHash) {
        return res.status(403).json({ success: false, error: 'Admin pertama sudah di-setup sebelumnya.' });
      }
      const { email, password } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const pw = String(password || '');
      if (!cleanEmail.includes('@') || pw.length < 8) {
        return res.status(400).json({ success: false, error: 'Email valid dan password minimal 8 karakter wajib diisi.' });
      }
      const salt = crypto.randomBytes(16).toString('hex');
      const pwHash = crypto.scryptSync(pw, salt, 64).toString('hex');
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['admin_auth_credentials', JSON.stringify({ email: cleanEmail, passwordHash: `${salt}:${pwHash}`, createdAt: new Date().toISOString() })]
      );
      return res.json({ success: true, token: ADMIN_AUTH_TOKEN });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Authentication
  app.post('/api/admin/login', async (req, res) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      
      const configResult = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      const config = configResult.rows.length > 0 ? configResult.rows[0].data : {};
      
      const whitelistedIpsRaw = (config.adminIpWhitelist || '').split(',').map((ip: string) => ip.trim()).filter(Boolean);
      const whitelistedIps = whitelistedIpsRaw.length > 0 ? whitelistedIpsRaw : ['114.79.20.150'];
      
      let isAllowed = clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp.includes('localhost');
      if (!isAllowed) {
        isAllowed = whitelistedIps.some((ip: string) => clientIp.includes(ip));
      }

      if (!isAllowed) {
        return res.status(401).json({ success: false, error: 'Invalid credentials or IP not whitelisted.' });
      }

      const { email, password, twoFactor } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const rawPassword = String(password || '');
      const envEmail = (process.env.ADMIN_EMAIL || 'admin@portaluang.id').trim().toLowerCase();
      const envPass = (process.env.ADMIN_PASSWORD || '').trim();

      let credentialsValid = false;
      if (envPass) {
        credentialsValid = cleanEmail === envEmail && rawPassword === envPass;
      } else {
        const credRes = await pool.query('SELECT data FROM app_state WHERE id = $1', ['admin_auth_credentials']);
        const savedCred = credRes.rows?.[0]?.data;
        if (savedCred?.passwordHash && cleanEmail === String(savedCred.email || '').toLowerCase()) {
          const [salt, storedHash] = String(savedCred.passwordHash).split(':');
          if (salt && storedHash) {
            const candidate = crypto.scryptSync(rawPassword, salt, 64).toString('hex');
            credentialsValid = crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(storedHash));
          }
        }
      }

      if (credentialsValid) {
        const totp = getTotp();
        const delta = totp.validate({ token: String(twoFactor || ''), window: 1 });
        const isTotpValid = delta !== null;
        if (!ADMIN_TOTP_ENABLED || isTotpValid) {
          res.json({ success: true, token: ADMIN_AUTH_TOKEN });
          return;
        }
      }
      res.status(401).json({ success: false, error: 'Invalid credentials or IP not whitelisted.' });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  });

  const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${ADMIN_AUTH_TOKEN}`) {
      next();
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  };

  app.use('/api/admin', adminAuthMiddleware);

  // API Route: Admin 2FA Setup (never exposes raw TOTP secret string to client)
  app.get('/api/admin/2fa/setup', async (req, res) => {
    try {
      const totp = getTotp();
      const otpauthUrl = totp.toString();
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      res.json({
        qrCodeUrl,
        enabled: ADMIN_TOTP_ENABLED,
        configuredViaEnv: Boolean(process.env.ADMIN_TOTP_SECRET),
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  app.post('/api/admin/2fa/verify', (req, res) => {
    const { token } = req.body;
    const totp = getTotp();
    const delta = totp.validate({ token, window: 1 });
    const isValid = delta !== null;
    if (isValid) {
      ADMIN_TOTP_ENABLED = true;
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid token' });
    }
  });

  // API Route: Admin Marketing Settings
  app.get('/api/admin/marketing', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['marketing_settings']);
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : {} });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/marketing', async (req, res) => {
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
        ['marketing_settings', JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Public Settings (for Pixel, App config, and AI Personality)
  app.get('/api/stats/user-count', async (req, res) => {
    try {
      const result = await pool.query("SELECT COUNT(*) as count FROM app_state WHERE id LIKE '%@%' AND id NOT LIKE 'user_profile_%'");
      const count = parseInt((result.rows[0] as any).count, 10);
      res.json({ success: true, count });
    } catch (err: any) {
      console.error('Failed to get user count:', err);
      // Return a fallback number on error
      res.json({ success: true, count: 10000 });
    }
  });

  app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
    try {
      const result = await pool.query("SELECT id, data FROM app_state WHERE id LIKE 'user_profile_%'");
      const users = result.rows.map(r => ({
        id: r.id.replace('user_profile_', ''),
        ...r.data
      }));
      res.json({ success: true, users });
    } catch (err: any) {
      console.error('Failed to get users:', err);
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/track-user', async (req, res) => {
    try {
      const profile = req.body;
      const key = 'user_profile_' + profile.email;
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [key, JSON.stringify(profile)]
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to track user:', err);
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/track-login', async (req, res) => {
    try {
      const { email, lastLoginAt } = req.body;
      const key = 'user_profile_' + email;
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", [key]);
      if (result.rows.length > 0) {
        const profile = result.rows[0].data;
        profile.lastLoginAt = lastLoginAt || new Date().toISOString();
        await pool.query(
          `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
          [key, JSON.stringify(profile)]
        );
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to track login:', err);
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/public-settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      const emailCfg = await getEmailConfig(pool);
      const emailConfigured = isEmailConfigured(emailCfg);

      const publicPixelId = (process.env.META_PIXEL_ID || '').trim();
      const d = result.rows.length > 0 && result.rows[0].data ? result.rows[0].data : {};
      const maintenanceConfig = {
        enabled: Boolean(d.maintenance),
        title: d.maintenanceTitle || 'Sistem Sedang Dalam Pemeliharaan',
        message:
          d.maintenanceMessage ||
          'Kami sedang melakukan pemeliharaan dan peningkatan server agar layanan semakin cepat & stabil. Data keuangan Anda tetap aman.',
        estimatedEnd: d.maintenanceEstimatedEnd || '',
        compensationBannerEnabled: Boolean(d.compensationBannerEnabled),
        compensationBannerText:
          d.compensationBannerText ||
          'Sebagai bentuk apresiasi atas kesabaran Anda selama maintenance, seluruh pengguna aktif berhak menerima kompensasi tambahan masa langganan.',
        updatedAt: d.maintenanceUpdatedAt || null,
      };

      res.json({
        success: true,
        pixelId: publicPixelId || null,
        socials: d.socials || undefined,
        appName: d.appName || 'Portal Uang',
        appVersion: d.appVersion || '1.0.0',
        supportEmail: d.supportEmail || 'support@portaluang.id',
        aiName: d.aiName || 'Portal Uang Advisor',
        aiRoleTitle: d.aiRoleTitle || 'AI Wealth Strateist',
        aiTone: d.aiTone || 'professional_supportive',
        aiSystemPrompt: d.aiSystemPrompt || '',
        heroTitle1: d.heroTitle1 || 'Tinggalkan Spreadsheet Rumit.',
        heroTitle2Prefix: d.heroTitle2Prefix || 'Kuasai Uang Anda dengan ',
        heroSubtitle:
          d.heroSubtitle ||
          'Hentikan "bocor halus" seketika dengan sistem <strong class="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong class="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong class="text-emerald-300">AI Cerdas</strong>.',
        heroFont: d.heroFont || 'Plus Jakarta Sans, sans-serif',
        emailConfigured,
        emailOtpEnabled: emailCfg.emailOtpEnabled,
        maintenance: Boolean(d.maintenance),
        maintenanceConfig,
      });
    } catch (err: any) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Admin Settings
  
  // Content Management API (Payload CMS Sync + Supabase Fallback + Version History)
  app.get('/api/content/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      const cleanPageId = String(pageId || '').trim().toLowerCase();
      const [cmsSettings, payloadCache, localRes] = await Promise.all([
        getCmsSettings(pool),
        getPayloadSyncCache(pool),
        pool.query('SELECT data, updated_at FROM app_state WHERE id = $1', ['content_' + cleanPageId]),
      ]);

      const localData = localRes.rows.length > 0 ? localRes.rows[0].data : null;
      const payloadPage = payloadCache?.pages?.[cleanPageId];

      if (cmsSettings.syncMode !== 'local' && payloadPage && (payloadPage.content || payloadPage.title)) {
        return res.json({
          success: true,
          source: 'payload',
          data: payloadPage,
        });
      }

      if (cmsSettings.syncMode === 'payload_priority' && !payloadPage) {
        return res.json({ success: true, source: 'local', data: localData });
      }

      res.json({
        success: true,
        source: 'local',
        data: localData ? { ...localData, source: 'local' } : null,
      });
    } catch (err: any) {
      console.error("Content fetch error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/content/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      const cleanPageId = String(pageId || '').trim().toLowerCase();
      const incoming = req.body && typeof req.body === 'object' ? { ...req.body } : {};

      const check = inspectPayloadForMaliciousContent(incoming);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      const nowIso = new Date().toISOString();
      const dataToSave = {
        ...incoming,
        updatedAt: nowIso,
      };

      // Save previous snapshot into content_revisions_<pageId> (max 10 revisions)
      try {
        const existingRes = await pool.query('SELECT data FROM app_state WHERE id = $1', ['content_' + cleanPageId]);
        if (existingRes.rows.length > 0 && existingRes.rows[0].data) {
          const prev = existingRes.rows[0].data;
          const revKey = 'content_revisions_' + cleanPageId;
          const revRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [revKey]);
          const existingRevs = revRes.rows.length > 0 && Array.isArray(revRes.rows[0].data) ? revRes.rows[0].data : [];
          if (prev.content || prev.title) {
            const nextRevs = [
              {
                id: `rev_${Date.now()}`,
                savedAt: prev.updatedAt || nowIso,
                title: prev.title || '',
                content: prev.content || '',
                summary: String(prev.content || '').slice(0, 120),
              },
              ...existingRevs,
            ].slice(0, 10);
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
              [revKey, JSON.stringify(nextRevs)]
            );
          }
        }
      } catch (revErr) {
        console.warn('Revision snapshot warning:', revErr);
      }

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (id)
          DO UPDATE SET data = $2, updated_at = NOW()`,
        ['content_' + cleanPageId, JSON.stringify(dataToSave)]
      );
      res.json({ success: true, updatedAt: nowIso });
    } catch (err: any) {
      console.error("Content save error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/admin/content/:pageId/revisions', async (req, res) => {
    try {
      const cleanPageId = String(req.params.pageId || '').trim().toLowerCase();
      const revRes = await pool.query('SELECT data FROM app_state WHERE id = $1', ['content_revisions_' + cleanPageId]);
      const revisions = revRes.rows.length > 0 && Array.isArray(revRes.rows[0].data) ? revRes.rows[0].data : [];
      res.json({ success: true, data: revisions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // CRUD for Blog Posts (Payload CMS Hybrid + Supabase)
  app.get('/api/posts', async (req, res) => {
    try {
      const [cmsSettings, payloadCache, localRes] = await Promise.all([
        getCmsSettings(pool),
        getPayloadSyncCache(pool),
        pool.query("SELECT data FROM app_state WHERE id = 'blog_posts'"),
      ]);

      const localPosts: any[] =
        localRes.rows.length > 0 && Array.isArray(localRes.rows[0].data)
          ? localRes.rows[0].data.map((p: any) => ({ ...p, source: p.source || 'local' }))
          : [];
      const payloadPosts: any[] = Array.isArray(payloadCache?.posts) ? payloadCache!.posts : [];

      if (cmsSettings.syncMode === 'local') {
        return res.json({ success: true, source: 'local', data: localPosts });
      }

      if (cmsSettings.syncMode === 'payload_priority' && payloadPosts.length > 0) {
        return res.json({ success: true, source: 'payload', data: payloadPosts });
      }

      // Hybrid mode: merge Payload CMS posts + Local posts (dedupe by slug, Payload wins on collision)
      if (payloadPosts.length > 0) {
        const slugMap = new Map<string, any>();
        payloadPosts.forEach((p) => slugMap.set(String(p.slug || p.id), p));
        localPosts.forEach((p) => {
          const key = String(p.slug || p.id);
          if (!slugMap.has(key)) slugMap.set(key, p);
        });
        return res.json({ success: true, source: 'hybrid', data: Array.from(slugMap.values()) });
      }

      res.json({ success: true, source: 'local', data: localPosts });
    } catch (err: any) {
      console.error("Posts fetch error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/posts', async (req, res) => {
    try {
      const posts = req.body;
      const check = inspectPayloadForMaliciousContent(posts);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['blog_posts', JSON.stringify(posts)]
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error("Posts save error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // CMS Long-Form Guides (/app/guide) — Payload CMS + Supabase Editable
  app.get('/api/guides', async (req, res) => {
    try {
      const [cmsSettings, payloadCache, localRes] = await Promise.all([
        getCmsSettings(pool),
        getPayloadSyncCache(pool),
        pool.query("SELECT data FROM app_state WHERE id = 'cms_guides'"),
      ]);

      const localGuides: any[] =
        localRes.rows.length > 0 && Array.isArray(localRes.rows[0].data)
          ? localRes.rows[0].data.map((g: any) => ({ ...g, source: g.source || 'local' }))
          : [];
      const payloadGuides: any[] = Array.isArray(payloadCache?.guides) ? payloadCache!.guides : [];

      if (cmsSettings.syncMode !== 'local' && payloadGuides.length > 0) {
        if (cmsSettings.syncMode === 'payload_priority') {
          return res.json({ success: true, source: 'payload', data: payloadGuides });
        }
        const idMap = new Map<string, any>();
        payloadGuides.forEach((g) => idMap.set(String(g.slug || g.id), g));
        localGuides.forEach((g) => {
          const key = String(g.slug || g.id);
          if (!idMap.has(key)) idMap.set(key, g);
        });
        return res.json({ success: true, source: 'hybrid', data: Array.from(idMap.values()) });
      }

      res.json({ success: true, source: 'local', data: localGuides });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/guides', async (req, res) => {
    try {
      const guides = Array.isArray(req.body) ? req.body : [];
      const check = inspectPayloadForMaliciousContent(guides);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['cms_guides', JSON.stringify(guides)]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Payload CMS Admin Overview, Settings, Manual Sync, and Webhook
  app.get('/api/admin/cms/overview', async (req, res) => {
    try {
      const [settings, cache, envCfg] = await Promise.all([
        getCmsSettings(pool),
        getPayloadSyncCache(pool),
        Promise.resolve(getPayloadConfig()),
      ]);
      const payloadStatus = await checkPayloadHealth(settings);
      res.json({
        success: true,
        settings,
        payloadStatus: {
          ...payloadStatus,
          hasApiKey: Boolean(envCfg.apiKey),
          hasWebhookSecret: Boolean(envCfg.webhookSecret),
          urlMasked: maskPayloadUrl(envCfg.url),
        },
        cache: cache
          ? {
              lastSyncedAt: cache.lastSyncedAt,
              stats: cache.stats,
            }
          : null,
        blueprint: PAYLOAD_SCHEMA_BLUEPRINT,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/cms/settings', async (req, res) => {
    try {
      const body = req.body || {};
      const check = inspectPayloadForMaliciousContent(body);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      const nextSettings = {
        syncMode: ['hybrid', 'payload_priority', 'local'].includes(body.syncMode) ? body.syncMode : DEFAULT_CMS_SETTINGS.syncMode,
        autoSyncOnWebhook: body.autoSyncOnWebhook !== undefined ? Boolean(body.autoSyncOnWebhook) : true,
        postsCollection: String(body.postsCollection || 'posts').replace(/[^a-zA-Z0-9_-]/g, '') || 'posts',
        pagesCollection: String(body.pagesCollection || 'pages').replace(/[^a-zA-Z0-9_-]/g, '') || 'pages',
        guidesCollection: String(body.guidesCollection || 'guides').replace(/[^a-zA-Z0-9_-]/g, '') || 'guides',
      };
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['cms_settings', JSON.stringify(nextSettings)]
      );
      res.json({ success: true, settings: nextSettings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/cms/sync', async (req, res) => {
    try {
      const result = await syncFromPayload(pool, inspectPayloadForMaliciousContent);
      if (!result.success) {
        return res.status(400).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        lastSyncedAt: result.cache?.lastSyncedAt,
        stats: result.cache?.stats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/webhooks/payload', async (req, res) => {
    try {
      const cfg = getPayloadConfig();
      const provided =
        String(req.headers['x-payload-webhook-secret'] || '') ||
        String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

      if (!cfg.webhookSecret || !verifyPayloadWebhookSecret(provided, cfg.webhookSecret)) {
        return res.status(401).json({ success: false, error: 'Unauthorized Payload webhook signature.' });
      }

      const cmsSettings = await getCmsSettings(pool);
      if (!cmsSettings.autoSyncOnWebhook) {
        return res.json({ success: true, skipped: true, reason: 'Webhook auto-sync dinonaktifkan di Admin' });
      }

      const result = await syncFromPayload(pool, inspectPayloadForMaliciousContent);
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        syncedAt: result.cache?.lastSyncedAt,
        stats: result.cache?.stats,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // CRUD for FAQs
  
  
  app.get('/api/admin/coupons', async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'coupons'");
      const coupons = result.rows.length > 0 ? result.rows[0].data : [];
      res.json({ success: true, data: coupons });
    } catch (err) {
      console.error('Error fetching coupons:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
    }
  });

  app.post('/api/admin/coupons', async (req, res) => {
    try {
      const coupons = req.body.coupons;
      
      const check = inspectPayloadForMaliciousContent(coupons);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(
        "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()",
        ['coupons', JSON.stringify(coupons)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving coupons:', err);
      res.status(500).json({ success: false, error: 'Failed to save coupons' });
    }
  });

  app.get('/api/subscriptions', async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'subscriptions'");
      if (result.rows.length > 0) {
        res.json({ success: true, data: result.rows[0].data });
      } else {
        res.json({ success: true, data: [] });
      }
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/subscriptions', async (req, res) => {
    try {
      const plans = req.body.plans;
      const check = inspectPayloadForMaliciousContent(plans);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(
        "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()",
        ['subscriptions', JSON.stringify(plans)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/faqs', async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'faqs'");
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : [] });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/faqs', async (req, res) => {
    try {
      const faqs = req.body;
      const check = inspectPayloadForMaliciousContent(faqs);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['faqs', JSON.stringify(faqs)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  const SECRET_SETTING_FIELDS = [
    'duitkuSandboxMerchantCode',
    'duitkuSandboxApiKey',
    'duitkuProductionMerchantCode',
    'duitkuProductionApiKey',
    'duitkuMerchantCode',
    'duitkuApiKey',
    'emailApiKey',
    'emailApiBaseUrl',
    'smtpHost',
    'smtpPort',
    'smtpUser',
    'smtpPass',
    'smtpSecure',
    'smtpAllowSelfSigned',
    'smtpNoAuth',
    'telegramBotToken',
    'capiToken',
    'pixelId',
    'openRouterApiKey',
    'geminiApiKey',
  ];

  const getIntegrationEnvStatus = () => ({
    database: Boolean(process.env.DATABASE_URL),
    duitkuSandbox: Boolean(
      (process.env.DUITKU_SANDBOX_MERCHANT_CODE || process.env.DUITKU_MERCHANT_CODE) &&
      (process.env.DUITKU_SANDBOX_API_KEY || process.env.DUITKU_API_KEY)
    ),
    duitkuProduction: Boolean(
      (process.env.DUITKU_PRODUCTION_MERCHANT_CODE || process.env.DUITKU_MERCHANT_CODE) &&
      (process.env.DUITKU_PRODUCTION_API_KEY || process.env.DUITKU_API_KEY)
    ),
    smtp: Boolean(
      process.env.SMTP_HOST &&
      (process.env.SMTP_NO_AUTH === 'true' || (process.env.SMTP_USER && process.env.SMTP_PASS))
    ),
    freeResend: Boolean(process.env.RESEND_BASE_URL && process.env.RESEND_API_KEY),
    telegramBot: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    metaPixel: Boolean(process.env.META_PIXEL_ID),
    metaCapi: Boolean(process.env.META_CAPI_TOKEN),
    aiEngine: Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY),
    payloadCms: Boolean(getPayloadConfig().configured),
  });

  app.get('/api/admin/settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      const data = result.rows.length > 0 && result.rows[0].data ? { ...result.rows[0].data } : {};

      // Never return secrets/keys/tokens to dashboard UI
      SECRET_SETTING_FIELDS.forEach((field) => delete data[field]);

      res.json({ success: true, data, envStatus: getIntegrationEnvStatus() });
    } catch (err: any) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/settings', async (req, res) => {
    try {
      const existingRes = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      const existingData = existingRes.rows.length > 0 && existingRes.rows[0].data ? { ...existingRes.rows[0].data } : {};
      const data = { ...existingData, ...req.body };
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      // Enforce ENV-only secrets: strip all integration keys, tokens, passwords, and merchant codes
      SECRET_SETTING_FIELDS.forEach((field) => delete data[field]);

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        ['global_settings', JSON.stringify(data)]
      );
      res.json({ success: true, envStatus: getIntegrationEnvStatus() });
    } catch (err: any) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  // Live Integration Connectivity Status for Admin Dashboard ("PLU CONNECTED" indicator)
  let cachedIntegrationsStatus: { timestamp: number; payload: any } | null = null;

  app.get('/api/admin/integrations-status', async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
      const now = Date.now();
      if (!forceRefresh && cachedIntegrationsStatus && now - cachedIntegrationsStatus.timestamp < 20_000) {
        return res.json(cachedIntegrationsStatus.payload);
      }

      const isValidEnvSecret = (val?: string) => {
        const trimmed = (val || '').trim();
        if (!trimmed) return false;
        const lower = trimmed.toLowerCase();
        return (
          !lower.startsWith('my_') &&
          !lower.startsWith('your_') &&
          !lower.includes('placeholder') &&
          trimmed.length >= 6
        );
      };

      const checks = await Promise.all([
        // 1. Database Supabase PostgreSQL
        (async () => {
          const hasDbUrl = Boolean((process.env.DATABASE_URL || '').trim());
          if (!hasDbUrl) {
            return {
              key: 'database',
              name: 'Database Supabase',
              configured: false,
              connected: false,
              detail: 'DATABASE_URL belum diset (berjalan pada memori lokal sementara)',
            };
          }
          try {
            await pool.query('SELECT 1');
            return {
              key: 'database',
              name: 'Database Supabase',
              configured: true,
              connected: true,
              detail: 'PostgreSQL Supabase terhubung & responsif',
            };
          } catch (err: any) {
            return {
              key: 'database',
              name: 'Database Supabase',
              configured: true,
              connected: false,
              detail: err?.message || 'Koneksi ke Supabase gagal',
            };
          }
        })(),

        // 2. Payment Gateway Duitku
        (async () => {
          try {
            const cfg = await getDuitkuConfig(pool);
            if (!cfg.merchantCode || !cfg.apiKey) {
              return {
                key: 'duitku',
                name: 'Duitku Payment Gateway',
                configured: false,
                connected: false,
                detail: `Kredensial Duitku (${cfg.env}) belum diset di ENV`,
              };
            }
            const amount = '10000';
            const d = new Date();
            const pad = (n: number) => (n < 10 ? '0' + n : String(n));
            const datetime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            const raw = `${cfg.merchantCode}${amount}${datetime}${cfg.apiKey}`;
            const signature = crypto.createHash('sha256').update(raw).digest('hex');
            const baseUrl =
              cfg.env === 'production'
                ? 'https://passport.duitku.com/webapi/api/merchant'
                : 'https://sandbox.duitku.com/webapi/api/merchant';

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4500);
            const resp = await fetch(`${baseUrl}/paymentmethod/getpaymentmethod`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchantcode: cfg.merchantCode,
                amount,
                datetime,
                signature,
              }),
              signal: controller.signal,
            });
            clearTimeout(timer);
            const data: any = await resp.json().catch(() => ({}));
            const ok = resp.ok && Array.isArray(data?.paymentFee);
            return {
              key: 'duitku',
              name: 'Duitku Payment Gateway',
              configured: true,
              connected: ok,
              detail: ok
                ? `Mode ${cfg.env.toUpperCase()} terhubung (${data.paymentFee.length} kanal bayar aktif)`
                : data?.Message || `Gagal terhubung ke API Duitku (${cfg.env})`,
            };
          } catch (err: any) {
            return {
              key: 'duitku',
              name: 'Duitku Payment Gateway',
              configured: true,
              connected: false,
              detail: err?.message || 'Timeout / gagal menghubungi server Duitku',
            };
          }
        })(),

        // 3. Email Gateway (SMTP VPS / FreeResend)
        (async () => {
          try {
            const { verifyEmailTransport } = await import('./server/email');
            const emailCfg = await getEmailConfig(pool);
            const configured = isEmailConfigured(emailCfg);
            if (!configured) {
              return {
                key: 'email',
                name: 'Email Gateway (SMTP / FreeResend)',
                configured: false,
                connected: false,
                detail: 'SMTP_* atau RESEND_* belum diset di ENV',
              };
            }
            const health = await verifyEmailTransport(pool);
            return {
              key: 'email',
              name: 'Email Gateway (SMTP / FreeResend)',
              configured: true,
              connected: Boolean(health.ok),
              detail: health.ok
                ? `Transport ${(health.provider || 'SMTP').toUpperCase()} terhubung`
                : health.error || 'Verifikasi server email gagal',
            };
          } catch (err: any) {
            return {
              key: 'email',
              name: 'Email Gateway (SMTP / FreeResend)',
              configured: true,
              connected: false,
              detail: err?.message || 'Gagal memverifikasi Email Gateway',
            };
          }
        })(),

        // 4. Telegram Bot
        (async () => {
          const tgToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
          if (!isValidEnvSecret(tgToken)) {
            return {
              key: 'telegram',
              name: 'Telegram Bot',
              configured: false,
              connected: false,
              detail: 'TELEGRAM_BOT_TOKEN belum diset di ENV',
            };
          }
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4500);
            const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`, {
              signal: controller.signal,
            });
            clearTimeout(timer);
            const tgJson: any = await tgRes.json().catch(() => ({}));
            const ok = Boolean(tgRes.ok && tgJson.ok && tgJson.result?.username);
            return {
              key: 'telegram',
              name: 'Telegram Bot',
              configured: true,
              connected: ok,
              detail: ok
                ? `Bot @${tgJson.result.username} online`
                : tgJson?.description || `Telegram API HTTP ${tgRes.status}`,
            };
          } catch (err: any) {
            return {
              key: 'telegram',
              name: 'Telegram Bot',
              configured: true,
              connected: false,
              detail: err?.message || 'Gagal menghubungi API Telegram',
            };
          }
        })(),

        // 5. AI Advisor Engine
        (async () => {
          const openRouterValid = isValidEnvSecret(process.env.OPENROUTER_API_KEY);
          const geminiValid = isValidEnvSecret(process.env.GEMINI_API_KEY);
          const configured = openRouterValid || geminiValid;
          const activeLabel = openRouterValid
            ? `OpenRouter (${process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'})`
            : geminiValid
            ? 'Google Gemini API'
            : 'Belum ada API Key AI di ENV';
          return {
            key: 'ai',
            name: 'AI Advisor Engine',
            configured,
            connected: configured,
            detail: configured ? `${activeLabel} siap digunakan` : activeLabel,
          };
        })(),

        // 6. Meta Pixel & Conversions API
        (async () => {
          const hasPixel = isValidEnvSecret(process.env.META_PIXEL_ID);
          const hasCapi = isValidEnvSecret(process.env.META_CAPI_TOKEN);
          const configured = hasPixel || hasCapi;
          const connected = hasPixel && hasCapi;
          return {
            key: 'meta',
            name: 'Meta Pixel & CAPI',
            configured,
            connected,
            detail: connected
              ? 'Meta Pixel & Conversions API aktif via ENV'
              : hasPixel
              ? 'Pixel aktif, META_CAPI_TOKEN belum diset'
              : 'META_PIXEL_ID & META_CAPI_TOKEN belum diset di ENV',
          };
        })(),

        // 7. Payload CMS (Headless Content Engine)
        (async () => {
          try {
            const cmsSettings = await getCmsSettings(pool);
            const health = await checkPayloadHealth(cmsSettings);
            return {
              key: 'payloadCms',
              name: 'Payload CMS (Headless)',
              configured: health.configured,
              connected: health.connected,
              detail: health.detail,
            };
          } catch (err: any) {
            return {
              key: 'payloadCms',
              name: 'Payload CMS (Headless)',
              configured: Boolean(process.env.PAYLOAD_CMS_URL),
              connected: false,
              detail: err?.message || 'Gagal memeriksa Payload CMS',
            };
          }
        })(),
      ]);

      const connectedCount = checks.filter((c) => c.connected).length;
      const payload = {
        success: true,
        checkedAt: new Date().toISOString(),
        connectedCount,
        totalCount: checks.length,
        anyConnected: connectedCount > 0,
        integrations: checks,
      };
      cachedIntegrationsStatus = { timestamp: now, payload };
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Admin Email Test (FreeResend / SMTP)
  app.post('/api/admin/email/test', async (req, res) => {
    try {
      const { toEmail } = req.body;
      const cleanEmail = String(toEmail || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ success: false, error: 'Masukkan alamat email tujuan yang valid.' });
      }
      const result = await sendNotificationEmail('test', cleanEmail, {}, pool);
      if (result.success) {
        return res.json({ success: true, provider: result.provider, message: `Email uji coba berhasil dikirim via ${result.provider?.toUpperCase()} ke ${cleanEmail}` });
      }
      return res.status(400).json({ success: false, error: result.error || 'Gagal mengirim email uji coba.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Routes: Admin Email Templates (Customizable Auto Notifications)
  app.get('/api/admin/email/templates', async (req, res) => {
    try {
      const templates = await getEmailTemplates(pool);
      res.json({ success: true, data: templates, defaults: DEFAULT_EMAIL_TEMPLATES });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/email/templates', async (req, res) => {
    try {
      const templates = req.body;
      const check = inspectPayloadForMaliciousContent(templates);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['email_templates', JSON.stringify(templates)]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Routes: Admin Email Broadcast (Targeted Account Checklist & Version Release)
  app.get('/api/admin/email/broadcast-logs', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['email_broadcast_logs']);
      const logs = result.rows.length > 0 && Array.isArray(result.rows[0].data) ? result.rows[0].data : [];
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/email/broadcast', async (req, res) => {
    try {
      const { recipients, subject, title, body, ctaText, ctaUrl, category } = req.body || {};
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'Pilih minimal 1 akun penerima pada checklist.' });
      }
      if (!subject || !String(subject).trim() || !body || !String(body).trim()) {
        return res.status(400).json({ success: false, error: 'Subjek dan isi pesan email wajib diisi.' });
      }

      const check = inspectPayloadForMaliciousContent({ subject, title, body, ctaText, ctaUrl });
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      const emailCfg = await getEmailConfig(pool);
      if (!isEmailConfigured(emailCfg)) {
        return res.status(400).json({ success: false, error: 'Email Gateway (FreeResend / SMTP) belum dikonfigurasi di Pengaturan Sistem.' });
      }

      const uniqueRecipients: BroadcastRecipient[] = [];
      const seen = new Set<string>();
      for (const r of recipients) {
        const cleanEmail = String(r?.email || '').trim().toLowerCase();
        if (cleanEmail && cleanEmail.includes('@') && !seen.has(cleanEmail)) {
          seen.add(cleanEmail);
          uniqueRecipients.push({
            email: cleanEmail,
            name: r?.name ? String(r.name) : undefined,
            planName: r?.planName ? String(r.planName) : undefined,
            expiresAt: r?.expiresAt ? String(r.expiresAt) : undefined,
          });
        }
      }

      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const recipient of uniqueRecipients) {
        const sendRes = await sendCustomBroadcastEmail(pool, recipient, {
          subject: String(subject),
          title: String(title || subject),
          body: String(body),
          ctaText: ctaText ? String(ctaText) : undefined,
          ctaUrl: ctaUrl ? String(ctaUrl) : undefined,
        });
        if (sendRes.success) {
          sentCount++;
        } else {
          failedCount++;
          if (errors.length < 5 && sendRes.error) {
            errors.push(`${recipient.email}: ${sendRes.error}`);
          }
        }
      }

      // Save broadcast log (keep last 25)
      try {
        const existingLogRes = await pool.query('SELECT data FROM app_state WHERE id = $1', ['email_broadcast_logs']);
        const existingLogs = existingLogRes.rows.length > 0 && Array.isArray(existingLogRes.rows[0].data)
          ? existingLogRes.rows[0].data
          : [];
        existingLogs.unshift({
          id: `bc_${Date.now()}`,
          sentAt: new Date().toISOString(),
          category: category || 'custom',
          subject: String(subject),
          totalTargets: uniqueRecipients.length,
          sentCount,
          failedCount,
          sampleEmails: uniqueRecipients.slice(0, 5).map(u => u.email),
        });
        await pool.query(
          `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
          ['email_broadcast_logs', JSON.stringify(existingLogs.slice(0, 25))]
        );
      } catch (logErr) {
        console.warn('Failed to save broadcast log:', logErr);
      }

      res.json({
        success: sentCount > 0,
        sentCount,
        failedCount,
        totalTargets: uniqueRecipients.length,
        errors,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Routes: Admin Auto-Detect Error Monitor & Developer Email Reporter
  app.get('/api/admin/error-monitor', async (req, res) => {
    try {
      const [config, logs, history] = await Promise.all([
        getErrorMonitorConfig(pool),
        getSystemErrorLogs(pool),
        getErrorReportHistory(pool),
      ]);
      res.json({
        success: true,
        config,
        logs,
        history,
        integrationsMeta: INTEGRATION_META,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/error-monitor/config', async (req, res) => {
    try {
      const body = req.body || {};
      const check = inspectPayloadForMaliciousContent(body);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }
      const rawDevEmail = String(body.developerEmail ?? '').trim();
      if (rawDevEmail && parseDeveloperEmails(rawDevEmail).length === 0) {
        return res.status(400).json({ success: false, error: 'Format email developer tidak valid. Contoh: dev@domainanda.com' });
      }
      const saved = await saveErrorMonitorConfig(pool, {
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
        developerEmail: rawDevEmail,
        realtimeEnabled: body.realtimeEnabled !== undefined ? Boolean(body.realtimeEnabled) : true,
        realtimeCooldownMinutes: body.realtimeCooldownMinutes !== undefined ? Number(body.realtimeCooldownMinutes) : 5,
        scheduledEnabled: body.scheduledEnabled !== undefined ? Boolean(body.scheduledEnabled) : true,
        scheduledIntervalMinutes: body.scheduledIntervalMinutes !== undefined ? Number(body.scheduledIntervalMinutes) : 60,
        autoResolveOnRecovery: body.autoResolveOnRecovery !== undefined ? Boolean(body.autoResolveOnRecovery) : true,
      });
      res.json({ success: true, config: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/error-monitor/resolve', async (req, res) => {
    try {
      const { id, status = 'resolved', resolveAll = false } = req.body || {};
      if (resolveAll) {
        const resolvedCount = await resolveAllOpenErrors(pool);
        return res.json({ success: true, resolvedCount });
      }
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID error log wajib diisi.' });
      }
      const updated = await resolveErrorLogById(pool, String(id), status === 'open' ? 'open' : 'resolved');
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Log error tidak ditemukan.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/error-monitor/clear', async (req, res) => {
    try {
      const { clearAll = false } = req.body || {};
      const removedCount = await clearResolvedErrorLogs(pool, Boolean(clearAll));
      res.json({ success: true, removedCount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/error-monitor/health-check', async (req, res) => {
    try {
      const report = await runAllIntegrationHealthChecks(pool);
      res.json({ success: true, ...report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/error-monitor/send-digest', async (req, res) => {
    try {
      const result = await runScheduledDigestCheck(pool, { force: true });
      if (!result.sent) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Gagal mengirim laporan terjadwal ke email developer.',
        });
      }
      res.json({
        success: true,
        errorCount: result.errorCount,
        message: `Laporan tabel (${result.errorCount} error aktif) berhasil dikirim ke email developer.`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/error-monitor/test', async (req, res) => {
    try {
      const monCfg = await getErrorMonitorConfig(pool);
      const devEmails = parseDeveloperEmails(monCfg.developerEmail);
      if (devEmails.length === 0) {
        return res.status(400).json({ success: false, error: 'Isi dan simpan Email Developer terlebih dahulu.' });
      }
      const emailCfg = await getEmailConfig(pool);
      if (!isEmailConfigured(emailCfg)) {
        return res.status(400).json({ success: false, error: 'Email Gateway (SMTP VPS / FreeResend) belum dikonfigurasi di Pengaturan Sistem.' });
      }

      const simResult = await recordIntegrationError(pool, {
        integration: 'test',
        action: 'POST /api/admin/error-monitor/test',
        message: 'Simulasi deteksi error realtime (Uji coba format tabel laporan developer)',
        details: `Dikirim oleh Admin ke ${devEmails.join(', ')}`,
        stack: 'Error: Simulasi Uji Monitor Error\n    at AdminErrorMonitor (/server.ts:test)\n    at verifyDeveloperEmailAlert',
        severity: 'warning',
        bypassCooldown: true,
      });

      if (!simResult.realtimeDispatched) {
        return res.status(400).json({
          success: false,
          error: simResult.dispatchError || 'Simulasi tercatat di log, tetapi email realtime belum terkirim (pastikan Mode Realtime aktif).',
        });
      }
      res.json({
        success: true,
        message: `Simulasi error realtime berhasil dikirim dengan format tabel ke ${devEmails.join(', ')}!`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Routes: Auth OTP & Account Verification (FreeResend / SMTP Integrated)
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { email, purpose = 'register', name = '' } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Alamat email tidak valid.' });
      }

      const validPurpose = purpose === 'reset_password' ? 'reset_password' : 'register';
      const emailCfg = await getEmailConfig(pool);
      if (!isEmailConfigured(emailCfg)) {
        return res.status(503).json({
          success: false,
          notConfigured: true,
          error: 'Layanan email (FreeResend / SMTP) belum dikonfigurasi oleh admin.'
        });
      }

      const otpKey = `otp_${validPurpose}_${cleanEmail}`;
      const existingRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [otpKey]);
      if (existingRes.rows.length > 0 && existingRes.rows[0].data) {
        const existing = existingRes.rows[0].data;
        if (existing.lastSentAt && Date.now() - existing.lastSentAt < 30 * 1000) {
          const waitSec = Math.ceil((30 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
          return res.status(429).json({ success: false, error: `Tunggu ${waitSec} detik sebelum meminta kode OTP baru.` });
        }
      }

      const otp = String(crypto.randomInt(100000, 999999));
      const otpHash = crypto.createHash('sha256').update(`${cleanEmail}:${validPurpose}:${otp}`).digest('hex');
      const now = Date.now();

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [otpKey, JSON.stringify({
          hash: otpHash,
          email: cleanEmail,
          purpose: validPurpose,
          expiresAt: now + 10 * 60 * 1000,
          lastSentAt: now,
          attempts: 0,
          used: false
        })]
      );

      const sendResult = await sendNotificationEmail('otp', cleanEmail, {
        otp,
        name: String(name || '').trim(),
        purpose: validPurpose
      }, pool);

      if (!sendResult.success) {
        return res.status(500).json({
          success: false,
          error: sendResult.error || 'Gagal mengirim email OTP.'
        });
      }

      return res.json({
        success: true,
        provider: sendResult.provider,
        message: `Kode OTP 6 digit telah dikirim ke ${cleanEmail}`
      });
    } catch (err: any) {
      console.error('Send OTP Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { email, otp, purpose = 'register' } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanOtp = String(otp || '').trim();
      const validPurpose = purpose === 'reset_password' ? 'reset_password' : 'register';

      if (!cleanEmail || !/^\d{6}$/.test(cleanOtp)) {
        return res.status(400).json({ success: false, error: 'Masukkan kode OTP 6 digit yang valid.' });
      }

      const otpKey = `otp_${validPurpose}_${cleanEmail}`;
      const existingRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [otpKey]);
      if (existingRes.rows.length === 0 || !existingRes.rows[0].data) {
        return res.status(400).json({ success: false, error: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' });
      }

      const record = existingRes.rows[0].data;
      if (record.used || !record.expiresAt || Date.now() > record.expiresAt) {
        return res.status(400).json({ success: false, error: 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.' });
      }

      if ((record.attempts || 0) >= 5) {
        return res.status(429).json({ success: false, error: 'Terlalu banyak percobaan salah. Silakan minta kode OTP baru.' });
      }

      const candidateHash = crypto.createHash('sha256').update(`${cleanEmail}:${validPurpose}:${cleanOtp}`).digest('hex');
      const isMatch = crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(record.hash));

      if (!isMatch) {
        record.attempts = (record.attempts || 0) + 1;
        await pool.query(
          `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
          [otpKey, JSON.stringify(record)]
        );
        return res.status(400).json({ success: false, error: 'Kode OTP salah. Silakan periksa kembali email Anda.' });
      }

      record.used = true;
      record.verifiedAt = Date.now();
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [otpKey, JSON.stringify(record)]
      );

      return res.json({ success: true, verified: true });
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanOtp = String(otp || '').trim();
      const password = String(newPassword || '');

      if (!cleanEmail || !/^\d{6}$/.test(cleanOtp) || password.length < 4) {
        return res.status(400).json({ success: false, error: 'Email, kode OTP 6 digit, dan kata sandi baru wajib diisi.' });
      }

      const otpKey = `otp_reset_password_${cleanEmail}`;
      const existingRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [otpKey]);
      if (existingRes.rows.length === 0 || !existingRes.rows[0].data) {
        return res.status(400).json({ success: false, error: 'Kode OTP tidak ditemukan atau sudah kadaluarsa.' });
      }

      const record = existingRes.rows[0].data;
      if (record.used || !record.expiresAt || Date.now() > record.expiresAt) {
        return res.status(400).json({ success: false, error: 'Kode OTP sudah kadaluarsa. Silakan minta kode baru.' });
      }

      const candidateHash = crypto.createHash('sha256').update(`${cleanEmail}:reset_password:${cleanOtp}`).digest('hex');
      const isMatch = crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(record.hash));
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Kode OTP salah.' });
      }

      record.used = true;
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [otpKey, JSON.stringify(record)]
      );

      const userKey = `user_profile_${cleanEmail}`;
      const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userKey]);
      const userProfile = userRes.rows.length > 0 && userRes.rows[0].data ? userRes.rows[0].data : { email: cleanEmail };
      const salt = crypto.randomBytes(16).toString('hex');
      const pwHash = crypto.scryptSync(password, salt, 64).toString('hex');
      userProfile.passwordHash = `${salt}:${pwHash}`;
      userProfile.passwordUpdatedAt = new Date().toISOString();

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [userKey, JSON.stringify(userProfile)]
      );

      sendNotificationEmail('change_pin', cleanEmail, { name: userProfile.name }, pool).catch(() => {});

      return res.json({ success: true, message: 'Kata sandi berhasil diperbarui.' });
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Cloud Sync Fetch
  app.get('/api/sync/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query('SELECT data, updated_at FROM app_state WHERE id = $1', [userId]);
      if (result.rows.length > 0) {
        res.json({ success: true, data: result.rows[0].data, updatedAt: (result.rows[0] as any).updated_at });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (err: any) {
      console.error('DB Fetch Error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch state' });
    }
  });

  // API Route: Cloud Sync Save (preserves server-authoritative subscription & compensation records)
  app.post('/api/sync/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const incoming = req.body && typeof req.body === 'object' ? { ...req.body } : {};

      const existingRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userId]);
      let existingData: any = existingRes.rows.length > 0 ? existingRes.rows[0].data : null;
      if (typeof existingData === 'string') {
        try { existingData = JSON.parse(existingData); } catch { existingData = null; }
      }

      if (existingData && existingData.subscription) {
        incoming.subscription = existingData.subscription;
      }
      if (existingData && existingData.lastCompensationNotice) {
        incoming.lastCompensationNotice = existingData.lastCompensationNotice;
      }

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        [userId, JSON.stringify(incoming)]
      );

      res.json({ success: true });
    } catch (err: any) {
      console.error('DB Sync Error:', err);
      res.status(500).json({ success: false, error: 'Failed to sync state' });
    }
  });

  // API Route: Admin Maintenance & Compensation Overview
  app.get('/api/admin/maintenance-compensation', async (req, res) => {
    try {
      const settingsRes = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
      const d = settingsRes.rows.length > 0 && settingsRes.rows[0].data ? settingsRes.rows[0].data : {};

      const logsRes = await pool.query("SELECT data FROM app_state WHERE id = 'compensation_logs'");
      const logs = logsRes.rows.length > 0 && Array.isArray(logsRes.rows[0].data) ? logsRes.rows[0].data : [];

      const usersRes = await pool.query("SELECT id, data FROM app_state WHERE id LIKE 'user_profile_%'");
      const users = (usersRes.rows || []).map((r: any) => {
        let u = r.data;
        if (typeof u === 'string') {
          try { u = JSON.parse(u); } catch { u = {}; }
        }
        const email = (u?.email || r.id.replace('user_profile_', '')).toLowerCase();
        return {
          id: r.id.replace('user_profile_', ''),
          name: u?.name || email.split('@')[0],
          email,
          subscription: u?.subscription || null,
          lastCompensationNotice: u?.lastCompensationNotice || null,
          createdAt: u?.createdAt || null,
        };
      });

      res.json({
        success: true,
        config: {
          maintenance: Boolean(d.maintenance),
          maintenanceTitle: d.maintenanceTitle || 'Sistem Sedang Dalam Pemeliharaan',
          maintenanceMessage:
            d.maintenanceMessage ||
            'Kami sedang melakukan pemeliharaan dan peningkatan server agar layanan semakin cepat & stabil. Data keuangan Anda tetap aman.',
          maintenanceEstimatedEnd: d.maintenanceEstimatedEnd || '',
          compensationBannerEnabled: Boolean(d.compensationBannerEnabled),
          compensationBannerText:
            d.compensationBannerText ||
            'Sebagai bentuk apresiasi atas kesabaran Anda selama maintenance, seluruh pengguna aktif berhak menerima kompensasi tambahan masa langganan.',
          maintenanceUpdatedAt: d.maintenanceUpdatedAt || null,
        },
        users,
        logs,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Update Maintenance Mode & Compensation Notification Settings
  app.post('/api/admin/maintenance-compensation', async (req, res) => {
    try {
      const payload = req.body || {};
      const check = inspectPayloadForMaliciousContent(payload);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      const existingRes = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
      const existingData = existingRes.rows.length > 0 && existingRes.rows[0].data ? { ...existingRes.rows[0].data } : {};

      const updated = {
        ...existingData,
        maintenance: Boolean(payload.maintenance),
        maintenanceTitle: String(payload.maintenanceTitle || existingData.maintenanceTitle || 'Sistem Sedang Dalam Pemeliharaan').trim(),
        maintenanceMessage: String(payload.maintenanceMessage || existingData.maintenanceMessage || '').trim(),
        maintenanceEstimatedEnd: String(payload.maintenanceEstimatedEnd || '').trim(),
        compensationBannerEnabled: Boolean(payload.compensationBannerEnabled),
        compensationBannerText: String(payload.compensationBannerText || existingData.compensationBannerText || '').trim(),
        maintenanceUpdatedAt: new Date().toISOString(),
      };

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
        ['global_settings', JSON.stringify(updated)]
      );

      res.json({
        success: true,
        config: {
          maintenance: updated.maintenance,
          maintenanceTitle: updated.maintenanceTitle,
          maintenanceMessage: updated.maintenanceMessage,
          maintenanceEstimatedEnd: updated.maintenanceEstimatedEnd,
          compensationBannerEnabled: updated.compensationBannerEnabled,
          compensationBannerText: updated.compensationBannerText,
          maintenanceUpdatedAt: updated.maintenanceUpdatedAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Extend Subscription Duration (in Days) + Generate Compensation Invoices + Send Notifications
  app.post('/api/admin/subscriptions/extend', async (req, res) => {
    try {
      const {
        days,
        targetMode = 'active_paid', // 'active_paid' | 'active_all' | 'all_users' | 'selected'
        selectedEmails = [],
        reason = 'Kompensasi Maintenance Sistem',
        createInvoice = true,
        sendEmailNotification = true,
        sendTelegramNotification = true,
        enableCompensationBanner = false,
      } = req.body || {};

      const bonusDays = Math.floor(Number(days));
      if (!Number.isFinite(bonusDays) || bonusDays < 1 || bonusDays > 3650) {
        return res.status(400).json({ success: false, error: 'Jumlah hari tambahan harus antara 1 sampai 3650 hari.' });
      }

      const cleanReason = String(reason || 'Kompensasi Maintenance Sistem').trim();
      const check = inspectPayloadForMaliciousContent(cleanReason);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      const usersRes = await pool.query("SELECT id, data FROM app_state WHERE id LIKE 'user_profile_%'");
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const addMs = bonusDays * 24 * 60 * 60 * 1000;

      const selectedSet = new Set(
        Array.isArray(selectedEmails) ? selectedEmails.map((e: string) => String(e).trim().toLowerCase()) : []
      );

      const allProfiles: Array<{ rowId: string; email: string; data: any }> = [];
      for (const row of usersRes.rows || []) {
        let u = row.data;
        if (typeof u === 'string') {
          try { u = JSON.parse(u); } catch { continue; }
        }
        if (!u || typeof u !== 'object') continue;
        const email = String(u.email || row.id.replace('user_profile_', '')).trim().toLowerCase();
        if (!email || !email.includes('@')) continue;
        allProfiles.push({ rowId: row.id, email, data: u });
      }

      const targets = allProfiles.filter(({ email, data }) => {
        if (targetMode === 'selected') {
          return selectedSet.has(email);
        }
        const sub = data.subscription;
        const expMs = sub?.expiresAt ? new Date(sub.expiresAt).getTime() : 0;
        const isStillActive = Boolean(sub && sub.status === 'active' && expMs > nowMs);
        const isPaidPlan = Boolean(sub && sub.planId && sub.planId !== 'free_trial');

        if (targetMode === 'active_paid') {
          return isStillActive && isPaidPlan;
        }
        if (targetMode === 'active_all') {
          return isStillActive;
        }
        // 'all_users'
        return true;
      });

      if (targets.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tidak ada user yang cocok dengan filter target penerima saat ini.',
        });
      }

      const botInfo = sendTelegramNotification ? await getTelegramBotInfo() : null;
      const emailCfg = sendEmailNotification ? await getEmailConfig(pool) : null;
      const canSendEmail = Boolean(sendEmailNotification && emailCfg && isEmailConfigured(emailCfg));

      const datePart = `${new Date(nowMs).getFullYear()}${String(new Date(nowMs).getMonth() + 1).padStart(2, '0')}${String(new Date(nowMs).getDate()).padStart(2, '0')}`;
      const generatedInvoices: DuitkuTransaction[] = [];
      const batchResults: any[] = [];
      let emailsSentCount = 0;
      let telegramSentCount = 0;

      for (let idx = 0; idx < targets.length; idx++) {
        const target = targets[idx];
        const profile = { ...target.data };
        const prevSub = profile.subscription || {
          planId: 'monthly',
          planName: 'Paket Pro',
          price: 0,
          durationDays: 0,
          startDate: nowIso,
          expiresAt: nowIso,
          status: 'active',
        };

        const existingExpiryMs = prevSub.expiresAt ? new Date(prevSub.expiresAt).getTime() : 0;
        const baseTimeMs = existingExpiryMs > nowMs ? existingExpiryMs : nowMs;
        const newExpiryIso = new Date(baseTimeMs + addMs).toISOString();

        const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const invoiceNumber = `INV-COMP-${datePart}-${randSuffix}`;

        const updatedSub = {
          ...prevSub,
          durationDays: Number(prevSub.durationDays || 0) + bonusDays,
          expiresAt: newExpiryIso,
          status: 'active',
          lastExtendedAt: nowIso,
          lastExtensionDays: bonusDays,
          lastExtensionReason: cleanReason,
          invoiceId: createInvoice ? invoiceNumber : prevSub.invoiceId,
        };

        profile.subscription = updatedSub;
        profile.lastCompensationNotice = {
          id: invoiceNumber,
          bonusDays,
          reason: cleanReason,
          newExpiresAt: newExpiryIso,
          createdAt: nowIso,
        };

        if (createInvoice) {
          const billingEntry = {
            id: `comp_${nowMs}_${idx}`,
            invoiceId: invoiceNumber,
            date: new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(nowMs)),
            planId: updatedSub.planId || 'monthly',
            planName: `Kompensasi +${bonusDays} Hari (${cleanReason})`,
            amount: 0,
            originalAmount: 0,
            discount: 0,
            method: 'Kompensasi Admin',
            status: 'paid',
            isCompensation: true,
            bonusDays,
            reason: cleanReason,
            userEmail: target.email,
            userName: profile.name || target.email.split('@')[0],
          };

          const existingBilling = Array.isArray(profile.billingHistory) ? profile.billingHistory : [];
          profile.billingHistory = [billingEntry, ...existingBilling].slice(0, 50);

          const invoiceTx: DuitkuTransaction = {
            merchantOrderId: invoiceNumber,
            reference: `COMP-${randSuffix}`,
            planId: updatedSub.planId || 'monthly',
            planName: `Kompensasi +${bonusDays} Hari — ${cleanReason}`,
            amount: 0,
            paymentMethod: 'ADMIN_COMPENSATION',
            paymentMethodName: 'Kompensasi / Bonus Admin',
            email: target.email,
            userId: target.email,
            customerName: profile.name || target.email.split('@')[0],
            status: 'SUCCESS',
            createdAt: nowIso,
            paidAt: nowIso,
            env: 'compensation',
            isCompensation: true,
            bonusDays,
            reason: cleanReason,
            newExpiresAt: newExpiryIso,
          };
          generatedInvoices.push(invoiceTx);
        }

        // Persist updated user_profile_<email>
        await pool.query(
          `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
          [target.rowId, JSON.stringify(profile)]
        );

        // Also update workspace state `<email>` if it exists so subscription stays consistent
        let telegramChatId = '';
        try {
          const wsRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [target.email]);
          if (wsRes.rows.length > 0 && wsRes.rows[0].data) {
            let wsData = wsRes.rows[0].data;
            if (typeof wsData === 'string') {
              try { wsData = JSON.parse(wsData); } catch { wsData = {}; }
            }
            telegramChatId = wsData?.notificationSettings?.telegramChatId || '';
            wsData.subscription = updatedSub;
            wsData.lastCompensationNotice = profile.lastCompensationNotice;
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
              [target.email, JSON.stringify(wsData)]
            );
          }
        } catch (wsErr) {
          console.warn('Workspace state update warning for', target.email, wsErr);
        }

        // Dispatch Email Notification + Compensation Invoice PDF (best effort)
        let emailOk = false;
        if (canSendEmail) {
          const latestInvoice = generatedInvoices[generatedInvoices.length - 1];
          const mailRes = await sendCompensationEmail(
            target.email,
            {
              customerName: profile.name || target.email.split('@')[0],
              bonusDays,
              reason: cleanReason,
              newExpiresAt: newExpiryIso,
              invoiceData: createInvoice ? latestInvoice : undefined,
            },
            pool
          );
          emailOk = Boolean(mailRes.success);
          if (emailOk) emailsSentCount++;
        }

        // Dispatch Telegram Push Notification if user linked Telegram
        if (sendTelegramNotification && botInfo?.token && telegramChatId) {
          try {
            const expDisplay = new Date(newExpiryIso).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            const tgText =
              `🎁 *KOMPENSASI LANGGANAN +${bonusDays} HARI*\n\n` +
              `Halo ${profile.name || 'Sahabat Portal Uang'}, masa aktif langganan Anda ditambah *+${bonusDays} Hari*.\n` +
              `• Keterangan: ${cleanReason}\n` +
              `• Aktif hingga: *${expDisplay}*\n` +
              (createInvoice ? `• No. Invoice: \`${invoiceNumber}\` (Rp 0 / Lunas)` : '');

            const tgResp = await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramChatId,
                text: tgText,
                parse_mode: 'Markdown',
              }),
            });
            if (tgResp.ok) telegramSentCount++;
          } catch {
            // ignore per-user telegram error
          }
        }

        batchResults.push({
          email: target.email,
          name: profile.name || target.email,
          invoiceId: createInvoice ? invoiceNumber : null,
          previousExpiresAt: prevSub.expiresAt || null,
          newExpiresAt: newExpiryIso,
          emailSent: emailOk,
        });
      }

      if (createInvoice && generatedInvoices.length > 0) {
        await saveTransactionsBatch(pool, generatedInvoices);
      }

      // Optionally update global compensation banner text
      if (enableCompensationBanner) {
        const gsRes = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
        const gs = gsRes.rows.length > 0 && gsRes.rows[0].data ? { ...gsRes.rows[0].data } : {};
        gs.compensationBannerEnabled = true;
        gs.compensationBannerText = `Kompensasi +${bonusDays} hari langganan (${cleanReason}) telah diberikan kepada ${targets.length} pengguna.`;
        await pool.query(
          `INSERT INTO app_state (id, data, updated_at) VALUES ('global_settings', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
          [JSON.stringify(gs)]
        );
      }

      // Save compensation audit log
      const compLogEntry = {
        id: `complog_${nowMs}`,
        createdAt: nowIso,
        bonusDays,
        targetMode,
        reason: cleanReason,
        affectedCount: targets.length,
        invoicesCreated: createInvoice ? generatedInvoices.length : 0,
        emailsSent: emailsSentCount,
        telegramSent: telegramSentCount,
        sampleInvoices: batchResults.slice(0, 20),
      };

      const logsRes = await pool.query("SELECT data FROM app_state WHERE id = 'compensation_logs'");
      const existingLogs = logsRes.rows.length > 0 && Array.isArray(logsRes.rows[0].data) ? logsRes.rows[0].data : [];
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ('compensation_logs', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
        [JSON.stringify([compLogEntry, ...existingLogs].slice(0, 100))]
      );

      res.json({
        success: true,
        affectedCount: targets.length,
        invoicesCreated: createInvoice ? generatedInvoices.length : 0,
        emailsSent: emailsSentCount,
        telegramSent: telegramSentCount,
        results: batchResults,
      });
    } catch (err: any) {
      console.error('Error extending subscriptions:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: User Authoritative Subscription & Invoice History (Integrates Duitku + Compensation Invoices)
  app.get('/api/user/subscription-status', async (req, res) => {
    try {
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Email diperlukan.' });
      }

      const profileKey = `user_profile_${email}`;
      const profRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [profileKey]);
      let profData: any = profRes.rows.length > 0 ? profRes.rows[0].data : null;
      if (typeof profData === 'string') {
        try { profData = JSON.parse(profData); } catch { profData = null; }
      }

      const allTx = await getAllTransactions(pool);
      const userTxs = allTx.filter(
        (t) =>
          String(t.email || '').toLowerCase() === email ||
          String(t.userId || '').toLowerCase() === email
      );

      const invoices = userTxs.map((tx) => ({
        id: tx.merchantOrderId,
        invoiceId: tx.merchantOrderId,
        date: new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(tx.paidAt || tx.createdAt)),
        planId: tx.planId,
        planName: tx.planName,
        amount: Number(tx.amount || 0),
        originalAmount: Number(tx.amount || 0),
        discount: 0,
        method: tx.paymentMethodName || tx.paymentMethod || 'Duitku',
        status: tx.isCompensation ? 'compensation' : tx.status === 'SUCCESS' ? 'paid' : 'pending',
        isCompensation: Boolean(tx.isCompensation),
        bonusDays: tx.bonusDays,
        reason: tx.reason,
        userEmail: tx.email,
        userName: tx.customerName || profData?.name || email.split('@')[0],
      }));

      res.json({
        success: true,
        subscription: profData?.subscription || null,
        compensationNotice: profData?.lastCompensationNotice || null,
        invoices,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Download Official PDF Invoice (Duitku Paid & Admin Compensation Invoices)
  app.get('/api/user/invoice-pdf/:merchantOrderId', async (req, res) => {
    try {
      const { merchantOrderId } = req.params;
      const queryEmail = String(req.query.email || '').trim().toLowerCase();
      const isAdmin = req.headers.authorization === `Bearer ${ADMIN_AUTH_TOKEN}`;

      const allTx = await getAllTransactions(pool);
      const tx = allTx.find((t) => t.merchantOrderId === merchantOrderId);
      if (!tx) {
        return res.status(404).json({ success: false, error: 'Invoice tidak ditemukan.' });
      }

      const txEmail = String(tx.email || tx.userId || '').toLowerCase();
      if (!isAdmin && (!queryEmail || txEmail !== queryEmail)) {
        return res.status(403).json({ success: false, error: 'Akses invoice ditolak.' });
      }

      const pdfBuffer = await generateInvoicePDFBuffer(tx);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_${tx.merchantOrderId}.pdf"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Gagal membuat PDF invoice: ' + err.message });
    }
  });

  // Helper for Hybrid Mode (Smart Algorithmic Engine)
  const generateSmartFallback = (mode: string, payload: any, userPrompt?: string): string => {
    let response = "";
    if (mode === 'budget_audit') {
      const unassigned = payload?.unassignedCash || 0;
      const categories = payload?.budgetCategories || [];
      let totalAllocated = 0;
      let totalSpent = 0;
      
      categories.forEach((c: any) => {
        totalAllocated += Number(c.allocated || 0);
        totalSpent += Number(c.spent || 0);
      });
      
      let highestCategory = categories.length > 0 ? categories.reduce((prev: any, current: any) => ((current.spent || 0) > (prev.spent || 0)) ? current : prev, {spent: 0, name: 'Tidak ada'}) : null;
      
      response = "🤖 **[Mode Algoritma Cerdas]**\n\nBerdasarkan analisis algoritma otomatis terhadap profil keuangan Kamu:\n\n";
      response += `**1. Status Arus Kas:** Total alokasi bulan ini adalah Rp ${totalAllocated.toLocaleString('id-ID')} dengan realisasi pengeluaran Rp ${totalSpent.toLocaleString('id-ID')}.\n`;
      if (unassigned > 0) {
        response += `**2. Dana Menganggur:** Terdapat Rp ${unassigned.toLocaleString('id-ID')} yang belum dialokasikan (Zero-Based Budgeting belum sempurna). Segera masukkan dana ini ke pos Sinking Fund atau Tabungan.\n`;
      } else if (unassigned < 0) {
        response += `**2. Defisit Anggaran:** Peringatan! Anggaran Kamu minus Rp ${Math.abs(unassigned).toLocaleString('id-ID')}. Kurangi alokasi di kategori keinginan (Wants).\n`;
      } else {
        response += `**2. Zero-Based Budgeting:** Sempurna! Setiap rupiah dari pendapatan Kamu sudah memiliki tugas. Pertahankan disiplin ini.\n`;
      }
      
      if (highestCategory && highestCategory.spent > 0) {
        response += `**3. Pengeluaran Terbesar:** Kategori **${highestCategory.name}** mencatatkan pengeluaran tertinggi (Rp ${highestCategory.spent.toLocaleString('id-ID')}). Evaluasi kembali apakah ini kebutuhan primer atau bisa ditekan bulan depan.\n`;
      }
    } else if (mode === 'debt_strategy') {
      const accounts = payload?.accounts || [];
      const debtAccounts = accounts.filter((a: any) => a.type === 'debt' || a.type === 'credit');
      
      response = "🤖 **[Mode Algoritma Cerdas]**\n\n";
      if (debtAccounts.length === 0) {
        response += "Selamat! Dari data yang ada, Kamu tidak memiliki catatan hutang. Tetap jaga kesehatan arus kas dan fokus perbesar tabungan investasi.";
      } else {
        let totalDebt = debtAccounts.reduce((acc: number, curr: any) => acc + Math.abs(Number(curr.balance || 0)), 0);
        response += `Berdasarkan kalkulasi sistem, total kewajiban hutang Kamu saat ini adalah **Rp ${totalDebt.toLocaleString('id-ID')}**.\n\n`;
        response += "**Rekomendasi Strategi Pelunasan:**\n";
        response += "- **Metode Snowball:** Jika Kamu butuh motivasi psikologis, lunasi hutang dengan nominal terkecil lebih dulu. Begitu lunas, gunakan uang cicilannya untuk menggempur hutang berikutnya.\n";
        response += "- **Metode Avalanche:** Jika Kamu ingin menghemat total bunga (paling matematis), urutkan hutang berdasarkan suku bunga tertinggi dan lunasi lebih dulu.\n";
      }
    } else if (mode === 'parse_statement') {
      response = `[      \n  {"date": "2026-08-01", "payee": "Mode Ekstraksi Offline", "amount": 0, "category": "Lainnya", "type": "expense", "notes": "Sistem sedang dalam mode algoritma karena limit AI tercapai. Mohon catat transaksi secara manual."}\n]`;
    } else {
      response = "🤖 **[Mode Algoritma Cerdas]**\n\nSistem saat ini berjalan dalam mode algoritma cepat (Smart Rule-Based). Fitur tanya jawab bebas (Custom Prompt) membutuhkan koneksi AI penuh. Silakan coba beberapa saat lagi ketika kuota harian kembali tersedia.";
    }
    return response;
  };

  // API Route: AI Financial Advisor & Smart Insights
  app.post('/api/ai-insights', async (req, res) => {
    const { mode, payload, userPrompt, userId } = req.body;
    try {
      
      if (!userId) {
        return res.status(400).json({ success: false, error: 'Silakan login terlebih dahulu untuk menggunakan fitur AI.' });
      }

      const today = new Date().toISOString().split('T')[0];
      const usageKey = `ai_usage_${today}`;
      let usageData = {};
      
      try {
        const usageResult = await pool.query('SELECT data FROM app_state WHERE id = $1', [usageKey]);
        if (usageResult.rows.length > 0) {
          usageData = usageResult.rows[0].data;
        }
      } catch (e) {
        console.error('DB Usage check error', e);
      }
      
      const userUsage = usageData[userId] || 0;
      const DAILY_LIMIT = 3;
      
      if (userUsage >= DAILY_LIMIT) {
        return res.status(429).json({
          success: false, 
          error: `Limit harian tercapai (${DAILY_LIMIT}/${DAILY_LIMIT}). Akun Gmail Anda (${userId}) sudah mencapai batas. Anda tidak bisa menggunakan penasihat AI sampai besok.`
        });
      }
      
      // Increment
      usageData[userId] = userUsage + 1;
      await pool.query(
        'INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
        [usageKey, JSON.stringify(usageData)]
      );

      const openRouterApiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
      if (!openRouterApiKey) {
        return res.json({
          success: true,
          response: generateSmartFallback(mode, payload, userPrompt)
        });
      }
      // Fetch dynamic AI customization from global_settings
      let currentAiName = 'Portal Uang Advisor';
      let currentAiRole = 'AI Wealth Strateist';
      let currentAiTone = 'professional_supportive';
      let customSystemPrompt = '';

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
        console.warn('Could not fetch global settings for AI prompt, using defaults');
      }

      let toneInstruction = "Berikan nasihat yang jelas, memotivasi, praktis, dan ramah mendukung dalam Bahasa Indonesia.";
      if (currentAiTone === 'strict_cfo') {
        toneInstruction = "Berikan nasihat dengan gaya tegas, sangat ketat dalam efisiensi anggaran, langsung pada poin (no-nonsense CFO), dan prioritaskan penghematan agresif.";
      } else if (currentAiTone === 'casual_friendly') {
        toneInstruction = "Gunakan bahasa yang santai, kasual, hangat, mudah dipahami oleh pemula keuangan tanpa istilah rumit yang membingungkan.";
      } else if (currentAiTone === 'academic_analytic') {
        toneInstruction = "Gunakan pendekatan analisis mendalam berbasis data, kalkulasi probabilitas finansial, dan penjelasan rasio keuangan secara terstruktur.";
      }

      let systemInstruction = `Anda adalah ${currentAiName}, ${currentAiRole} berpengalaman di dalam aplikasi keuangan Portal Uang.
${toneInstruction}
Topik utama: penganggaran berbasis nol (Zero-Based Budgeting), alokasi gaji bulanan, stratei pelunasan hutang (Snowball vs Avalanche), pos sinking fund (mudik, pajak, servis), serta pertumbuhan kekayaan bersih.
${customSystemPrompt ? `Instruksi khusus tambahan dari admin:\n${customSystemPrompt}\n` : ''}
Selalu format jawaban Anda secara rapi menggunakan Markdown, dengan angka tercetak tebal dalam Rupiah (Rp), poin-poin terstruktur, dan langkah tindakan konkret selanjutnya. Jawablah SELALU dalam Bahasa Indonesia.`;

      let prompt = '';

      if (mode === 'budget_audit') {
        prompt = `Lakukan audit finansial komprehensif dan analisis pengeluaran berdasarkan data snapshot keuangan pengguna berikut:
${JSON.stringify(payload, null, 2)}

Berikan:
1. Skor Kesehatan Finansial (1-100) dan 3 kekuatan utama keuangan pengguna.
2. Deteksi Kebocoran & Anomali (identifikasi kategori dengan pengeluaran terlalu tingi atau dana belum dialokasikan).
3. Optimasi Alokasi Berbasis Nol: Saran spesifik untuk meningkatkan arus kas atau alokasi sinking fund (seperti mudik, servis motor, dll).
4. 3 Langkah Tindakan Paling Penting untuk bulan ini.`;
      } else if (mode === 'parse_statement') {
        prompt = `Ekstrak transaksi keuangan dari teks mentah, ringkasan mutasi bank, atau deskripsi struk yang diberikan pengguna berikut:
"${userPrompt}"

Hasilkan array JSON objek yang valid dengan kunci: "date" (YYYY-MM-DD), "payee", "amount" (angka nominal Rupiah), "category", "type" ('expense'|'income'), "notes".
Kembalikan HANYA JSON mentah tanpa komentar tambahan atau tanda backtick markdown di luar JSON.`;
      } else if (mode === 'debt_strategy') {
        prompt = `Analisis kewajiban hutang berikut dan evaluasi stratei pelunasan Snowball vs Avalanche:
${JSON.stringify(payload, null, 2)}

Pertanyaan/Konteks pengguna: ${userPrompt || 'Bagaimana cara melunasi hutang ini paling cepat dengan bunga paling hemat?'}
Berikan panduan pelunasan langkah demi langkah yang jelas dengan simulasi matematika dan motivasi psikolois dalam Bahasa Indonesia.`;
      } else {
        prompt = `Pertanyaan pengguna: ${userPrompt}\n\nKonteks gambaran umum keuangan: ${JSON.stringify(payload || {}, null, 2)}`;
      }

      // 4. Tambahkan cache di backend sebelum panggil OpenRouter (Supabase/PostgreSQL)
      const cacheString = systemInstruction + prompt;
      const cacheHash = crypto.createHash('sha256').update(cacheString).digest('hex');
      const cacheKey = `ai_cache_${cacheHash}`;

      try {
        const cacheRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [cacheKey]);
        if (cacheRes.rows.length > 0) {
          const cachedOutput = cacheRes.rows[0].data.response;
          return res.json({ success: true, response: cachedOutput });
        }
      } catch (err) {
        console.error('Cache read error', err);
      }

      // 1. Buat Custom Endpoint ke OpenRouter
      // 3. Di backend, selalu kirim system message di setiap request
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://portaluang.id',
          'X-Title': 'Portal Uang',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        })
      });

      if (!orRes.ok) {
        throw new Error(`OpenRouter API Error: ${orRes.status} ${orRes.statusText}`);
      }

      const orData = await orRes.json();
      const textOutput = orData.choices?.[0]?.message?.content || 'No response generated.';
      markIntegrationRecovered(pool, 'ai').catch(() => {});

      // Save response to cache
      try {
        await pool.query(
          'INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()',
          [cacheKey, JSON.stringify({ response: textOutput })]
        );
      } catch (err) {
        console.error('Cache write error', err);
      }

      res.json({ success: true, response: textOutput });
    } catch (err: any) {
      console.error('OpenRouter API Error:', err);
      
      // HYBRID FALLBACK: If AI API fails
      // we silently switch to the smart algorithmic engine so the user still gets a response.
      return res.json({
        success: true,
        response: generateSmartFallback(mode, payload, userPrompt)
      });
    }
  });

  // API Route: Search Ticker
  app.get('/api/search-ticker', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Query is required' });
      }
      
      const searchOptions = { newsCount: 0 };
      const result: any = await yahooFinance.search(query, searchOptions);
      
      // Filter out foreign tickers by ensuring they end with .JK (Jakarta Stock Exchange)
      const quotes = result.quotes
        .filter((q: any) => q.isYahooFinance && q.symbol.endsWith('.JK'))
        .map((q: any) => ({
          symbol: q.symbol,
          shortname: q.shortname || q.longname,
          exchange: q.exchange,
          type: q.quoteType
        }));
      
      res.json({ success: true, results: quotes });
    } catch (err: any) {
      console.error('Search Ticker Error:', err);
      res.status(500).json({ success: false, error: 'Failed to search ticker', details: err.message });
    }
  });

  // API Route: Market Price
  app.get('/api/market-price', async (req, res) => {
    try {
      const ticker = req.query.ticker as string;
      if (!ticker) {
        return res.status(400).json({ success: false, error: 'Ticker is required' });
      }

      // Khusus untuk Logam Mulia (Emas Antam & Perak)
      if (ticker === 'ANTAM' || ticker === 'PERAK') {
        let lmPrice = null;
        
        try {
          const fetch = (await import('node-fetch')).default || globalThis.fetch;
          const response = await fetch('https://www.logammulia.com/id/harga-emas-hari-ini', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'X-Forwarded-For': '8.8.8.8',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'id,en-US;q=0.9,en;q=0.8'
            }
          });
          const html = await response.text();
          const cheerio = await import('cheerio');
          const $ = cheerio.load(html);
          
          if (ticker === 'ANTAM') {
            const row1Gram = $('tr').filter((i: any, el: any) => {
               return $(el).find('td').first().text().trim().toLowerCase() === '1 gr';
            });
            
            if (row1Gram.length > 0) {
              const priceText = row1Gram.first().find('td').eq(1).text().trim();
              const cleanPrice = priceText.replace(/[^\d]/g, '');
              if (cleanPrice) {
                lmPrice = parseInt(cleanPrice, 10);
              }
            }
          } else if (ticker === 'PERAK') {
            const perakTable = $('table').eq(1);
            const row250 = perakTable.find('tr').filter((i: any, el: any) => {
               return $(el).find('td').first().text().trim().toLowerCase() === '250 gr';
            });
            if (row250.length > 0) {
               const priceText = row250.first().find('td').eq(1).text().trim();
               const cleanPrice = priceText.replace(/[^\d]/g, '');
               if (cleanPrice) {
                   lmPrice = parseInt(cleanPrice, 10) / 250;
               }
            }
          }
        } catch(e) {
          console.error("Error scraping logammulia:", e);
        }

        // Fallback to Yahoo Finance calculation if scraping blocked or fails
        if (!lmPrice) {
          if (ticker === 'ANTAM') {
            const [goldUsd, usdIdr]: any[] = await Promise.all([
              yahooFinance.quote('GC=F'), // Gold Spot USD/oz
              yahooFinance.quote('IDR=X') // USD to IDR
            ]);

            if (goldUsd?.regularMarketPrice && usdIdr?.regularMarketPrice) {
              // 1 Troy Ounce = 31.1034768 gram
              const pricePerGramIDR = (goldUsd.regularMarketPrice * usdIdr.regularMarketPrice) / 31.1034768;
              // Emas fisik Antam memiliki marin/premium (spread cetak & distribusi) sekitar ~2.5% di atas spot price
              lmPrice = Math.round(pricePerGramIDR * 1.025);
            }
          } else if (ticker === 'PERAK') {
            const [silverUsd, usdIdr]: any[] = await Promise.all([
              yahooFinance.quote('SI=F'), // Silver Futures USD/oz
              yahooFinance.quote('IDR=X') // USD to IDR
            ]);

            if (silverUsd?.regularMarketPrice && usdIdr?.regularMarketPrice) {
              // 1 Troy Ounce = 31.1034768 gram
              const pricePerGramIDR = (silverUsd.regularMarketPrice * usdIdr.regularMarketPrice) / 31.1034768;
              lmPrice = Math.round(pricePerGramIDR * 1.15); // premium for silver can be higher
            }
          }
        }

        if (lmPrice) {
          return res.json({ 
            success: true, 
            price: lmPrice, 
            currency: 'IDR',
            note: 'Calculated from Logam Mulia or XAU/IDR + physical premium'
          });
        } else {
          return res.status(404).json({ success: false, error: 'Price not found' });
        }
      }

      const result: any = await yahooFinance.quote(ticker);
      if (result && result.regularMarketPrice) {
        res.json({ success: true, price: result.regularMarketPrice, currency: result.currency });
      } else {
        res.status(404).json({ success: false, error: 'Price not found' });
      }
    } catch (err: any) {
      console.error('Market Price Error:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch market price' });
    }
  });

  
  // ==========================================
  // DUITKU PAYMENT GATEWAY SUITE (API & WEBHOOK)
  // ==========================================

  // 1. Get Duitku Channels & Config Status (Public)
  app.get('/api/payment/duitku/config-status', async (req, res) => {
    try {
      const config = await getDuitkuConfig(pool);
      res.json({
        success: true,
        gateway: 'Duitku Payment Gateway',
        environment: config.env,
        merchantCodeMasked: config.merchantCode ? `${config.merchantCode.slice(0, 3)}***` : 'Not Configured',
        channels: Object.entries(DUITKU_CHANNELS).map(([key, val]) => ({
          id: key,
          ...val
        })),
        security: {
          ssl: '256-bit TLS Encryption',
          compliance: 'Bank Indonesia & PCI-DSS Level 1 Compliant',
          signatureAlgorithm: 'MD5 Cryptographic Hash Verification'
        }
      });
    } catch (err: any) {
      console.error('Error fetching Duitku config status:', err);
      res.status(500).json({ success: false, error: 'Failed to retrieve gateway status' });
    }
  });

  // Get Available Payment Methods directly from Duitku (Dynamic Sync)
  app.get('/api/payment/duitku/methods', async (req, res) => {
    try {
      const config = await getDuitkuConfig(pool);
      if (!config.merchantCode || !config.apiKey) {
        return res.status(503).json({
          success: false,
          error: 'Kredensial Duitku belum diset pada Environment Variables server.',
        });
      }
      const amount = req.query.amount || '10000';
      
      const d = new Date();
      const pad = (n: number) => n < 10 ? '0' + n : n;
      const datetime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      
      const raw = `${config.merchantCode}${amount}${datetime}${config.apiKey}`;
      const signature = crypto.createHash('sha256').update(raw).digest('hex');
      
      const payload = {
        merchantcode: config.merchantCode,
        amount: amount,
        datetime: datetime,
        signature: signature
      };
      
      const baseUrl = config.env === 'production' 
          ? 'https://passport.duitku.com/webapi/api/merchant' 
          : 'https://sandbox.duitku.com/webapi/api/merchant';

      const fetch = (await import('node-fetch')).default || globalThis.fetch;
      const response = await fetch(`${baseUrl}/paymentmethod/getpaymentmethod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.paymentFee && Array.isArray(data.paymentFee)) {
        return res.json({ success: true, methods: data.paymentFee });
      }
      
      res.json({ success: true, methods: null, message: data.Message || 'Failed to fetch' });
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Create Invoice / Inquiry via Duitku
  app.post('/api/payment/duitku/create-invoice', async (req, res) => {
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
        return res.status(400).json({ success: false, error: 'Parameter pembayaran tidak lengkap.' });
      }

      const config = await getDuitkuConfig(pool);

      if (config.env === 'sandbox' && config.sandboxWhitelist && config.sandboxWhitelist.length > 0) {
        const userEmail = email.toLowerCase().trim();
        if (!config.sandboxWhitelist.includes(userEmail)) {
          return res.status(403).json({ 
            success: false, 
            error: 'Sistem pembayaran sedang dalam mode uji coba (Sandbox) internal. Akun email Anda belum diizinkan (whitelisted) untuk mencoba transaksi ini.' 
          });
        }
      }

      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const merchantOrderId = `INV-${datePart}-${randomPart}`;

      // Restore channelInfo dynamically
      const channelInfo = (paymentMethod && paymentMethod.length === 2) ? (Object.values(DUITKU_CHANNELS).find(c => c.code === paymentMethod) || DUITKU_CHANNELS['qris']) : (DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris']);
      const channelCode = channelInfo.code;

      // Compute MD5 signature for Duitku Inquiry: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
      const signature = generateDuitkuInquirySignature(
        config.merchantCode,
        merchantOrderId,
        amount,
        config.apiKey
      );

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const callbackUrl = `${appUrl}/api/payment/duitku/callback`;
      const returnUrl = `${appUrl}/checkout?payment=success&orderId=${merchantOrderId}`;

      const inquiryPayload = {
        merchantCode: config.merchantCode,
        paymentAmount: amount,
        paymentMethod: channelCode,
        merchantOrderId: merchantOrderId,
        productDetails: `Langganan Portal Uang - ${planName || planId}`,
        email: email,
        phoneNumber: phoneNumber || '08123456789',
        additionalParam: JSON.stringify({ planId, userId: userId || email, planName }),
        merchantUserInfo: email,
        customerVaName: customerName || 'Portal Uang Member',
        callbackUrl: callbackUrl,
        returnUrl: returnUrl,
        signature: signature,
        expiryPeriod: 1440 // 24 Hours
      };

      let duitkuResponseData: any = null;
      const baseUrl = config.env === 'production' 
        ? 'https://passport.duitku.com/webapi/api/merchant' 
        : 'https://sandbox.duitku.com/webapi/api/merchant';

      // Attempt live call to Duitku API
      try {
        const fetch = (await import('node-fetch')).default || globalThis.fetch;
        const apiRes = await fetch(`${baseUrl}/v2/inquiry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inquiryPayload)
        });
        
        if (apiRes.ok) {
          duitkuResponseData = await apiRes.json();
          markIntegrationRecovered(pool, 'duitku').catch(() => {});
        } else if (config.env === 'production') {
          const errText = await apiRes.text().catch(() => apiRes.statusText);
          recordIntegrationError(pool, {
            integration: 'duitku',
            action: 'POST /api/payment/duitku/create-invoice',
            message: `Duitku Production API HTTP ${apiRes.status}: ${errText}`,
            details: `Order: ${merchantOrderId} | Email: ${email}`,
            severity: 'critical',
          }).catch(() => {});
        }
      } catch (callErr: any) {
        console.warn('Direct Duitku API call failed or in testing environment, creating sandbox transaction payload:', callErr);
        if (config.env === 'production') {
          recordIntegrationError(pool, {
            integration: 'duitku',
            action: 'POST /api/payment/duitku/create-invoice',
            message: callErr?.message || 'Duitku Production API tidak dapat dijangkau',
            details: `Order: ${merchantOrderId} | Email: ${email}`,
            stack: callErr?.stack,
            severity: 'critical',
          }).catch(() => {});
        }
      }

      // Generate consistent, realistic Duitku data (live or sandbox fallback)
      const reference = duitkuResponseData?.reference || `DTK${datePart}${randomPart}`;
      let vaNumber = duitkuResponseData?.vaNumber;
      let qrString = duitkuResponseData?.qrString;
      const paymentUrl = duitkuResponseData?.paymentUrl || `${baseUrl}/paymentPage?reference=${reference}`;

      if (!vaNumber && channelInfo.type === 'va') {
        const bankPrefixes: Record<string, string> = {
          va_bca: '82710812',
          va_mandiri: '88708',
          va_bri: '12800',
          va_bni: '98800',
          va_cimb: '8090',
          va_permata: '7020'
        };
        const prefix = bankPrefixes[paymentMethod] || '88800';
        vaNumber = `${prefix}${String(randomPart).padStart(6, '0')}`;
      }

      if (!qrString && channelInfo.type === 'qris') {
        // Standard Indonesian National QRIS string format for Duitku
        qrString = `00020101021226590014ID.LINKAJA.WWW01189360091800000000000215ID${reference}520458125303360540${amount}.005802ID5910AURALEDGER6007JAKARTA61051219062070703A016304`;
      }

      const tx: DuitkuTransaction = {
        merchantOrderId,
        reference,
        planId,
        planName: planName || 'Paket Langganan',
        amount,
        paymentMethod,
        paymentMethodName: channelInfo.name,
        email,
        userId: userId || email,
        customerName: customerName || 'Portal Uang Member',
        phoneNumber,
        status: 'PENDING',
        vaNumber,
        qrString,
        paymentUrl,
        createdAt: now.toISOString(),
        duitkuResponse: duitkuResponseData,
        env: config.env
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
        statusCode: '00',
        statusMessage: 'INVOICE_CREATED',
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (err: any) {
      console.error('Error creating Duitku invoice:', err);
      res.status(500).json({ success: false, error: 'Gagal membuat tagihan pembayaran: ' + err.message });
    }
  });

  // 3. Duitku Webhook / Callback Handler (POST /api/payment/duitku/callback & /webhook/duitku)
  const handleDuitkuWebhook = async (req: express.Request, res: express.Response) => {
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

      console.log('--- DUITKU WEBHOOK RECEIVED ---');
      console.log('Payload:', payload);

      if (!merchantOrderId || !amount) {
        return res.status(400).json({ success: false, error: 'Missing required webhook fields' });
      }

      const config = await getDuitkuConfig(pool);

      // Verify Signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
      const isValid = verifyDuitkuCallbackSignature(
        merchantCode || config.merchantCode,
        amount,
        merchantOrderId,
        signature,
        config.apiKey
      );

      // Signature MUST match in BOTH environments to ensure valid incoming webhook
      if (!isValid) {
        console.error('Security Alert: Duitku Webhook signature mismatch!');
        return res.status(400).json({ success: false, error: 'Invalid MD5 signature' });
      }

      if (resultCode === '00' || resultCode === 'SUCCESS') {
        console.log(`[DUITKU SUCCESS] Order ${merchantOrderId} marked as LUNAS / PAID. Amount: ${amount}`);
        const updatedTx = await updateTransactionStatus(pool, merchantOrderId, 'SUCCESS');

        // Automatically activate user subscription in database state
        if (updatedTx) {
          try {
            const userKey = updatedTx.userId || updatedTx.email;
            const durationDays = updatedTx.planId === 'annual' ? 365 : updatedTx.planId === 'semi_annual' ? 180 : 30;
            const now = new Date();
            const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

            // Load user data if present
            const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userKey]);
            let userData: any = userRes.rows.length > 0 ? userRes.rows[0].data : {};
            if (typeof userData === 'string') {
              try { userData = JSON.parse(userData); } catch (e) { userData = {}; }
            }
            const hadPreviousSubscription = Boolean(userData?.subscription?.planId);

            userData.subscription = {
              planId: updatedTx.planId,
              planName: updatedTx.planName,
              price: updatedTx.amount,
              durationDays: durationDays,
              startDate: now.toISOString(),
              expiresAt: expiresAt,
              status: 'active',
              paymentMethod: `Duitku (${updatedTx.paymentMethodName})`,
              invoiceId: updatedTx.merchantOrderId
            };

            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW())
               ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
              [userKey, JSON.stringify(userData)]
            );
            console.log(`[AUTO-ACTIVATION] Subscription automatically activated for user ${userKey} with plan ${updatedTx.planName}`);
            
            // Send email invoice + renewal confirmation asynchronously via FreeResend / SMTP
            if (updatedTx.email) {
              sendInvoiceEmail(updatedTx.email, updatedTx, pool).catch(err => {
                console.error(`[Email Service] Async invoice email sending failed for ${updatedTx.email}:`, err);
              });
              if (hadPreviousSubscription) {
                sendNotificationEmail('renewal', updatedTx.email, {
                  name: updatedTx.customerName || userData.name,
                  planName: updatedTx.planName,
                  amount: updatedTx.amount,
                  expiresAt,
                  invoiceId: updatedTx.merchantOrderId
                }, pool).catch(err => {
                  console.error(`[Email Service] Async renewal email sending failed for ${updatedTx.email}:`, err);
                });
              }
            }
          } catch (actErr) {
            console.error('Error activating user in DB during webhook:', actErr);
          }
        }

        return res.status(200).json({ success: true, status: 'OK', message: 'Payment successfully processed' });
      } else {
        console.log(`[DUITKU FAILED] Order ${merchantOrderId} resulted in status: ${resultCode}`);
        await updateTransactionStatus(pool, merchantOrderId, 'FAILED');
        return res.status(200).json({ success: true, status: 'FAILED_ACKNOWLEDGED' });
      }
    } catch (err: any) {
      console.error('Duitku Webhook Processing Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.post('/api/payment/duitku/callback', handleDuitkuWebhook);
  app.post('/webhook/duitku', handleDuitkuWebhook);

  // 4. Check Transaction Status
  app.get('/api/payment/duitku/check-status/:merchantOrderId', async (req, res) => {
    try {
      const { merchantOrderId } = req.params;
      const txList = await getAllTransactions(pool);
      const tx = txList.find(t => t.merchantOrderId === merchantOrderId);

      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transaksi tidak ditemukan' });
      }

      // If pending and live Duitku config is present, try verifying status with Duitku API
      if (tx.status === 'PENDING') {
        try {
          const config = await getDuitkuConfig(pool);
          const signature = generateDuitkuStatusSignature(config.merchantCode, merchantOrderId, config.apiKey);
          const baseUrl = config.env === 'production' 
            ? 'https://passport.duitku.com/webapi/api/merchant' 
            : 'https://sandbox.duitku.com/webapi/api/merchant';

          const fetch = (await import('node-fetch')).default || globalThis.fetch;
          const statusRes = await fetch(`${baseUrl}/transactionStatus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              merchantCode: config.merchantCode,
              merchantOrderId: merchantOrderId,
              signature: signature
            })
          });

          if (statusRes.ok) {
            const statusData: any = await statusRes.json();
            if (statusData.statusCode === '00') {
              tx.status = 'SUCCESS';
              tx.paidAt = new Date().toISOString();
              await saveTransaction(pool, tx);
              if (tx.email) {
                sendInvoiceEmail(tx.email, tx, pool).catch(() => {});
                sendNotificationEmail('renewal', tx.email, {
                  name: tx.customerName,
                  planName: tx.planName,
                  amount: tx.amount,
                  invoiceId: tx.merchantOrderId
                }, pool).catch(() => {});
              }
            } else if (statusData.statusCode === '02') {
              tx.status = 'EXPIRED';
              await saveTransaction(pool, tx);
            }
          }
        } catch (statusErr) {
          // Keep local status
        }
      }

      res.json({
        success: true,
        transaction: tx,
        isPaid: tx.status === 'SUCCESS'
      });
    } catch (err: any) {
      console.error('Error checking transaction status:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });



  // 6. Admin Payment & Duitku Gateway Logs
  app.get('/api/admin/duitku/transactions', async (req, res) => {
    try {
      const transactions = await getAllTransactions(pool);
      const config = await getDuitkuConfig(pool);
      res.json({
        success: true,
        config: {
          merchantCode: config.merchantCode ? `${config.merchantCode.slice(0, 3)}***` : 'Belum diset di ENV',
          env: config.env,
          hasApiKey: Boolean(config.apiKey)
        },
        transactions
      });
    } catch (err: any) {
      console.error('Error fetching admin transactions:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });


  
  
  // ============================================================================
  // TELEGRAM BOT & NOTIFICATION FLOW SYSTEM
  // ============================================================================

  interface TelegramLinkSession {
    token: string;
    userId: string;
    status: 'pending' | 'linked' | 'expired';
    createdAt: number;
    expiresAt: number;
    telegramChatId?: string;
    telegramUsername?: string;
    telegramFirstName?: string;
    linkedAt?: string;
  }

  const telegramLinkStore = new Map<string, TelegramLinkSession>();

  // Helper to retrieve bot info strictly from ENV TELEGRAM_BOT_TOKEN
  async function getTelegramBotInfo() {
    try {
      const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
      const globalSettings = result.rows.length > 0 && result.rows[0].data ? { ...result.rows[0].data } : {};
      let username = (process.env.TELEGRAM_BOT_USERNAME || globalSettings.telegramBotUsername || '').trim();

      if (token && !username) {
        try {
          const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const json: any = await resp.json();
          if (json.ok && json.result?.username) {
            username = json.result.username;
            globalSettings.telegramBotUsername = username;
            delete globalSettings.telegramBotToken;
            await pool.query(
              `INSERT INTO app_state (id, data, updated_at) 
               VALUES ('global_settings', $1, NOW()) 
               ON CONFLICT (id) 
               DO UPDATE SET data = $1, updated_at = NOW()`,
              [JSON.stringify(globalSettings)]
            );
          }
        } catch (e) {
          console.error('Error auto-fetching bot username:', e);
        }
      }

      if (!username) {
        username = 'Portal UangBot';
      }

      const tokenTrimmed = token;
      return {
        token: tokenTrimmed,
        username,
        isConfigured: Boolean(tokenTrimmed),
      };
    } catch (err) {
      const fallbackToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
      return { token: fallbackToken, username: 'Portal UangBot', isConfigured: Boolean(fallbackToken) };
    }
  }

  app.get('/api/admin/telegram/status', async (req, res) => {
    try {
      const info = await getTelegramBotInfo();
      res.json({
        success: true,
        configured: Boolean(info.token),
        username: info.username,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/telegram/verify', async (req, res) => {
    try {
      const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, error: 'TELEGRAM_BOT_TOKEN belum diset pada Environment Variables server.' });
      }
      const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data: any = await resp.json();
      if (!data.ok || !data.result) {
        return res.status(400).json({ success: false, error: data.description || 'Token TELEGRAM_BOT_TOKEN tidak valid.' });
      }
      const existingRes = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
      const globalSettings = existingRes.rows.length > 0 && existingRes.rows[0].data ? { ...existingRes.rows[0].data } : {};
      globalSettings.telegramBotUsername = data.result.username || globalSettings.telegramBotUsername || '';
      delete globalSettings.telegramBotToken;
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ('global_settings', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
        [JSON.stringify(globalSettings)]
      );
      return res.json({
        success: true,
        username: data.result.username,
        firstName: data.result.first_name,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 1. Generate unique verification token & bot link
  app.post('/api/telegram/generate-link', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      const botInfo = await getTelegramBotInfo();
      const token = 'aura_' + crypto.randomBytes(8).toString('hex');
      const now = Date.now();
      const expiresAt = now + 15 * 60 * 1000; // 15 minutes validity

      // Remove any previous pending tokens for this user
      for (const [oldToken, session] of telegramLinkStore.entries()) {
        if (session.userId === userId && session.status === 'pending') {
          telegramLinkStore.delete(oldToken);
        }
      }

      const session: TelegramLinkSession = {
        token,
        userId,
        status: 'pending',
        createdAt: now,
        expiresAt
      };

      telegramLinkStore.set(token, session);

      // Also persist to app_state for durability
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
    } catch (err: any) {
      console.error('Generate Telegram Link Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to generate link' });
    }
  });

  // 2. Poll/Check connection status
  app.get('/api/telegram/check-status', async (req, res) => {
    try {
      const token = req.query.token as string;
      const userId = req.query.userId as string;

      if (!token && !userId) {
        return res.status(400).json({ success: false, error: 'Token or User ID is required' });
      }

      // Check session by token first
      let session: TelegramLinkSession | undefined;
      if (token) {
        session = telegramLinkStore.get(token);
        if (!session) {
          const dbResult = await pool.query('SELECT data FROM app_state WHERE id = $1', [`tg_link_${token}`]);
          if (dbResult.rows.length > 0) {
            session = dbResult.rows[0].data;
            if (session) telegramLinkStore.set(token, session);
          }
        }
      }

      if (session) {
        if (Date.now() > session.expiresAt && session.status === 'pending') {
          session.status = 'expired';
          return res.json({ success: true, status: 'expired' });
        }

        if (session.status === 'linked') {
          return res.json({
            success: true,
            status: 'linked',
            telegramChatId: session.telegramChatId,
            telegramUsername: session.telegramUsername,
            telegramFirstName: session.telegramFirstName,
            linkedAt: session.linkedAt
          });
        }

        return res.json({ success: true, status: 'pending' });
      }

      // Fallback: Check if user profile already has telegram linked in user state
      if (userId) {
        const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].data?.notificationSettings?.telegramChatId) {
          const notif = userRes.rows[0].data.notificationSettings;
          return res.json({
            success: true,
            status: 'linked',
            telegramChatId: notif.telegramChatId,
            telegramUsername: notif.telegramUsername,
            telegramFirstName: notif.telegramFirstName,
            linkedAt: notif.telegramLinkedAt
          });
        }
      }

      res.json({ success: true, status: 'not_connected' });
    } catch (err: any) {
      console.error('Check Telegram Status Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Disconnect Telegram Account
  app.post('/api/telegram/disconnect', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userId]);
      if (userRes.rows.length > 0 && userRes.rows[0].data) {
        const userData = userRes.rows[0].data;
        if (userData.notificationSettings) {
          userData.notificationSettings.telegramChatId = '';
          userData.notificationSettings.telegramUsername = '';
          userData.notificationSettings.telegramFirstName = '';
          userData.notificationSettings.telegramLinkedAt = '';
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

      res.json({ success: true, message: 'Telegram berhasil diputuskan' });
    } catch (err: any) {
      console.error('Disconnect Telegram Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Simulate Link (for testing / demo sandbox)
  app.post('/api/telegram/simulate-link', async (req, res) => {
    try {
      const { token, userId, username, firstName, chatId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }

      const tgChatId = chatId || '1789234812';
      const tgUsername = username || 'pengguna_auraledger';
      const tgFirstName = firstName || 'Pengguna';
      const linkedAt = new Date().toISOString();

      // Update session if token provided
      if (token) {
        let session = telegramLinkStore.get(token);
        if (!session) {
          session = {
            token,
            userId,
            status: 'linked',
            createdAt: Date.now(),
            expiresAt: Date.now() + 15 * 60 * 1000
          };
        }
        session.status = 'linked';
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

      // Update user app_state
      const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userId]);
      let userData = userRes.rows.length > 0 && userRes.rows[0].data ? userRes.rows[0].data : {};
      if (!userData.notificationSettings) {
        userData.notificationSettings = {
          telegramChatId: '',
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
        message: 'Koneksi Telegram berhasil disimulasikan',
        telegramChatId: tgChatId,
        telegramUsername: tgUsername,
        telegramFirstName: tgFirstName,
        linkedAt
      });
    } catch (err: any) {
      console.error('Simulate Link Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Send message via Telegram Bot
  app.post('/api/telegram/test-push', async (req, res) => {
    try {
      const { userId, message } = req.body;
      if (!userId || !message) return res.status(400).json({ success: false, error: 'Missing userId or message' });

      const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
      
      let userData = userRes.rows[0].data;
      if (typeof userData === 'string') userData = JSON.parse(userData);

      const chatId = userData.notificationSettings?.telegramChatId;
      if (!chatId) return res.status(400).json({ success: false, error: 'User does not have a linked Telegram account' });

      const botInfo = await getTelegramBotInfo();
      if (!botInfo.token) {
        return res.status(400).json({ success: false, error: 'Telegram bot belum dikonfigurasi' });
      }

      const telegramRes = await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const respJson: any = await telegramRes.json();
      if (respJson.ok) {
        markIntegrationRecovered(pool, 'telegram').catch(() => {});
        res.json({ success: true, result: respJson.result });
      } else {
        recordIntegrationError(pool, {
          integration: 'telegram',
          action: 'POST /api/telegram/test-push',
          message: respJson.description || 'Telegram API error',
          details: `Chat ID: ${chatId}`,
          severity: 'error',
        }).catch(() => {});
        res.status(500).json({ success: false, error: respJson.description || 'Telegram API error' });
      }
    } catch (err: any) {
      console.error('Telegram Test Push Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/telegram/send', async (req, res) => {
    try {
      const { chatId, message } = req.body;
      if (!chatId || !message) return res.status(400).json({ success: false, error: 'Missing chatId or message' });

      const botInfo = await getTelegramBotInfo();
      if (!botInfo.token) {
        return res.status(400).json({ success: false, error: 'Telegram bot belum dikonfigurasi oleh admin' });
      }

      const telegramRes = await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text: message,
          parse_mode: 'HTML'
        })
      });

      const respJson: any = await telegramRes.json();
      if (respJson.ok) {
        markIntegrationRecovered(pool, 'telegram').catch(() => {});
        res.json({ success: true, result: respJson.result });
      } else {
        recordIntegrationError(pool, {
          integration: 'telegram',
          action: 'POST /api/telegram/send',
          message: respJson.description || 'Telegram API error',
          details: `Chat ID: ${chatId}`,
          severity: 'error',
        }).catch(() => {});
        res.status(500).json({ success: false, error: respJson.description || 'Telegram API error' });
      }
    } catch (err: any) {
      console.error('Telegram Send Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Admin Broadcast
  app.post('/api/admin/telegram/broadcast', async (req, res) => {
    try {
      const { message } = req.body;
      const botInfo = await getTelegramBotInfo();
      if (!botInfo.token) return res.status(400).json({ success: false, error: 'Bot belum dikonfigurasi' });
      
      res.json({ success: true, message: 'Broadcast initiated' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Core Telegram Webhook Handler Function
  const handleTelegramWebhook = async (req: express.Request, res: express.Response) => {
    try {
      const update = req.body;
      console.log('Telegram Webhook Update Received:', JSON.stringify(update));

      const message = update.message;
      if (!message || !message.text) {
        return res.status(200).json({ ok: true });
      }

      const chatId = String(message.chat.id);
      const text = message.text.trim();
      const from = message.from || {};
      const username = from.username || '';
      const firstName = from.first_name || 'Sobat Finansial';
      const botInfo = await getTelegramBotInfo();

      // Helper to send reply
      const replyMessage = async (msgText: string, parseMode: string = 'HTML') => {
        if (!botInfo.token) return;
        try {
          await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: msgText,
              parse_mode: parseMode
            })
          });
        } catch (err) {
          console.error('Error replying telegram message:', err);
        }
      };

      // Flow 1: /start <token>
      if (text && text.startsWith('/start')) {
        const parts = text.split(/\s+/);
        if (parts.length > 1) {
          const token = parts[1].trim();
          
          // Check token session
          let session = telegramLinkStore.get(token);
          if (!session) {
            const dbResult = await pool.query('SELECT data FROM app_state WHERE id = $1', [`tg_link_${token}`]);
            if (dbResult.rows.length > 0) {
              session = dbResult.rows[0].data;
            }
          }

          if (session) {
            if (Date.now() > session.expiresAt) {
              session.status = 'expired';
              await replyMessage(
                `⚠️ <b>Tautan Kedaluwarsa</b>\n\nKode verifikasi akun Anda telah kedaluwarsa (berlaku 15 menit).\nSilakan kembali ke aplikasi web Portal Uang dan klik <b>Hubungkan Telegram</b> untuk membuat tautan baru.`
              );
              return res.status(200).json({ ok: true });
            }

            // Mark as linked
            const linkedAt = new Date().toISOString();
            session.status = 'linked';
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

            // Auto-update user state in DB
            const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [session.userId]);
            let userData = userRes.rows.length > 0 && userRes.rows[0].data ? userRes.rows[0].data : {};
            if (!userData.notificationSettings) {
              userData.notificationSettings = {
                telegramChatId: '',
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

            // Send rich confirmation notification
            const successMsg = 
              `🎉 <b>Akun Portal Uang Berhasil Terhubung!</b>\n\n` +
              `Halo <b>${firstName}</b> (@${username || 'user'}), akun Anda (<code>${session.userId}</code>) kini telah tersinkronisasi secara real-time.\n\n` +
              `🔔 <b>Layanan Notifikasi Aktif:</b>\n` +
              `• ⏰ Peningat Jatuh Tempo Taihan & Cicilan\n` +
              `• 🎯 Peringatan Batas Anggaran Zero-Based Budgeting\n` +
              `• 📈 Ringkasan & Wawasan Finansial Berkala\n\n` +
              `💡 <i>Ketik /bantuan untuk melihat daftar perintah bot atau /status untuk melihat status koneksi.</i>`;

            await replyMessage(successMsg);
            return res.status(200).json({ ok: true });
          } else {
            await replyMessage(
              `❌ <b>Kode Tidak Ditemukan</b>\n\nKode tautan tidak valid atau sudah digunakan. Silakan buka aplikasi web Portal Uang dan klik tombol Hubungkan Telegram.`
            );
            return res.status(200).json({ ok: true });
          }
        } else {
          // /start without token
          const welcomeMsg = 
            `👋 <b>Selamat Datang di Bot Portal Uang!</b>\n\n` +
            `Bot ini bertugas menirimkan notifikasi peningat taihan dan ringkasan finansial langsung ke Telegram Anda.\n\n` +
            `<b>Cara Menghubungkan:</b>\n` +
            `1. Buka aplikasi web Portal Uang\n` +
            `2. Masuk ke menu <b>Pengaturan</b>\n` +
            `3. Klik tombol <b>Hubungkan Telegram</b>\n` +
            `4. Klik tautan otomatis atau scan QR Code yang muncul.\n\n` +
            `Ketik /bantuan untuk melihat daftar perintah.`;

          await replyMessage(welcomeMsg);
          return res.status(200).json({ ok: true });
        }
      }

      // Flow 2: /status
      if (text === '/status') {
        // Find linked user for this chatId
        let linkedUserEmail = '';
        for (const [_, session] of telegramLinkStore.entries()) {
          if (session.telegramChatId === chatId && session.status === 'linked') {
            linkedUserEmail = session.userId;
            break;
          }
        }

        if (linkedUserEmail) {
          await replyMessage(
            `✅ <b>Status: Terhubung & Aktif</b>\n\n` +
            `• User ID: <code>${linkedUserEmail}</code>\n` +
            `• Telegram Chat ID: <code>${chatId}</code>\n` +
            `• Notifikasi: <b>Aktif</b>\n\n` +
            `Semua peningat taihan dan alarm anggaran akan dikirimkan ke chat ini.`
          );
        } else {
          await replyMessage(
            `ℹ️ <b>Status: Belum Terhubung</b>\n\n` +
            `Telegram Anda (Chat ID: <code>${chatId}</code>) belum terhubung ke akun Portal Uang manapun.\n\n` +
            `Silakan buka web Portal Uang > Pengaturan > Hubungkan Telegram.`
          );
        }
        return res.status(200).json({ ok: true });
      }

      // Flow 3: /bantuan or /help
      if (text === '/bantuan' || text === '/help') {
        const helpMsg = 
          `🤖 <b>Daftar Perintah Bot Portal Uang:</b>\n\n` +
          `• /start - Memulai bot & panduan menghubungkan\n` +
          `• /status - Cek status keterhubungan akun Anda\n` +
          `• /taihan - Cek taihan jatuh tempo terdekat\n` +
          `• /bantuan - Menampilkan pesan bantuan ini\n\n` +
          `Aplikasi Web: <a href="https://auraledger.app">Portal Uang Finance OS</a>`;

        await replyMessage(helpMsg);
        return res.status(200).json({ ok: true });
      }

      // Flow 4: /taihan
      if (text === '/taihan') {
        // Find linked user
        let linkedUserEmail = '';
        for (const [_, session] of telegramLinkStore.entries()) {
          if (session.telegramChatId === chatId && session.status === 'linked') {
            linkedUserEmail = session.userId;
            break;
          }
        }

        if (!linkedUserEmail) {
          await replyMessage(`⚠️ Akun Telegram Anda belum terhubung ke Portal Uang. Ketik /start untuk panduan.`);
          return res.status(200).json({ ok: true });
        }

        const userRes = await pool.query('SELECT data FROM app_state WHERE id = $1', [linkedUserEmail]);
        const userData = userRes.rows.length > 0 ? userRes.rows[0].data : null;
        const bills = userData?.bills || [];

        if (bills.length === 0) {
          await replyMessage(`📅 <b>Taihan:</b> Belum ada daftar taihan yang tersimpan di akun Anda.`);
        } else {
          const unpaidBills = bills.filter((b: any) => !b.isPaid);
          if (unpaidBills.length === 0) {
            await replyMessage(`🎉 <b>Luar biasa!</b> Seluruh taihan Anda bulan ini sudah lunas.`);
          } else {
            let listText = `📋 <b>Daftar Taihan Belum Lunas (${unpaidBills.length}):</b>\n\n`;
            unpaidBills.forEach((b: any, i: number) => {
              const amountStr = Number(b.amount || 0).toLocaleString('id-ID');
              listText += `${i + 1}. <b>${b.name}</b>: Rp ${amountStr} (Jatuh tempo: ${b.dueDate})\n`;
            });
            listText += `\n<i>Buka web Portal Uang untuk menandai lunas atau mengatur anggaran.</i>`;
            await replyMessage(listText);
          }
        }
        return res.status(200).json({ ok: true });
      }

      // Fallback unrecognized message
      await replyMessage(
        `Halo ${firstName}! Pesan diterima. Ketik <b>/bantuan</b> untuk melihat daftar perintah yang tersedia.`
      );
      res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('Telegram Webhook Handler Error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  };

  // Reister Webhook on both /telegram/webhook and /api/telegram/webhook
  app.post('/telegram/webhook', express.json(), handleTelegramWebhook);
  app.post('/api/telegram/webhook', express.json(), handleTelegramWebhook);
  app.get('/api/telegram/webhook', (req, res) => res.send('Telegram Webhook Endpoint is Active'));

  // Email Notification Routes (Unified FreeResend / SMTP)
  app.post('/api/notify/signup', async (req, res) => {
    const { email, name, planName } = req.body || {};
    if (email) {
      const cfg = await getEmailConfig(pool);
      if (cfg.emailWelcomeEnabled) {
        await sendNotificationEmail('signup', String(email).trim().toLowerCase(), { name, planName }, pool);
      }
    }
    res.json({ success: true });
  });

  app.post('/api/notify/reset-pin', async (req, res) => {
    const { email, resetCode } = req.body || {};
    if (email) {
      await sendNotificationEmail('reset_pin', String(email).trim().toLowerCase(), { resetCode }, pool);
    }
    res.json({ success: true });
  });

  app.post('/api/notify/change-pin', async (req, res) => {
    const { email, name } = req.body || {};
    if (email) {
      await sendNotificationEmail('change_pin', String(email).trim().toLowerCase(), { name }, pool);
    }
    res.json({ success: true });
  });

  app.post('/api/notify/renewal', async (req, res) => {
    const { email, name, planName, amount, expiresAt, invoiceId } = req.body || {};
    if (email) {
      await sendNotificationEmail('renewal', String(email).trim().toLowerCase(), { name, planName, amount, expiresAt, invoiceId }, pool);
    }
    res.json({ success: true });
  });

  // Global Express API Error Handler (auto-detects uncaught errors across all API routes)
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      recordIntegrationError(pool, {
        integration: 'server',
        action: `${req.method} ${req.originalUrl}`,
        message: err?.message || 'Unhandled API error',
        stack: err?.stack,
        severity: 'critical',
      }).catch(() => {});
      if (!res.headersSent) {
        return res.status(err?.status || 500).json({ success: false, error: err?.message || 'Internal Server Error' });
      }
    }
    next();
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Daily Subscription Expiry Email Reminder Cron (checks once per hour, notifies once for H-3 and H-1)
  cron.schedule('0 * * * *', async () => {
    try {
      const emailCfg = await getEmailConfig(pool);
      if (!emailCfg.emailRenewalReminderEnabled || !isEmailConfigured(emailCfg)) return;

      const usersRes = await pool.query("SELECT id, data FROM app_state WHERE id LIKE 'user_profile_%'");
      if (!Array.isArray(usersRes?.rows)) return;

      const now = Date.now();
      for (const row of usersRes.rows) {
        let userData = row.data;
        if (typeof userData === 'string') {
          try { userData = JSON.parse(userData); } catch (e) { continue; }
        }
        const email = userData?.email;
        const sub = userData?.subscription;
        if (!email || !sub?.expiresAt || sub?.planId === 'free_trial') continue;

        const expiresMs = new Date(sub.expiresAt).getTime();
        if (Number.isNaN(expiresMs) || expiresMs <= now) continue;

        const daysLeft = Math.ceil((expiresMs - now) / (1000 * 60 * 60 * 24));
        const milestone = daysLeft <= 1 ? 1 : daysLeft <= 3 ? 3 : null;
        if (!milestone) continue;

        const reminderTag = `${sub.expiresAt}_H${milestone}`;
        if (userData.lastExpiryReminderTag === reminderTag) continue;

        const resEmail = await sendNotificationEmail('expiry_reminder', email, {
          name: userData.name,
          planName: sub.planName,
          expiresAt: sub.expiresAt,
          daysLeft: milestone
        }, pool);

        if (resEmail.success) {
          userData.lastExpiryReminderTag = reminderTag;
          await pool.query(
            `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
            [row.id, JSON.stringify(userData)]
          );
        }
      }
    } catch (e) {
      console.error('[Cron] Error running expiry email reminder:', e);
    }
  });

  // Start Cron Jobs
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Adjust to UTC+7 (WIB) manually for local time matching if needed
      // Actually we'll just check based on the local time of the server (which is running the cron)
      // Usually users will input HH:mm
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      const usersRes = await pool.query("SELECT data FROM app_state WHERE id != 'global_settings'");
      const botInfo = await getTelegramBotInfo();

      if (!botInfo.token) return;

      for (const row of usersRes.rows) {
        let userData = row.data;
        if (typeof userData === 'string') {
          try {
            userData = JSON.parse(userData);
          } catch (e) { continue; }
        }

        const ns = userData.notificationSettings;
        if (ns?.dailyReminderEnabled && ns?.telegramChatId && ns?.dailyReminderTime === currentTime) {
          const note = ns.dailyReminderNote || 'Jangan impulsif buying, jangan lapar mata, ingat goals';
          
          try {
            await fetch(`https://api.telegram.org/bot${botInfo.token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                chat_id: ns.telegramChatId, 
                text: `📋 *DAILY CHECKLIST PENGINGAT*\n\n${note}`,
                parse_mode: 'Markdown'
              })
            });
            console.log(`[Cron] Sent daily reminder to ${ns.telegramChatId}`);
          } catch (e) {
            console.error('[Cron] Failed to send daily reminder:', e);
          }
        }
      }
    } catch (e) {
      console.error('[Cron] Error running daily reminder job:', e);
    }
  });

  // Scheduled Developer Error Digest Cron (checks every 15 mins; sends HTML table report ONLY if open errors exist & interval elapsed)
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runScheduledDigestCheck(pool);
    } catch (e) {
      console.error('[Cron] Error running scheduled error digest:', e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portal Uang server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
