import crypto from 'crypto';
import { getEmailConfig, isEmailConfigured, sendEmail, registerEmailTelemetry, verifyEmailTransport } from './email';
import { getDuitkuConfig } from './duitku';

export type IntegrationKey =
  | 'database'
  | 'email'
  | 'duitku'
  | 'telegram'
  | 'ai'
  | 'market_data'
  | 'meta_capi'
  | 'auth'
  | 'cron'
  | 'server'
  | 'test';

export type ErrorSeverity = 'critical' | 'error' | 'warning';
export type ErrorStatus = 'open' | 'resolved';

export interface SystemErrorLog {
  id: string;
  fingerprint: string;
  integration: IntegrationKey;
  severity: ErrorSeverity;
  action: string;
  message: string;
  details?: string;
  stack?: string;
  status: ErrorStatus;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
  lastRealtimeNotifiedAt?: string;
  notifyCount: number;
}

export interface ErrorMonitorConfig {
  enabled: boolean;
  developerEmail: string;
  realtimeEnabled: boolean;
  realtimeCooldownMinutes: number;
  scheduledEnabled: boolean;
  scheduledIntervalMinutes: number;
  autoResolveOnRecovery: boolean;
  lastDigestSentAt?: string;
  updatedAt?: string;
}

export interface ErrorReportHistoryItem {
  id: string;
  mode: 'realtime' | 'scheduled' | 'manual' | 'test';
  sentAt: string;
  to: string[];
  subject: string;
  errorCount: number;
  success: boolean;
  provider?: string;
  errorMessage?: string;
}

export const INTEGRATION_META: Record<IntegrationKey, { label: string; category: string }> = {
  database: { label: 'Database (Supabase)', category: 'Core Storage' },
  email: { label: 'Email (SMTP VPS / FreeResend)', category: 'Messaging' },
  duitku: { label: 'Duitku Payment Gateway', category: 'Billing' },
  telegram: { label: 'Telegram Bot API', category: 'Bot & Alert' },
  ai: { label: 'AI Advisor (OpenRouter / Gemini)', category: 'AI Engine' },
  market_data: { label: 'Market Data (Yahoo Finance)', category: 'Market Feed' },
  meta_capi: { label: 'Meta Conversions API', category: 'Analytics' },
  auth: { label: 'Auth, 2FA & OTP', category: 'Security' },
  cron: { label: 'Scheduled Cron Jobs', category: 'Automation' },
  server: { label: 'Express API & Runtime', category: 'Server' },
  test: { label: 'Uji Coba Monitor Error', category: 'Diagnostic' },
};

const CORE_MONITORED_INTEGRATIONS: IntegrationKey[] = [
  'database',
  'email',
  'duitku',
  'telegram',
  'ai',
  'market_data',
  'meta_capi',
  'auth',
  'cron',
  'server',
];

const DEFAULT_CONFIG: ErrorMonitorConfig = {
  enabled: true,
  developerEmail: (process.env.DEVELOPER_EMAIL || '').trim(),
  realtimeEnabled: true,
  realtimeCooldownMinutes: 5,
  scheduledEnabled: true,
  scheduledIntervalMinutes: 60,
  autoResolveOnRecovery: true,
};

let hooksInstalled = false;
let isInsideErrorMonitor = false;
let lastKnownIntegrationErrors = new Map<string, number>();

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeErrorText(text: unknown, maxLen = 900): string {
  let str = String(text ?? '');
  // Redact database URLs, Bearer tokens, and inline secrets
  str = str.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, 'postgresql://[REDACTED]');
  str = str.replace(/Bearer\s+[A-Za-z0-9._\-+/=]+/gi, 'Bearer [REDACTED]');
  str = str.replace(/(apiKey|api_key|smtpPass|password|secret|token)\s*[:=]\s*["']?([^\s"',;]+)["']?/gi, '$1=[REDACTED]');
  str = str.trim();
  if (str.length > maxLen) {
    return `${str.slice(0, maxLen)}... [dipotong]`;
  }
  return str;
}

function formatWibTime(iso?: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';
  } catch {
    return iso;
  }
}

export function parseDeveloperEmails(raw: string): string[] {
  return String(raw || '')
    .split(/[,;\n]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

export interface RealtimeErrorEvent {
  id: string;
  timestamp: string;
  integration: IntegrationKey;
  severity: ErrorSeverity;
  action: string;
  message: string;
  details?: string;
}

const MAX_REALTIME_EVENTS = 120;
let cachedMonitorConfig: ErrorMonitorConfig = { ...DEFAULT_CONFIG };
let cachedSystemLogs: SystemErrorLog[] = [];
const realtimeErrorEvents: RealtimeErrorEvent[] = [];

export function getRealtimeErrorEvents(): RealtimeErrorEvent[] {
  return [...realtimeErrorEvents];
}

function pushRealtimeErrorEvent(event: Omit<RealtimeErrorEvent, 'id' | 'timestamp'>): void {
  realtimeErrorEvents.unshift({
    id: `rt_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...event,
  });
  if (realtimeErrorEvents.length > MAX_REALTIME_EVENTS) {
    realtimeErrorEvents.length = MAX_REALTIME_EVENTS;
  }
}

export async function getErrorMonitorConfig(pool: any): Promise<ErrorMonitorConfig> {
  if (!pool) return { ...cachedMonitorConfig };
  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['error_monitor_config']);
    if (res.rows.length > 0 && res.rows[0].data) {
      const saved = typeof res.rows[0].data === 'string'
        ? JSON.parse(res.rows[0].data)
        : res.rows[0].data;
      cachedMonitorConfig = {
        ...DEFAULT_CONFIG,
        ...saved,
        developerEmail: typeof saved.developerEmail === 'string'
          ? saved.developerEmail.trim()
          : DEFAULT_CONFIG.developerEmail,
        realtimeCooldownMinutes: Math.max(0, Number(saved.realtimeCooldownMinutes ?? DEFAULT_CONFIG.realtimeCooldownMinutes)),
        scheduledIntervalMinutes: Math.max(5, Number(saved.scheduledIntervalMinutes ?? DEFAULT_CONFIG.scheduledIntervalMinutes)),
      };
      return { ...cachedMonitorConfig };
    }
  } catch (err) {
    process.stderr.write(`[ErrorMonitor] Failed reading config (using memory cache): ${(err as any)?.message || err}\n`);
    return { ...cachedMonitorConfig };
  }
  return { ...cachedMonitorConfig };
}

export async function saveErrorMonitorConfig(pool: any, nextPartial: Partial<ErrorMonitorConfig>): Promise<ErrorMonitorConfig> {
  const current = await getErrorMonitorConfig(pool);
  const merged: ErrorMonitorConfig = {
    ...current,
    ...nextPartial,
    developerEmail: typeof (nextPartial.developerEmail ?? current.developerEmail) === 'string'
      ? String(nextPartial.developerEmail ?? current.developerEmail).trim()
      : '',
    realtimeCooldownMinutes: Math.max(0, Number(nextPartial.realtimeCooldownMinutes ?? current.realtimeCooldownMinutes)),
    scheduledIntervalMinutes: Math.max(5, Number(nextPartial.scheduledIntervalMinutes ?? current.scheduledIntervalMinutes)),
    updatedAt: new Date().toISOString(),
  };

  cachedMonitorConfig = merged;
  await pool.query(
    `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
    ['error_monitor_config', JSON.stringify(merged)]
  );
  return merged;
}

export async function getSystemErrorLogs(pool: any): Promise<SystemErrorLog[]> {
  if (!pool) return [...cachedSystemLogs];
  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['system_error_logs']);
    if (res.rows.length > 0 && Array.isArray(res.rows[0].data)) {
      cachedSystemLogs = res.rows[0].data;
      return [...cachedSystemLogs];
    }
    if (res.rows.length > 0 && typeof res.rows[0].data === 'string') {
      const parsed = JSON.parse(res.rows[0].data);
      cachedSystemLogs = Array.isArray(parsed) ? parsed : [];
      return [...cachedSystemLogs];
    }
  } catch (err) {
    process.stderr.write(`[ErrorMonitor] Failed reading error logs (using memory cache): ${(err as any)?.message || err}\n`);
    return [...cachedSystemLogs];
  }
  return [];
}

async function saveSystemErrorLogs(pool: any, logs: SystemErrorLog[]): Promise<void> {
  const trimmed = logs.slice(0, 150);
  cachedSystemLogs = trimmed;
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ['system_error_logs', JSON.stringify(trimmed)]
    );
  } catch (err) {
    process.stderr.write(`[ErrorMonitor] Failed saving error logs to DB: ${(err as any)?.message || err}\n`);
  }
}

export async function getErrorReportHistory(pool: any): Promise<ErrorReportHistoryItem[]> {
  if (!pool) return [];
  try {
    const res = await pool.query('SELECT data FROM app_state WHERE id = $1', ['error_report_history']);
    if (res.rows.length > 0 && Array.isArray(res.rows[0].data)) {
      return res.rows[0].data;
    }
  } catch {}
  return [];
}

async function appendReportHistory(pool: any, entry: ErrorReportHistoryItem): Promise<void> {
  if (!pool) return;
  try {
    const history = await getErrorReportHistory(pool);
    history.unshift(entry);
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ['error_report_history', JSON.stringify(history.slice(0, 40))]
    );
  } catch {}
}

export async function resolveAllOpenErrors(pool: any): Promise<number> {
  const logs = await getSystemErrorLogs(pool);
  let count = 0;
  const nowIso = new Date().toISOString();
  const nextLogs = logs.map((item) => {
    if (item.status === 'open') {
      count++;
      return { ...item, status: 'resolved' as ErrorStatus, resolvedAt: nowIso };
    }
    return item;
  });
  if (count > 0) await saveSystemErrorLogs(pool, nextLogs);
  return count;
}

function getSeverityBadgeStyle(severity: ErrorSeverity): string {
  if (severity === 'critical') return 'background-color:#fee2e2;color:#991b1b;border:1px solid #fca5a5;';
  if (severity === 'error') return 'background-color:#ffedd5;color:#9a3412;border:1px solid #fdba74;';
  return 'background-color:#fef3c7;color:#92400e;border:1px solid #fcd34d;';
}

function wrapTableEmailLayout(opts: {
  appName: string;
  appUrl: string;
  badgeText: string;
  badgeColor: string;
  headerTitle: string;
  headerSubtitle: string;
  innerHtml: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px;background-color:#ffffff;border:1px solid #d4d4d8;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:#0f172a;padding:22px 24px;border-bottom:3px solid ${escapeHtml(opts.badgeColor)};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;border-radius:4px;background-color:${escapeHtml(opts.badgeColor)};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(opts.badgeText)}</span>
                    <h1 style="margin:10px 0 4px;font-size:20px;line-height:1.3;color:#ffffff;font-weight:800;">${escapeHtml(opts.headerTitle)}</h1>
                    <p style="margin:0;font-size:13px;color:#cbd5e1;">${escapeHtml(opts.headerSubtitle)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${opts.innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>Sistem Auto-Detect Log Error &bull; <strong>${escapeHtml(opts.appName)}</strong></td>
                  <td align="right">
                    <a href="${escapeHtml(opts.appUrl)}/admin/error-monitor" style="color:#0284c7;font-weight:700;text-decoration:none;">Buka Error Monitor &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOpenErrorsTableHtml(openErrors: SystemErrorLog[]): string {
  if (openErrors.length === 0) {
    return `
      <table role="presentation" width="100%" cellpadding="12" cellspacing="0" border="0" style="border:1px solid #bbf7d0;background-color:#f0fdf4;border-radius:8px;">
        <tr>
          <td style="font-size:13px;color:#166534;font-weight:700;">Tidak ada error aktif yang terdeteksi saat ini. Seluruh integrasi berjalan normal.</td>
        </tr>
      </table>`;
  }

  const rowsHtml = openErrors
    .slice(0, 35)
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const intLabel = INTEGRATION_META[item.integration]?.label || item.integration;
      const sevStyle = getSeverityBadgeStyle(item.severity);
      return `
        <tr style="background-color:${bg};">
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:12px;color:#475569;text-align:center;vertical-align:top;">${idx + 1}</td>
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#0f172a;vertical-align:top;">${escapeHtml(intLabel)}</td>
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:11px;text-align:center;vertical-align:top;">
            <span style="display:inline-block;padding:2px 7px;border-radius:4px;font-weight:800;text-transform:uppercase;${sevStyle}">${escapeHtml(item.severity)}</span>
          </td>
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:12px;font-family:monospace;color:#334155;vertical-align:top;word-break:break-word;">${escapeHtml(item.action)}</td>
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:12px;color:#1e293b;vertical-align:top;word-break:break-word;">${escapeHtml(sanitizeErrorText(item.message, 220))}</td>
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#0f172a;text-align:center;vertical-align:top;">${item.occurrences}x</td>
          <td style="padding:10px 8px;border:1px solid #cbd5e1;font-size:11px;color:#475569;vertical-align:top;white-space:nowrap;">${escapeHtml(formatWibTime(item.lastSeenAt))}</td>
        </tr>`;
    })
    .join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin-top:8px;">
      <thead>
        <tr style="background-color:#1e293b;color:#ffffff;">
          <th align="center" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">No</th>
          <th align="left" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Integrasi</th>
          <th align="center" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Level</th>
          <th align="left" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Aksi / Endpoint</th>
          <th align="left" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Pesan Error</th>
          <th align="center" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Hits</th>
          <th align="left" style="padding:10px 8px;border:1px solid #334155;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Terakhir Terjadi</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>`;
}

function buildIntegrationSummaryTableHtml(openErrors: SystemErrorLog[]): string {
  const grouped = new Map<IntegrationKey, { count: number; hits: number; worstSeverity: ErrorSeverity }>();
  for (const err of openErrors) {
    const prev = grouped.get(err.integration);
    if (!prev) {
      grouped.set(err.integration, { count: 1, hits: err.occurrences, worstSeverity: err.severity });
    } else {
      prev.count += 1;
      prev.hits += err.occurrences;
      if (err.severity === 'critical' || (err.severity === 'error' && prev.worstSeverity === 'warning')) {
        prev.worstSeverity = err.severity;
      }
    }
  }

  const rowsHtml = CORE_MONITORED_INTEGRATIONS.map((key, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const meta = INTEGRATION_META[key];
    const stat = grouped.get(key);
    const statusBadge = stat
      ? `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;background-color:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">BERMASALAH (${stat.count})</span>`
      : `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;background-color:#dcfce7;color:#166534;border:1px solid #86efac;">NORMAL</span>`;

    return `
      <tr style="background-color:${bg};">
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#0f172a;">${escapeHtml(meta.label)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-size:12px;color:#475569;">${escapeHtml(meta.category)}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;text-align:center;">${statusBadge}</td>
        <td style="padding:8px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#0f172a;text-align:center;">${stat ? `${stat.hits}x` : '0'}</td>
      </tr>`;
  }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin-top:8px;">
      <thead>
        <tr style="background-color:#1e293b;color:#ffffff;">
          <th align="left" style="padding:9px 10px;border:1px solid #334155;font-size:11px;text-transform:uppercase;">Integrasi</th>
          <th align="left" style="padding:9px 10px;border:1px solid #334155;font-size:11px;text-transform:uppercase;">Kategori</th>
          <th align="center" style="padding:9px 10px;border:1px solid #334155;font-size:11px;text-transform:uppercase;">Status Saat Ini</th>
          <th align="center" style="padding:9px 10px;border:1px solid #334155;font-size:11px;text-transform:uppercase;">Total Kejadian</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>`;
}

function buildRealtimeErrorEmail(
  appName: string,
  appUrl: string,
  errLog: SystemErrorLog,
  openErrors: SystemErrorLog[],
  isTest = false
): { subject: string; html: string; text: string } {
  const intLabel = INTEGRATION_META[errLog.integration]?.label || errLog.integration;
  const sevStyle = getSeverityBadgeStyle(errLog.severity);
  const badgeColor = errLog.severity === 'critical' ? '#dc2626' : errLog.severity === 'warning' ? '#d97706' : '#e11d48';

  const subject = `${isTest ? '[TEST] ' : ''}[REALTIME ERROR] ${intLabel} - ${sanitizeErrorText(errLog.message, 60)} (${appName})`;

  const detailTableHtml = `
    <h2 style="margin:0 0 8px;font-size:15px;color:#0f172a;font-weight:800;">1. Detail Insiden Terbaru</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin-bottom:20px;">
      <thead>
        <tr style="background-color:#1e293b;color:#ffffff;">
          <th align="left" width="180" style="padding:9px 10px;border:1px solid #334155;font-size:11px;text-transform:uppercase;">Parameter</th>
          <th align="left" style="padding:9px 10px;border:1px solid #334155;font-size:11px;text-transform:uppercase;">Informasi Error</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color:#ffffff;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">ID Log</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-family:monospace;color:#0f172a;">${escapeHtml(errLog.id)}</td>
        </tr>
        <tr style="background-color:#f8fafc;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Integrasi</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#0f172a;">${escapeHtml(intLabel)}</td>
        </tr>
        <tr style="background-color:#ffffff;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Severity</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;text-transform:uppercase;${sevStyle}">${escapeHtml(errLog.severity)}</span>
          </td>
        </tr>
        <tr style="background-color:#f8fafc;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Aksi / Endpoint</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-family:monospace;color:#0f172a;">${escapeHtml(errLog.action)}</td>
        </tr>
        <tr style="background-color:#ffffff;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Pesan Error</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;color:#b91c1c;font-weight:600;word-break:break-word;">${escapeHtml(errLog.message)}</td>
        </tr>
        ${errLog.details ? `
        <tr style="background-color:#f8fafc;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Konteks Tambahan</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;color:#334155;word-break:break-word;">${escapeHtml(errLog.details)}</td>
        </tr>` : ''}
        <tr style="background-color:#ffffff;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Total Kejadian</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#0f172a;">${errLog.occurrences}x (Terdeteksi sejak ${escapeHtml(formatWibTime(errLog.firstSeenAt))})</td>
        </tr>
        <tr style="background-color:#f8fafc;">
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;font-weight:700;color:#334155;">Waktu Kejadian</td>
          <td style="padding:9px 10px;border:1px solid #cbd5e1;font-size:12px;color:#0f172a;">${escapeHtml(formatWibTime(errLog.lastSeenAt))}</td>
        </tr>
      </tbody>
    </table>
    ${errLog.stack ? `
      <div style="margin-bottom:20px;">
        <div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:6px;">Stack Trace / Detail Teknis:</div>
        <pre style="margin:0;padding:12px;background-color:#0f172a;color:#e2e8f0;border-radius:8px;font-size:11px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;word-break:break-word;">${escapeHtml(errLog.stack)}</pre>
      </div>
    ` : ''}
    <h2 style="margin:0 0 8px;font-size:15px;color:#0f172a;font-weight:800;">2. Daftar Error yang Masih Terdeteksi (${openErrors.length})</h2>
    ${buildOpenErrorsTableHtml(openErrors)}
  `;

  const html = wrapTableEmailLayout({
    appName,
    appUrl,
    badgeText: isTest ? 'REALTIME ALERT (UJI COBA)' : `REALTIME ALERT • ${errLog.severity.toUpperCase()}`,
    badgeColor,
    headerTitle: `Error Terdeteksi pada ${intLabel}`,
    headerSubtitle: `Dilaporkan otomatis secara realtime pada ${formatWibTime(errLog.lastSeenAt)}`,
    innerHtml: detailTableHtml,
  });

  const text = [
    `[REALTIME ERROR] ${intLabel} (${errLog.severity.toUpperCase()})`,
    `Aplikasi: ${appName}`,
    `Aksi/Endpoint: ${errLog.action}`,
    `Pesan: ${errLog.message}`,
    `Waktu: ${formatWibTime(errLog.lastSeenAt)}`,
    `Total Error Aktif: ${openErrors.length}`,
    `Buka Monitor: ${appUrl}/admin/error-monitor`,
  ].join('\n');

  return { subject, html, text };
}

function buildScheduledDigestEmail(
  appName: string,
  appUrl: string,
  openErrors: SystemErrorLog[],
  modeLabel: string
): { subject: string; html: string; text: string } {
  const nowStr = formatWibTime(new Date().toISOString());
  const totalHits = openErrors.reduce((acc, item) => acc + (item.occurrences || 1), 0);
  const criticalCount = openErrors.filter((e) => e.severity === 'critical').length;
  const hasErrors = openErrors.length > 0;

  const subject = hasErrors
    ? `[LAPORAN TERJADWAL] ${openErrors.length} Error Masih Terdeteksi (${totalHits} Kejadian) - ${appName}`
    : `[LAPORAN STATUS] Semua Integrasi Normal (0 Error Aktif) - ${appName}`;

  const innerHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin-bottom:20px;">
      <tr>
        <td width="33%" style="padding:12px;border:1px solid #cbd5e1;background-color:#f8fafc;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Error Masih Aktif</div>
          <div style="font-size:22px;font-weight:900;color:${hasErrors ? '#dc2626' : '#16a34a'};margin-top:4px;">${openErrors.length}</div>
        </td>
        <td width="33%" style="padding:12px;border:1px solid #cbd5e1;background-color:#f8fafc;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Severity Critical</div>
          <div style="font-size:22px;font-weight:900;color:${criticalCount > 0 ? '#dc2626' : '#0f172a'};margin-top:4px;">${criticalCount}</div>
        </td>
        <td width="34%" style="padding:12px;border:1px solid #cbd5e1;background-color:#f8fafc;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Total Kejadian (Hits)</div>
          <div style="font-size:22px;font-weight:900;color:#0f172a;margin-top:4px;">${totalHits}x</div>
        </td>
      </tr>
    </table>

    <h2 style="margin:0 0 8px;font-size:15px;color:#0f172a;font-weight:800;">1. Ringkasan Kesehatan Semua Integrasi</h2>
    ${buildIntegrationSummaryTableHtml(openErrors)}

    <h2 style="margin:24px 0 8px;font-size:15px;color:#0f172a;font-weight:800;">2. Daftar Error yang Masih Terdeteksi (${openErrors.length})</h2>
    ${buildOpenErrorsTableHtml(openErrors)}
  `;

  const html = wrapTableEmailLayout({
    appName,
    appUrl,
    badgeText: modeLabel,
    badgeColor: hasErrors ? '#e11d48' : '#16a34a',
    headerTitle: hasErrors
      ? `Rekap Error Terjadwal: ${openErrors.length} Masalah Aktif`
      : `Rekap Status Terjadwal: Semua Integrasi Sehat`,
    headerSubtitle: `Laporan otomatis dikirim pada ${nowStr}`,
    innerHtml,
  });

  const textLines = [
    `[${modeLabel}] ${appName} - ${nowStr}`,
    `Total Error Aktif: ${openErrors.length} (${totalHits} kejadian)`,
    ...openErrors.slice(0, 20).map((e, i) => `${i + 1}. [${e.integration.toUpperCase()}] ${e.action}: ${e.message} (${e.occurrences}x)`),
    `Monitor lengkap: ${appUrl}/admin/error-monitor`,
  ];

  return { subject, html, text: textLines.join('\n') };
}

export async function recordIntegrationError(
  pool: any,
  input: {
    integration: IntegrationKey;
    action: string;
    message: string;
    details?: string;
    stack?: string;
    severity?: ErrorSeverity;
    skipEmailDispatch?: boolean;
    bypassCooldown?: boolean;
  }
): Promise<{ log: SystemErrorLog; realtimeDispatched: boolean; dispatchError?: string }> {
  const cleanMessage = sanitizeErrorText(input.message || 'Unknown error', 500);
  const cleanAction = sanitizeErrorText(input.action || 'unknown_action', 160);
  const cleanDetails = input.details ? sanitizeErrorText(input.details, 500) : undefined;
  const cleanStack = input.stack ? sanitizeErrorText(input.stack, 1200) : undefined;
  const severity: ErrorSeverity = input.severity || (input.integration === 'database' || input.integration === 'duitku' ? 'critical' : 'error');

  // Normalize message numbers/timestamps for smart deduplication fingerprint
  const normalizedForHash = cleanMessage.replace(/\d{6,}/g, '#').slice(0, 200);
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${input.integration}|${cleanAction}|${normalizedForHash}`)
    .digest('hex')
    .slice(0, 16);

  // Always record into realtime ring-buffer stream for live monitoring
  pushRealtimeErrorEvent({
    integration: input.integration,
    severity,
    action: cleanAction,
    message: cleanMessage,
    details: cleanDetails,
  });

  // In-memory rate guard (max once per 3 seconds for identical errors)
  const nowMs = Date.now();
  const recentHit = lastKnownIntegrationErrors.get(fingerprint);
  if (!input.bypassCooldown && recentHit && nowMs - recentHit < 3000) {
    const existingLogs = await getSystemErrorLogs(pool);
    const found = existingLogs.find((l) => l.fingerprint === fingerprint);
    if (found) return { log: found, realtimeDispatched: false };
  }
  lastKnownIntegrationErrors.set(fingerprint, nowMs);

  const nowIso = new Date(nowMs).toISOString();
  const logs = await getSystemErrorLogs(pool);
  let targetLog = logs.find((l) => l.fingerprint === fingerprint);

  if (targetLog) {
    targetLog.occurrences = (targetLog.occurrences || 1) + 1;
    targetLog.lastSeenAt = nowIso;
    targetLog.status = 'open';
    targetLog.resolvedAt = undefined;
    targetLog.severity = severity;
    targetLog.message = cleanMessage;
    if (cleanDetails) targetLog.details = cleanDetails;
    if (cleanStack) targetLog.stack = cleanStack;
    // Move to top
    const others = logs.filter((l) => l.fingerprint !== fingerprint);
    others.unshift(targetLog);
    await saveSystemErrorLogs(pool, others);
  } else {
    targetLog = {
      id: `err_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      fingerprint,
      integration: input.integration,
      severity,
      action: cleanAction,
      message: cleanMessage,
      details: cleanDetails,
      stack: cleanStack,
      status: 'open',
      occurrences: 1,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      notifyCount: 0,
    };
    logs.unshift(targetLog);
    await saveSystemErrorLogs(pool, logs);
  }

  let realtimeDispatched = false;
  let dispatchError: string | undefined;

  if (!input.skipEmailDispatch && pool) {
    const monCfg = await getErrorMonitorConfig(pool);
    const devEmails = parseDeveloperEmails(monCfg.developerEmail);
    const cooldownMs = Math.max(0, monCfg.realtimeCooldownMinutes) * 60 * 1000;
    const lastNotifiedMs = targetLog.lastRealtimeNotifiedAt ? new Date(targetLog.lastRealtimeNotifiedAt).getTime() : 0;
    const cooldownPassed = input.bypassCooldown || !lastNotifiedMs || nowMs - lastNotifiedMs >= cooldownMs;

    if (monCfg.enabled && monCfg.realtimeEnabled && devEmails.length > 0 && cooldownPassed) {
      const emailCfg = await getEmailConfig(pool);
      if (isEmailConfigured(emailCfg)) {
        const currentLogs = await getSystemErrorLogs(pool);
        const openErrors = currentLogs.filter((l) => l.status === 'open');
        const mailPayload = buildRealtimeErrorEmail(
          emailCfg.appName,
          emailCfg.appUrl,
          targetLog,
          openErrors,
          input.integration === 'test'
        );

        const sendRes = await sendEmail(pool, {
          to: devEmails.join(','),
          subject: mailPayload.subject,
          html: mailPayload.html,
          text: mailPayload.text,
          skipErrorMonitor: true,
        });

        await appendReportHistory(pool, {
          id: `rep_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          mode: input.integration === 'test' ? 'test' : 'realtime',
          sentAt: new Date().toISOString(),
          to: devEmails,
          subject: mailPayload.subject,
          errorCount: openErrors.length,
          success: sendRes.success,
          provider: sendRes.provider,
          errorMessage: sendRes.error,
        });

        if (sendRes.success) {
          realtimeDispatched = true;
          const updatedLogs = await getSystemErrorLogs(pool);
          const item = updatedLogs.find((l) => l.id === targetLog!.id);
          if (item) {
            item.lastRealtimeNotifiedAt = new Date().toISOString();
            item.notifyCount = (item.notifyCount || 0) + 1;
            targetLog = item;
            await saveSystemErrorLogs(pool, updatedLogs);
          }
        } else {
          dispatchError = sendRes.error;
        }
      } else {
        dispatchError = 'Email Gateway belum dikonfigurasi untuk mengirim laporan.';
      }
    }
  }

  return { log: targetLog, realtimeDispatched, dispatchError };
}

export async function markIntegrationRecovered(pool: any, integration: IntegrationKey): Promise<number> {
  if (!pool || integration === 'test') return 0;
  try {
    const monCfg = await getErrorMonitorConfig(pool);
    if (!monCfg.autoResolveOnRecovery) return 0;

    const logs = await getSystemErrorLogs(pool);
    let resolvedCount = 0;
    const nowIso = new Date().toISOString();
    const nextLogs = logs.map((item) => {
      if (item.integration === integration && item.status === 'open') {
        resolvedCount++;
        return { ...item, status: 'resolved' as ErrorStatus, resolvedAt: nowIso };
      }
      return item;
    });
    if (resolvedCount > 0) {
      await saveSystemErrorLogs(pool, nextLogs);
    }
    return resolvedCount;
  } catch {
    return 0;
  }
}

export async function resolveErrorLogById(pool: any, id: string, status: ErrorStatus = 'resolved'): Promise<boolean> {
  const logs = await getSystemErrorLogs(pool);
  let found = false;
  const nowIso = new Date().toISOString();
  const nextLogs = logs.map((item) => {
    if (item.id === id) {
      found = true;
      return {
        ...item,
        status,
        resolvedAt: status === 'resolved' ? nowIso : undefined,
      };
    }
    return item;
  });
  if (found) await saveSystemErrorLogs(pool, nextLogs);
  return found;
}

export async function clearResolvedErrorLogs(pool: any, clearAll = false): Promise<number> {
  const logs = await getSystemErrorLogs(pool);
  const kept = clearAll ? [] : logs.filter((item) => item.status === 'open');
  const removedCount = logs.length - kept.length;
  await saveSystemErrorLogs(pool, kept);
  return removedCount;
}

export async function runScheduledDigestCheck(
  pool: any,
  opts: { force?: boolean } = {}
): Promise<{ sent: boolean; reason?: string; errorCount: number; error?: string }> {
  const monCfg = await getErrorMonitorConfig(pool);
  const logs = await getSystemErrorLogs(pool);
  const openErrors = logs.filter((l) => l.status === 'open');

  if (!opts.force) {
    if (!monCfg.enabled || !monCfg.scheduledEnabled) {
      return { sent: false, reason: 'disabled', errorCount: openErrors.length };
    }
    if (openErrors.length === 0) {
      return { sent: false, reason: 'no_open_errors', errorCount: 0 };
    }
    const lastSentMs = monCfg.lastDigestSentAt ? new Date(monCfg.lastDigestSentAt).getTime() : 0;
    const intervalMs = Math.max(5, monCfg.scheduledIntervalMinutes) * 60 * 1000;
    if (lastSentMs && Date.now() - lastSentMs < intervalMs) {
      return { sent: false, reason: 'interval_not_elapsed', errorCount: openErrors.length };
    }
  }

  const devEmails = parseDeveloperEmails(monCfg.developerEmail);
  if (devEmails.length === 0) {
    return { sent: false, reason: 'no_developer_email', errorCount: openErrors.length, error: 'Email developer belum diisi.' };
  }

  const emailCfg = await getEmailConfig(pool);
  if (!isEmailConfigured(emailCfg)) {
    return { sent: false, reason: 'email_not_configured', errorCount: openErrors.length, error: 'Email Gateway belum dikonfigurasi.' };
  }

  const modeLabel = opts.force ? 'LAPORAN MANUAL' : 'LAPORAN TERJADWAL';
  const mailPayload = buildScheduledDigestEmail(emailCfg.appName, emailCfg.appUrl, openErrors, modeLabel);

  const sendRes = await sendEmail(pool, {
    to: devEmails.join(','),
    subject: mailPayload.subject,
    html: mailPayload.html,
    text: mailPayload.text,
    skipErrorMonitor: true,
  });

  await appendReportHistory(pool, {
    id: `rep_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    mode: opts.force ? 'manual' : 'scheduled',
    sentAt: new Date().toISOString(),
    to: devEmails,
    subject: mailPayload.subject,
    errorCount: openErrors.length,
    success: sendRes.success,
    provider: sendRes.provider,
    errorMessage: sendRes.error,
  });

  if (sendRes.success) {
    await saveErrorMonitorConfig(pool, { lastDigestSentAt: new Date().toISOString() });
    return { sent: true, errorCount: openErrors.length };
  }

  return { sent: false, reason: 'send_failed', errorCount: openErrors.length, error: sendRes.error };
}

export async function runAllIntegrationHealthChecks(pool: any): Promise<{
  checkedAt: string;
  results: Array<{ integration: IntegrationKey; label: string; ok: boolean; detail: string }>;
}> {
  const results: Array<{ integration: IntegrationKey; label: string; ok: boolean; detail: string }> = [];

  // 1. Database check
  try {
    await pool.query('SELECT 1');
    await markIntegrationRecovered(pool, 'database');
    results.push({ integration: 'database', label: INTEGRATION_META.database.label, ok: true, detail: process.env.DATABASE_URL ? 'Koneksi Supabase PostgreSQL aktif' : 'Mode preview in-memory aktif' });
  } catch (err: any) {
    await recordIntegrationError(pool, {
      integration: 'database',
      action: 'healthcheck:SELECT 1',
      message: err?.message || 'Koneksi database Supabase gagal',
      stack: err?.stack,
      severity: 'critical',
    });
    results.push({ integration: 'database', label: INTEGRATION_META.database.label, ok: false, detail: err?.message || 'Gagal koneksi database' });
  }

  // 2. Email gateway check
  const emailHealth = await verifyEmailTransport(pool);
  if (emailHealth.ok) {
    await markIntegrationRecovered(pool, 'email');
    results.push({ integration: 'email', label: INTEGRATION_META.email.label, ok: true, detail: `Transport ${emailHealth.provider?.toUpperCase()} terhubung` });
  } else {
    const emailCfg = await getEmailConfig(pool);
    if (isEmailConfigured(emailCfg)) {
      await recordIntegrationError(pool, {
        integration: 'email',
        action: `healthcheck:${emailHealth.provider || 'email'}`,
        message: emailHealth.error || 'Verifikasi SMTP/FreeResend gagal',
        severity: 'error',
        skipEmailDispatch: true,
      });
    }
    results.push({ integration: 'email', label: INTEGRATION_META.email.label, ok: false, detail: emailHealth.error || 'Belum dikonfigurasi' });
  }

  // 3. Duitku check
  try {
    const duitkuCfg = await getDuitkuConfig(pool);
    if (duitkuCfg.merchantCode && duitkuCfg.apiKey) {
      await markIntegrationRecovered(pool, 'duitku');
      results.push({ integration: 'duitku', label: INTEGRATION_META.duitku.label, ok: true, detail: `Mode ${duitkuCfg.env} siap (${duitkuCfg.merchantCode})` });
    } else {
      await recordIntegrationError(pool, {
        integration: 'duitku',
        action: 'healthcheck:duitku_config',
        message: 'Merchant Code atau API Key Duitku belum lengkap.',
        severity: 'warning',
      });
      results.push({ integration: 'duitku', label: INTEGRATION_META.duitku.label, ok: false, detail: 'Merchant Code / API Key belum lengkap' });
    }
  } catch (err: any) {
    await recordIntegrationError(pool, {
      integration: 'duitku',
      action: 'healthcheck:duitku_config',
      message: err?.message || 'Gagal membaca konfigurasi Duitku',
      severity: 'error',
    });
    results.push({ integration: 'duitku', label: INTEGRATION_META.duitku.label, ok: false, detail: err?.message || 'Error konfigurasi Duitku' });
  }

  // 4. Telegram Bot check (token strictly from ENV)
  try {
    const tgToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!tgToken) {
      results.push({ integration: 'telegram', label: INTEGRATION_META.telegram.label, ok: true, detail: 'TELEGRAM_BOT_TOKEN belum diset di ENV (opsional)' });
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`, { signal: controller.signal });
      clearTimeout(timer);
      const tgJson: any = await tgRes.json().catch(() => ({}));
      if (tgRes.ok && tgJson.ok) {
        await markIntegrationRecovered(pool, 'telegram');
        results.push({ integration: 'telegram', label: INTEGRATION_META.telegram.label, ok: true, detail: `Bot @${tgJson.result?.username || 'active'} online` });
      } else {
        const msg = tgJson?.description || `Telegram API HTTP ${tgRes.status}`;
        await recordIntegrationError(pool, {
          integration: 'telegram',
          action: 'healthcheck:getMe',
          message: msg,
          severity: 'error',
        });
        results.push({ integration: 'telegram', label: INTEGRATION_META.telegram.label, ok: false, detail: msg });
      }
    }
  } catch (err: any) {
    await recordIntegrationError(pool, {
      integration: 'telegram',
      action: 'healthcheck:getMe',
      message: err?.message || 'Koneksi Telegram Bot API gagal',
      severity: 'error',
    });
    results.push({ integration: 'telegram', label: INTEGRATION_META.telegram.label, ok: false, detail: err?.message || 'Gagal cek Telegram' });
  }

  // 5. AI Advisor check
  const aiKey = (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (aiKey) {
    await markIntegrationRecovered(pool, 'ai');
    results.push({ integration: 'ai', label: INTEGRATION_META.ai.label, ok: true, detail: 'API Key AI tersedia' });
  } else {
    results.push({ integration: 'ai', label: INTEGRATION_META.ai.label, ok: true, detail: 'Mode Smart Fallback lokal aktif (API key opsional)' });
  }

  return { checkedAt: new Date().toISOString(), results };
}

function classifyIntegrationFromMessage(msg: string): IntegrationKey {
  const lower = msg.toLowerCase();
  if (lower.includes('duitku') || lower.includes('invoice') || lower.includes('webhook')) return 'duitku';
  if (lower.includes('telegram') || lower.includes('bot')) return 'telegram';
  if (lower.includes('openrouter') || lower.includes('gemini') || lower.includes('ai ')) return 'ai';
  if (lower.includes('yahoo') || lower.includes('ticker') || lower.includes('market price')) return 'market_data';
  if (lower.includes('capi') || lower.includes('facebook') || lower.includes('pixel')) return 'meta_capi';
  if (lower.includes('otp') || lower.includes('reset password') || lower.includes('2fa')) return 'auth';
  if (lower.includes('smtp') || lower.includes('freeresend') || lower.includes('nodemailer') || lower.includes('[email')) return 'email';
  if (lower.includes('postgres') || lower.includes('supabase') || lower.includes('app_state') || lower.includes('db ')) return 'database';
  if (lower.includes('[cron]')) return 'cron';
  return 'server';
}

export function installGlobalErrorHooks(pool: any): void {
  if (hooksInstalled) return;
  hooksInstalled = true;

  // Register Email gateway telemetry hooks without circular import
  registerEmailTelemetry({
    onError: (p, info) => {
      recordIntegrationError(p || pool, {
        integration: 'email',
        action: info.action,
        message: info.message,
        details: info.details,
        severity: 'error',
        skipEmailDispatch: true, // Email transport itself is failing right now; save to open errors for scheduled digest / UI
      }).catch(() => {});
    },
    onSuccess: (p) => {
      markIntegrationRecovered(p || pool, 'email').catch(() => {});
    },
  });

  const origConsoleError = console.error.bind(console);
  console.error = (...args: any[]) => {
    origConsoleError(...args);
    if (isInsideErrorMonitor) return;
    isInsideErrorMonitor = true;
    try {
      const joined = args
        .map((a) => (a instanceof Error ? `${a.message}` : typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
      if (!joined.includes('[ErrorMonitor]')) {
        const isEmailLog = joined.includes('[Email Error]');
        const errObj = args.find((a) => a instanceof Error) as Error | undefined;
        const integration = isEmailLog ? 'email' : classifyIntegrationFromMessage(joined);
        recordIntegrationError(pool, {
          integration,
          action: isEmailLog ? 'email:send' : 'auto_console_error',
          message: joined,
          stack: errObj?.stack,
          severity: integration === 'database' || integration === 'duitku' ? 'critical' : 'error',
          skipEmailDispatch: isEmailLog,
        }).catch(() => {});
      }
    } catch {
      // Never break caller logging
    } finally {
      isInsideErrorMonitor = false;
    }
  };

  process.on('unhandledRejection', (reason: any) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    recordIntegrationError(pool, {
      integration: classifyIntegrationFromMessage(msg),
      action: 'process:unhandledRejection',
      message: msg,
      stack,
      severity: 'critical',
    }).catch(() => {});
  });

  process.on('uncaughtException', (err: Error) => {
    recordIntegrationError(pool, {
      integration: classifyIntegrationFromMessage(err?.message || ''),
      action: 'process:uncaughtException',
      message: err?.message || 'Uncaught exception',
      stack: err?.stack,
      severity: 'critical',
    }).catch(() => {});
  });
}
