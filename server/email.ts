import * as nodemailer from 'nodemailer';

export type EmailProviderMode = 'auto' | 'freeresend' | 'smtp';
export type AutoEmailTemplateKey =
  | 'otp'
  | 'signup'
  | 'renewal'
  | 'expiry_reminder'
  | 'invoice'
  | 'change_pin';

export interface EmailTemplateItem {
  enabled: boolean;
  subject: string;
  title: string;
  body: string;
}

export type EmailTemplatesMap = Record<AutoEmailTemplateKey, EmailTemplateItem>;

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplatesMap = {
  otp: {
    enabled: true,
    subject: '[{{otp}}] Kode Verifikasi OTP - {{appName}}',
    title: 'Kode Verifikasi OTP Anda',
    body: 'Halo {{name}},\n\nGunakan kode OTP 6 digit berikut untuk menyelesaikan verifikasi akun Anda:\n\nKODE OTP: {{otp}}\n\nKode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.'
  },
  signup: {
    enabled: true,
    subject: 'Selamat Datang di {{appName}}!',
    title: 'Akun Anda Telah Terdaftar',
    body: 'Halo {{name}},\n\nTerima kasih telah bergabung dengan {{appName}}! Akun Anda dengan paket {{planName}} telah aktif dan siap digunakan untuk mengelola arus kas, anggaran Zero-Based Budgeting, dan target keuangan Anda.\n\nSelamat mengatur keuangan dengan lebih tenang!'
  },
  renewal: {
    enabled: true,
    subject: 'Perpanjangan Paket {{planName}} Berhasil - {{appName}}',
    title: 'Langganan Berhasil Diperpanjang',
    body: 'Halo {{name}},\n\nPembayaran perpanjangan paket langganan Anda telah kami terima.\n\nPaket: {{planName}}\nNominal: Rp {{amount}}\nBerlaku Hingga: {{expiresAt}}\nID Tagihan: {{invoiceId}}\n\nTerima kasih terus mempercayakan pengelolaan keuangan Anda bersama {{appName}}.'
  },
  expiry_reminder: {
    enabled: true,
    subject: 'Pengingat: Paket {{appName}} Anda Berakhir dalam {{daysLeft}} Hari',
    title: 'Masa Aktif Paket Akan Berakhir',
    body: 'Halo {{name}},\n\nPaket langganan {{planName}} Anda di {{appName}} akan berakhir dalam {{daysLeft}} hari ({{expiresAt}}).\n\nSegera lakukan perpanjangan agar akses AI Advisor, sinkronisasi cloud, dan integrasi Telegram Bot tetap berjalan tanpa jeda.'
  },
  invoice: {
    enabled: true,
    subject: 'Invoice Pembayaran Lunas - {{planName}} ({{appName}})',
    title: 'Pembayaran Berhasil (LUNAS)',
    body: 'Halo {{name}},\n\nTerima kasih telah berlangganan / memperpanjang paket {{appName}}. Pembayaran Anda untuk {{planName}} sebesar Rp {{amount}} telah kami terima.\n\nTerlampir file PDF invoice resmi sebagai bukti pembayaran Anda.'
  },
  change_pin: {
    enabled: true,
    subject: 'Pemberitahuan Keamanan: Kata Sandi / PIN Diperbarui - {{appName}}',
    title: 'Keamanan Akun Diperbarui',
    body: 'Halo {{name}},\n\nKata sandi atau PIN keamanan akun {{appName}} Anda baru saja berhasil diperbarui.\n\nJika Anda tidak merasa melakukan perubahan ini, segera hubungi tim dukungan kami.'
  }
};

export interface ResolvedEmailConfig {
  provider: EmailProviderMode;
  apiBaseUrl: string;
  apiKey: string;
  from: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpAllowSelfSigned: boolean;
  smtpNoAuth: boolean;
  smtpUser: string;
  smtpPass: string;
  appName: string;
  appVersion: string;
  appUrl: string;
  emailOtpEnabled: boolean;
  emailWelcomeEnabled: boolean;
  emailRenewalReminderEnabled: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  skipErrorMonitor?: boolean;
}

export interface SendEmailResult {
  success: boolean;
  provider?: 'freeresend' | 'smtp';
  notConfigured?: boolean;
  error?: string;
  messageId?: string;
}

type EmailTelemetryHooks = {
  onError?: (pool: any, info: { action: string; message: string; details?: string }) => void;
  onSuccess?: (pool: any) => void;
};

let emailTelemetry: EmailTelemetryHooks = {};

export function registerEmailTelemetry(hooks: EmailTelemetryHooks): void {
  emailTelemetry = hooks;
}

export async function verifyEmailTransport(pool: any): Promise<{ ok: boolean; provider?: string; error?: string }> {
  const cfg = await getEmailConfig(pool);
  const hasFreeResend = Boolean(cfg.apiBaseUrl && cfg.apiKey);
  const hasSmtp = Boolean(cfg.smtpHost && (cfg.smtpNoAuth || (cfg.smtpUser && cfg.smtpPass)));

  if (cfg.provider === 'smtp' || (!hasFreeResend && hasSmtp)) {
    if (!hasSmtp) {
      return { ok: false, provider: 'smtp', error: 'Konfigurasi SMTP VPS belum lengkap.' };
    }
    try {
      const transportOptions: any = {
        host: cfg.smtpHost,
        port: cfg.smtpPort,
        secure: cfg.smtpSecure,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
      };
      if (!cfg.smtpNoAuth && cfg.smtpUser) {
        transportOptions.auth = { user: cfg.smtpUser, pass: cfg.smtpPass };
      }
      if (cfg.smtpAllowSelfSigned) {
        transportOptions.tls = { rejectUnauthorized: false };
      }
      const transporter = nodemailer.createTransport(transportOptions);
      await transporter.verify();
      return { ok: true, provider: 'smtp' };
    } catch (err: any) {
      return { ok: false, provider: 'smtp', error: err?.message || 'Koneksi SMTP VPS gagal.' };
    }
  }

  if (hasFreeResend) {
    try {
      const parsed = new URL(cfg.apiBaseUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, provider: 'freeresend', error: 'Base URL FreeResend tidak valid.' };
      }
      return { ok: true, provider: 'freeresend' };
    } catch {
      return { ok: false, provider: 'freeresend', error: 'Base URL FreeResend tidak valid.' };
    }
  }

  return { ok: false, error: 'Layanan email belum dikonfigurasi.' };
}

function normalizeBaseUrl(url: string): string {
  return (url || '').trim().replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderTemplateText(template: string, vars: Record<string, string>, htmlEscapeValues = false): string {
  return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const raw = vars[key] ?? '';
    return htmlEscapeValues ? escapeHtml(raw) : raw;
  });
}

export function textToHtmlParagraphs(text: string): string {
  return String(text || '')
    .split(/\n{2,}/)
    .map((block) => {
      const safeBlock = escapeHtml(block).replace(/\n/g, '<br/>');
      return `<p style="margin: 0 0 14px;">${safeBlock}</p>`;
    })
    .join('');
}

export async function getEmailTemplates(pool?: any): Promise<EmailTemplatesMap> {
  const merged: EmailTemplatesMap = JSON.parse(JSON.stringify(DEFAULT_EMAIL_TEMPLATES));
  if (!pool) return merged;

  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['email_templates']);
    if (res.rows.length > 0 && res.rows[0].data) {
      const saved = typeof res.rows[0].data === 'string'
        ? JSON.parse(res.rows[0].data)
        : res.rows[0].data;
      (Object.keys(merged) as AutoEmailTemplateKey[]).forEach((key) => {
        if (saved[key] && typeof saved[key] === 'object') {
          merged[key] = {
            enabled: saved[key].enabled !== undefined ? Boolean(saved[key].enabled) : merged[key].enabled,
            subject: typeof saved[key].subject === 'string' && saved[key].subject.trim() ? saved[key].subject : merged[key].subject,
            title: typeof saved[key].title === 'string' && saved[key].title.trim() ? saved[key].title : merged[key].title,
            body: typeof saved[key].body === 'string' && saved[key].body.trim() ? saved[key].body : merged[key].body,
          };
        }
      });
    }
  } catch (err) {
    console.warn('[Email Templates] Failed loading custom templates:', err);
  }
  return merged;
}

export async function getEmailConfig(pool?: any): Promise<ResolvedEmailConfig> {
  let dbSettings: any = {};

  if (pool) {
    try {
      const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      if (res.rows.length > 0 && res.rows[0].data) {
        dbSettings = typeof res.rows[0].data === 'string'
          ? JSON.parse(res.rows[0].data)
          : res.rows[0].data;
      }
    } catch (err) {
      console.warn('[Email Config] Failed to load global_settings from DB:', err);
    }
  }

  const appName = dbSettings.appName || 'Portal Uang';
  const appVersion = dbSettings.appVersion || '1.0.0';
  const appUrl = (process.env.APP_URL || 'https://portaluang.id').replace(/\/+$/, '');

  // All integration credentials & server endpoints MUST come from Environment Variables
  const apiBaseUrl = normalizeBaseUrl(process.env.RESEND_BASE_URL || '');
  const apiKey = (process.env.RESEND_API_KEY || '').trim();

  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = parseInt(String(process.env.SMTP_PORT || '587'), 10) || 587;
  const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
  const smtpAllowSelfSigned = process.env.SMTP_ALLOW_SELF_SIGNED === 'true';
  const smtpNoAuth = process.env.SMTP_NO_AUTH === 'true';
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').trim();

  const defaultFromAddress = smtpUser && smtpUser.includes('@')
    ? smtpUser
    : (dbSettings.supportEmail || 'noreply@portaluang.id');
  const from = (
    process.env.EMAIL_FROM ||
    dbSettings.emailFrom ||
    `${appName} <${defaultFromAddress}>`
  ).trim();

  const provider: EmailProviderMode =
    dbSettings.emailProvider === 'freeresend' || dbSettings.emailProvider === 'smtp'
      ? dbSettings.emailProvider
      : 'auto';

  return {
    provider,
    apiBaseUrl,
    apiKey,
    from,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpAllowSelfSigned,
    smtpNoAuth,
    smtpUser,
    smtpPass,
    appName,
    appVersion,
    appUrl,
    emailOtpEnabled: dbSettings.emailOtpEnabled !== false,
    emailWelcomeEnabled: dbSettings.emailWelcomeEnabled !== false,
    emailRenewalReminderEnabled: dbSettings.emailRenewalReminderEnabled !== false,
  };
}

export function isEmailConfigured(cfg: ResolvedEmailConfig): boolean {
  const hasFreeResend = Boolean(cfg.apiBaseUrl && cfg.apiKey);
  const hasSmtp = Boolean(cfg.smtpHost && (cfg.smtpNoAuth || (cfg.smtpUser && cfg.smtpPass)));
  if (cfg.provider === 'freeresend') return hasFreeResend;
  if (cfg.provider === 'smtp') return hasSmtp;
  return hasFreeResend || hasSmtp;
}

async function sendViaFreeResendApi(cfg: ResolvedEmailConfig, payload: SendEmailPayload): Promise<SendEmailResult> {
  if (!cfg.apiBaseUrl) {
    return { success: false, provider: 'freeresend', error: 'Base URL FreeResend VPS belum dikonfigurasi.' };
  }
  const base = cfg.apiBaseUrl.replace(/\/emails$/i, '');
  const endpoint = `${base}/emails`;

  const body: any = {
    from: cfg.from,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
  };
  if (payload.text) body.text = payload.text;
  if (payload.attachments && payload.attachments.length > 0) {
    body.attachments = payload.attachments.map((att) => ({
      filename: att.filename,
      content: att.content.toString('base64'),
    }));
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.message || data?.error || `HTTP ${res.status} ${res.statusText}`;
    return { success: false, provider: 'freeresend', error: `FreeResend API Error: ${errMsg}` };
  }

  return {
    success: true,
    provider: 'freeresend',
    messageId: data?.id || data?.data?.id || 'sent',
  };
}

async function sendViaSmtp(cfg: ResolvedEmailConfig, payload: SendEmailPayload): Promise<SendEmailResult> {
  if (!cfg.smtpHost) {
    return { success: false, provider: 'smtp', error: 'SMTP Host VPS belum dikonfigurasi.' };
  }

  const transportOptions: any = {
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
  };
  if (!cfg.smtpNoAuth && cfg.smtpUser) {
    transportOptions.auth = {
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
    };
  }
  if (cfg.smtpAllowSelfSigned) {
    transportOptions.tls = { rejectUnauthorized: false };
  }

  const transporter = nodemailer.createTransport(transportOptions);

  const info = await transporter.sendMail({
    from: cfg.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType || 'application/octet-stream',
    })),
  });

  return {
    success: true,
    provider: 'smtp',
    messageId: info.messageId,
  };
}

export async function sendEmail(pool: any, payload: SendEmailPayload): Promise<SendEmailResult> {
  const cfg = await getEmailConfig(pool);

  const hasFreeResend = Boolean(cfg.apiBaseUrl && cfg.apiKey);
  const hasSmtp = Boolean(cfg.smtpHost && (cfg.smtpNoAuth || (cfg.smtpUser && cfg.smtpPass)));

  let useFreeResend = false;
  let useSmtp = false;

  if (cfg.provider === 'freeresend') {
    useFreeResend = hasFreeResend;
  } else if (cfg.provider === 'smtp') {
    useSmtp = hasSmtp;
  } else {
    if (hasFreeResend) useFreeResend = true;
    else if (hasSmtp) useSmtp = true;
  }

  if (!useFreeResend && !useSmtp) {
    console.warn(`[Email] Provider not configured. Skipping email "${payload.subject}" to ${payload.to}`);
    return {
      success: false,
      notConfigured: true,
      error: 'Layanan email (FreeResend / SMTP) belum dikonfigurasi di Admin Settings atau ENV.',
    };
  }

  try {
    if (useFreeResend) {
      const result = await sendViaFreeResendApi(cfg, payload);
      if (result.success) {
        console.log(`[Email FreeResend] Sent "${payload.subject}" to ${payload.to}`);
        if (!payload.skipErrorMonitor) emailTelemetry.onSuccess?.(pool);
        return result;
      }
      if (cfg.provider === 'auto' && hasSmtp) {
        console.warn('[Email] FreeResend failed, trying SMTP fallback:', result.error);
        const fallbackRes = await sendViaSmtp(cfg, payload);
        if (fallbackRes.success && !payload.skipErrorMonitor) emailTelemetry.onSuccess?.(pool);
        return fallbackRes;
      }
      if (!payload.skipErrorMonitor) {
        emailTelemetry.onError?.(pool, {
          action: 'sendViaFreeResendApi',
          message: result.error || 'FreeResend API gagal mengirim email',
          details: `Target: ${payload.to} | Subjek: ${payload.subject}`,
        });
      }
      return result;
    }

    const smtpResult = await sendViaSmtp(cfg, payload);
    console.log(`[Email SMTP] Sent "${payload.subject}" to ${payload.to}`);
    if (!payload.skipErrorMonitor) emailTelemetry.onSuccess?.(pool);
    return smtpResult;
  } catch (err: any) {
    console.error(`[Email Error] Failed sending "${payload.subject}" to ${payload.to}:`, err);
    if (!payload.skipErrorMonitor) {
      emailTelemetry.onError?.(pool, {
        action: useFreeResend ? 'sendViaFreeResendApi' : 'sendViaSmtp',
        message: err?.message || 'Gagal mengirim email via gateway',
        details: `Target: ${payload.to} | Subjek: ${payload.subject}`,
      });
    }
    return {
      success: false,
      provider: useFreeResend ? 'freeresend' : 'smtp',
      error: err?.message || 'Gagal mengirim email',
    };
  }
}

export function wrapEmailLayout(appName: string, title: string, contentHtml: string, appUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0a09; color: #e7e5e4; padding: 32px 16px;">
      <div style="max-width: 560px; margin: 0 auto; background-color: #1c1917; border: 1px solid #292524; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 28px; border-bottom: 1px solid #292524; background: linear-gradient(135deg, #1c1917 0%, #292524 100%);">
          <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #f59e0b;">${escapeHtml(appName)}</div>
          <h1 style="margin: 6px 0 0; font-size: 20px; color: #ffffff; font-weight: 800;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding: 28px; font-size: 14px; line-height: 1.65; color: #d6d3d1;">
          ${contentHtml}
        </div>
        <div style="padding: 18px 28px; border-top: 1px solid #292524; background-color: #141210; font-size: 12px; color: #78716c; text-align: center;">
          Email otomatis dari <a href="${escapeHtml(appUrl)}" style="color: #f59e0b; text-decoration: none; font-weight: 600;">${escapeHtml(appName)}</a>.
        </div>
      </div>
    </div>
  `;
}

export const sendNotificationEmail = async (
  type: 'otp' | 'signup' | 'reset_pin' | 'change_pin' | 'renewal' | 'expiry_reminder' | 'test',
  email: string,
  data: any = {},
  pool?: any
): Promise<SendEmailResult> => {
  const cfg = await getEmailConfig(pool);
  const templates = await getEmailTemplates(pool);

  const vars: Record<string, string> = {
    name: String(data.name || email),
    email: String(email),
    otp: String(data.otp || ''),
    planName: String(data.planName || 'Pro'),
    amount: Number(data.amount || 0).toLocaleString('id-ID'),
    expiresAt: data.expiresAt
      ? new Date(data.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-',
    daysLeft: String(data.daysLeft ?? 3),
    invoiceId: String(data.invoiceId || '-'),
    resetCode: String(data.resetCode || ''),
    appName: cfg.appName,
    appVersion: cfg.appVersion,
    appUrl: cfg.appUrl,
  };

  if (type === 'test') {
    const subject = `[Test Email] Integrasi FreeResend / SMTP ${cfg.appName} Berhasil!`;
    const title = `Uji Coba Pengiriman Email Berhasil`;
    const bodyHtml = `
      <p>Selamat! Layanan email terintegrasi di <strong>${escapeHtml(cfg.appName)}</strong> berfungsi dengan baik.</p>
      <p>Email OTP, Pendaftaran, Update Versi (v${escapeHtml(cfg.appVersion)}), Perpanjangan, dan Invoice PDF kini siap dikirim otomatis dari 1 app slot.</p>
    `;
    return sendEmail(pool, {
      to: email,
      subject,
      text: `Selamat! Konfigurasi email di ${cfg.appName} berhasil mengirim email.`,
      html: wrapEmailLayout(cfg.appName, title, bodyHtml, cfg.appUrl),
    });
  }

  if (type === 'reset_pin') {
    const subject = `Reset PIN / Keamanan Akun - ${cfg.appName}`;
    const title = `Permintaan Reset PIN`;
    const bodyHtml = `
      <p>Permintaan reset PIN telah kami terima. Gunakan kode berikut:</p>
      <div style="margin: 20px 0; padding: 16px; background-color: #0c0a09; border: 1px solid #f59e0b; border-radius: 12px; text-align: center; font-size: 24px; font-weight: 800; color: #fbbf24;">
        ${escapeHtml(vars.resetCode)}
      </div>
    `;
    return sendEmail(pool, {
      to: email,
      subject,
      text: `Kode reset PIN Anda: ${vars.resetCode}`,
      html: wrapEmailLayout(cfg.appName, title, bodyHtml, cfg.appUrl),
    });
  }

  const tpl = templates[type];
  if (tpl && !tpl.enabled) {
    return { success: true, messageId: 'skipped_disabled_by_admin' };
  }

  const subject = renderTemplateText(tpl.subject, vars, false);
  const title = renderTemplateText(tpl.title, vars, false);
  const plainBody = renderTemplateText(tpl.body, vars, false);

  let extraHtml = '';
  if (type === 'otp') {
    extraHtml = `
      <div style="margin: 20px 0; padding: 18px; background-color: #0c0a09; border: 2px dashed #f59e0b; border-radius: 12px; text-align: center;">
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 0.3em; color: #fbbf24; font-family: monospace;">${escapeHtml(vars.otp)}</div>
        <div style="font-size: 12px; color: #a8a29e; margin-top: 6px;">Berlaku 10 menit</div>
      </div>
    `;
  } else if (type === 'signup') {
    extraHtml = `
      <div style="margin-top: 22px;">
        <a href="${escapeHtml(cfg.appUrl)}/login" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #0c0a09; font-weight: 800; text-decoration: none; border-radius: 10px;">Masuk ke Dashboard</a>
      </div>
    `;
  } else if (type === 'renewal') {
    extraHtml = `
      <div style="margin-top: 22px;">
        <a href="${escapeHtml(cfg.appUrl)}/app/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #0c0a09; font-weight: 800; text-decoration: none; border-radius: 10px;">Buka Aplikasi</a>
      </div>
    `;
  } else if (type === 'expiry_reminder') {
    extraHtml = `
      <div style="margin-top: 22px;">
        <a href="${escapeHtml(cfg.appUrl)}/checkout?mode=renew" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #0c0a09; font-weight: 800; text-decoration: none; border-radius: 10px;">Perpanjang Paket Sekarang</a>
      </div>
    `;
  }

  const bodyHtml = `${textToHtmlParagraphs(plainBody)}${extraHtml}`;

  return sendEmail(pool, {
    to: email,
    subject,
    text: plainBody,
    html: wrapEmailLayout(cfg.appName, title, bodyHtml, cfg.appUrl),
  });
};

export interface BroadcastRecipient {
  email: string;
  name?: string;
  planName?: string;
  expiresAt?: string;
}

export async function sendCustomBroadcastEmail(
  pool: any,
  recipient: BroadcastRecipient,
  template: { subject: string; title: string; body: string; ctaText?: string; ctaUrl?: string }
): Promise<SendEmailResult> {
  const cfg = await getEmailConfig(pool);

  const vars: Record<string, string> = {
    name: String(recipient.name || recipient.email),
    email: String(recipient.email),
    planName: String(recipient.planName || 'Member'),
    expiresAt: recipient.expiresAt
      ? new Date(recipient.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-',
    appName: cfg.appName,
    appVersion: cfg.appVersion,
    appUrl: cfg.appUrl,
  };

  const subject = renderTemplateText(template.subject, vars, false);
  const title = renderTemplateText(template.title || template.subject, vars, false);
  const plainBody = renderTemplateText(template.body, vars, false);

  let ctaHtml = '';
  if (template.ctaText && template.ctaText.trim()) {
    const rawUrl = (template.ctaUrl || cfg.appUrl).trim();
    const resolvedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
      ? rawUrl
      : `${cfg.appUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    ctaHtml = `
      <div style="margin-top: 22px;">
        <a href="${escapeHtml(resolvedUrl)}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #0c0a09; font-weight: 800; text-decoration: none; border-radius: 10px;">${escapeHtml(template.ctaText.trim())}</a>
      </div>
    `;
  }

  const bodyHtml = `${textToHtmlParagraphs(plainBody)}${ctaHtml}`;

  return sendEmail(pool, {
    to: recipient.email,
    subject,
    text: plainBody,
    html: wrapEmailLayout(cfg.appName, title, bodyHtml, cfg.appUrl),
  });
}
