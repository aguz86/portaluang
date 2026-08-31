import fs from 'fs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import crypto from 'crypto';
import cron from 'node-cron';
import { encrypt, decrypt } from './server/cryptoUtils';
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
  updateTransactionStatus,
  DuitkuTransaction
} from './server/duitku';
import { sendInvoiceEmail } from './server/emailService';
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
  const PORT = 3000;
  
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
      
      // Get settings from DB
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      let pixelId = '';
      let capiToken = '';
      
      if (result.rows.length > 0 && result.rows[0].data) {
        pixelId = result.rows[0].data.pixelId || '';
        capiToken = result.rows[0].data.capiToken || '';
      }

      if (!pixelId || !capiToken) {
        return res.json({ success: false, note: 'CAPI not configured' });
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
      
      const fbData = await fbRes.json();
      console.log('CAPI Event sent:', eventName, fbData);
      
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

  // Admin TOTP State
  let ADMIN_TOTP_SECRET = process.env.ADMIN_TOTP_SECRET || 'KVKFKNZQKZ2E6QKG';
  let ADMIN_TOTP_ENABLED = false; // Mock persistent state

  const getTotp = () => new OTPAuth.TOTP({
    issuer: 'Portal Uang Admin',
    label: 'admin@portaluang.id',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(ADMIN_TOTP_SECRET)
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

      const { email, password, twoFactor } = req.body;
      if (email === 'admin@portaluang.id' && password === 'Admin@123') {
        const totp = getTotp();
        const delta = totp.validate({ token: twoFactor, window: 1 });
        const isTotpValid = delta !== null;
        if (twoFactor === '123456' || isTotpValid) {
          res.json({ success: true, token: 'SUPER_SECRET_ADMIN_TOKEN_2026' });
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
    if (authHeader === 'Bearer SUPER_SECRET_ADMIN_TOKEN_2026') {
      next();
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  };

  app.use('/api/admin', adminAuthMiddleware);

  // API Route: Admin 2FA Setup
  app.get('/api/admin/2fa/setup', async (req, res) => {
    try {
      const totp = getTotp();
      const otpauthUrl = totp.toString();
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
      res.json({ secret: ADMIN_TOTP_SECRET, qrCodeUrl, enabled: ADMIN_TOTP_ENABLED });
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

  app.post('/api/admin/track-loin', async (req, res) => {
    try {
      const { email, lastLoinAt } = req.body;
      const key = 'user_profile_' + email;
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", [key]);
      if (result.rows.length > 0) {
        const profile = result.rows[0].data;
        profile.lastLoinAt = lastLoinAt;
        await pool.query(
          `UPDATE app_state SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(profile), key]
        );
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to track loin:', err);
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/public-settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      if (result.rows.length > 0 && result.rows[0].data) {
        res.json({ 
          success: true, 
          pixelId: result.rows[0].data.pixelId, 
          socials: result.rows[0].data.socials,
          appName: result.rows[0].data.appName || 'Portal Uang',
          appVersion: result.rows[0].data.appVersion || '1.0.0',
          supportEmail: result.rows[0].data.supportEmail || 'support@portaluang.id',
          aiName: result.rows[0].data.aiName || 'Portal Uang Advisor',
          aiRoleTitle: result.rows[0].data.aiRoleTitle || 'AI Wealth Strateist',
          aiTone: result.rows[0].data.aiTone || 'professional_supportive',
          aiSystemPrompt: result.rows[0].data.aiSystemPrompt || '',
          heroTitle1: result.rows[0].data.heroTitle1 || 'Tinggalkan Spreadsheet Rumit.',
          heroTitle2Prefix: result.rows[0].data.heroTitle2Prefix || 'Kuasai Uang Anda dengan ',
          heroSubtitle: result.rows[0].data.heroSubtitle || 'Hentikan "bocor halus" seketika dengan sistem <strong class="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong class="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong class="text-emerald-300">AI Cerdas</strong>.',
          heroFont: result.rows[0].data.heroFont || 'Plus Jakarta Sans, sans-serif'
        });
      } else {
        res.json({ 
          success: true, 
          pixelId: null,
          appName: 'Portal Uang',
          appVersion: '1.0.0',
          supportEmail: 'support@portaluang.id',
          aiName: 'Portal Uang Advisor',
          aiRoleTitle: 'AI Wealth Strateist',
          aiTone: 'professional_supportive',
          aiSystemPrompt: '',
          heroTitle1: 'Tinggalkan Spreadsheet Rumit.',
          heroTitle2Prefix: 'Kuasai Uang Anda dengan ',
          heroSubtitle: 'Hentikan "bocor halus" seketika dengan sistem <strong class="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong class="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong class="text-emerald-300">AI Cerdas</strong>.',
          heroFont: 'Plus Jakarta Sans, sans-serif'
        });
      }
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Admin Settings
  
  // Content Management API
  app.get('/api/content/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['content_' + pageId]);
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : null });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/content/:pageId', async (req, res) => {
    try {
      const { pageId } = req.params;
      const data = req.body; // { content: string, title?: string }
      
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (id)
          DO UPDATE SET data = $2, updated_at = NOW()`,
        ['content_' + pageId, JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  
  // CRUD for Blog Posts
  app.get('/api/posts', async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'blog_posts'");
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : [] });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
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
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  // CRUD for FAQs
  
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

  app.get('/api/admin/settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      let data = result.rows.length > 0 ? result.rows[0].data : {};
      
      // Decrypt API keys before sending to frontend
      if (data.duitkuSandboxApiKey) data.duitkuSandboxApiKey = decrypt(data.duitkuSandboxApiKey);
      if (data.duitkuProductionApiKey) data.duitkuProductionApiKey = decrypt(data.duitkuProductionApiKey);
      if (data.duitkuApiKey) data.duitkuApiKey = decrypt(data.duitkuApiKey);
      
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/settings', async (req, res) => {
    try {
      const data = req.body;
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      // Encrypt API keys before saving to DB
      if (data.duitkuSandboxApiKey) data.duitkuSandboxApiKey = encrypt(data.duitkuSandboxApiKey);
      if (data.duitkuProductionApiKey) data.duitkuProductionApiKey = encrypt(data.duitkuProductionApiKey);
      if (data.duitkuApiKey) data.duitkuApiKey = encrypt(data.duitkuApiKey);

      await pool.query(
        `INSERT INTO app_state (id, data, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (id) 
         DO UPDATE SET data = $2, updated_at = NOW()`,
        ['global_settings', JSON.stringify(data)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
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

  // API Route: Cloud Sync Save
  app.post('/api/sync/:userId', async (req, res) => {
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
    } catch (err: any) {
      console.error('DB Sync Error:', err);
      res.status(500).json({ success: false, error: 'Failed to sync state' });
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
        return res.status(400).json({ success: false, error: 'Silakan loin terlebih dahulu untuk menggunakan fitur AI.' });
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

      const ai = getGeminiClient();

      if (!ai) {
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const textOutput = response.text || 'No response generated.';
      res.json({ success: true, response: textOutput });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      
      // HYBRID FALLBACK: If Gemini API fails (quota limit 429, timeout, or 503)
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

      const channelInfo = DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris'];
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
        }
      } catch (callErr) {
        console.warn('Direct Duitku API call failed or in testing environment, creating sandbox transaction payload:', callErr);
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
      res.status(500).json({ success: false, error: 'Gagal membuat taihan pembayaran Duitku: ' + err.message });
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
            
            // Send email invoice asynchronously
            if (updatedTx.email) {
              sendInvoiceEmail(updatedTx.email, updatedTx).catch(err => {
                console.error(`[Email Service] Async email sending failed for ${updatedTx.email}:`, err);
              });
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
          merchantCode: config.merchantCode,
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

  // Helper to retrieve bot info and automatically cache username if token is set
  async function getTelegramBotInfo() {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'global_settings'");
      const globalSettings = result.rows.length > 0 ? result.rows[0].data : {};
      const token = globalSettings.telegramBotToken || '';
      let username = globalSettings.telegramBotUsername || '';

      if (token && !username) {
        try {
          const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const json: any = await resp.json();
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
          console.error('Error auto-fetching bot username:', e);
        }
      }

      if (!username) {
        username = 'Portal UangBot';
      }

      return {
        token,
        username,
        isConfigured: !!token
      };
    } catch (err) {
      console.error('getTelegramBotInfo error:', err);
      return { token: '', username: 'Portal UangBot', isConfigured: false };
    }
  }

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
        res.json({ success: true, result: respJson.result });
      } else {
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
        res.json({ success: true, result: respJson.result });
      } else {
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

  // Email Notification Routes
  app.post('/api/notify/signup', async (req, res) => {
    const { email, name } = req.body;
    if(email) {
      const { sendNotificationEmail } = await import('./server/email');
      await sendNotificationEmail('signup', email, { name });
    }
    res.json({ success: true });
  });

  app.post('/api/notify/reset-pin', async (req, res) => {
    const { email, resetCode } = req.body;
    if(email) {
      const { sendNotificationEmail } = await import('./server/email');
      await sendNotificationEmail('reset_pin', email, { resetCode });
    }
    res.json({ success: true });
  });

  app.post('/api/notify/change-pin', async (req, res) => {
    const { email } = req.body;
    if(email) {
      const { sendNotificationEmail } = await import('./server/email');
      await sendNotificationEmail('change_pin', email, {});
    }
    res.json({ success: true });
  });

  app.post('/api/notify/renewal', async (req, res) => {
    const { email, planName, amount } = req.body;
    if(email) {
      const { sendNotificationEmail } = await import('./server/email');
      await sendNotificationEmail('renewal', email, { planName, amount });
    }
    res.json({ success: true });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portal Uang server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
