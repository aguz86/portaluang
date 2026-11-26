import React, { useState, useEffect } from 'react';
import {
  Shield,
  Mail,
  Send,
  Loader2,
  Save,
  Key,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Lock
} from 'lucide-react';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { isSafeUrl, checkMaliciousContent } from '../../utils/security';
import { PluConnectedBadge } from '../../components/PluConnectedBadge';

interface EnvStatus {
  database: boolean;
  duitkuEnv: 'sandbox' | 'production';
  duitkuEnvSetInEnv: boolean;
  duitkuSandbox: boolean;
  duitkuProduction: boolean;
  smtp: boolean;
  freeResend: boolean;
  telegramBot: boolean;
  metaPixel: boolean;
  metaCapi: boolean;
  aiEngine: boolean;
  adminIpWhitelist: boolean;
  adminIpWhitelistIps: string[];
}

const DEFAULT_ENV_STATUS: EnvStatus = {
  database: false,
  duitkuEnv: 'sandbox',
  duitkuEnvSetInEnv: false,
  duitkuSandbox: false,
  duitkuProduction: false,
  smtp: false,
  freeResend: false,
  telegramBot: false,
  metaPixel: false,
  metaCapi: false,
  aiEngine: false,
  adminIpWhitelist: false,
  adminIpWhitelistIps: [],
};

const EnvStatusBadge: React.FC<{ active: boolean; labelActive?: string; labelInactive?: string }> = ({
  active,
  labelActive = 'CONNECTED',
  labelInactive = 'Belum diset di ENV',
}) => (
  <PluConnectedBadge
    connected={active}
    configured={false}
    size="sm"
    labelConnected={labelActive}
    labelUnconfigured={labelInactive}
  />
);

export const AdminSettings: React.FC = () => {
  const [maintenance, setMaintenance] = useState(false);
  const { settings, updateSettings } = useGlobalSettings();
  const [appName, setAppName] = useState(settings.appName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [appVersion, setAppVersion] = useState(settings.appVersion);
  const [aiName, setAiName] = useState(settings.aiName || 'Portal Uang Advisor');
  const [aiRoleTitle, setAiRoleTitle] = useState(settings.aiRoleTitle || 'AI Wealth Strategist');

  // 2FA State (no raw secret ever exposed in UI)
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [totpConfiguredViaEnv, setTotpConfiguredViaEnv] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync if external change happens
  useEffect(() => {
    setAppName(settings.appName);
    setSupportEmail(settings.supportEmail);
    setAppVersion(settings.appVersion);
    if (settings.aiName) setAiName(settings.aiName);
    if (settings.aiRoleTitle) setAiRoleTitle(settings.aiRoleTitle);
  }, [settings]);

  // Hero Section Settings
  const [heroTitle1, setHeroTitle1] = useState(settings.heroTitle1 || 'Tinggalkan Spreadsheet Rumit.');
  const [heroTitle2Prefix, setHeroTitle2Prefix] = useState(settings.heroTitle2Prefix || 'Kuasai Uang Anda dengan ');
  const [heroSubtitle, setHeroSubtitle] = useState(
    settings.heroSubtitle ||
      'Hentikan "bocor halus" seketika dengan sistem <strong class="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong class="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong class="text-emerald-300">AI Cerdas</strong>.'
  );
  const [heroFont, setHeroFont] = useState(settings.heroFont || 'Plus Jakarta Sans, sans-serif');

  const [messages, setMessages] = useState<{ [key: string]: { type: 'success' | 'error'; text: string } }>({});

  // Non-secret integration settings & read-only ENV status
  const [envStatus, setEnvStatus] = useState<EnvStatus>(DEFAULT_ENV_STATUS);
  const [duitkuEnv, setDuitkuEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [duitkuSandboxWhitelist, setDuitkuSandboxWhitelist] = useState('');
  const [adminIpWhitelist, setAdminIpWhitelist] = useState('');

  // Email Gateway non-secret preferences
  const [emailProvider, setEmailProvider] = useState<'auto' | 'freeresend' | 'smtp'>('smtp');
  const [emailFrom, setEmailFrom] = useState('');
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(true);
  const [emailWelcomeEnabled, setEmailWelcomeEnabled] = useState(true);
  const [emailRenewalReminderEnabled, setEmailRenewalReminderEnabled] = useState(true);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [detectedClientIp, setDetectedClientIp] = useState('');
  const [socials, setSocials] = useState({
    whatsapp: '',
    tiktok: '',
    threads: '',
    instagram: '',
    youtube: '',
    facebook: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/settings', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          window.location.href = '/admin/login?expired=1';
          return;
        }
        const data = await res.json();
        if (data.envStatus) {
          setEnvStatus({ ...DEFAULT_ENV_STATUS, ...data.envStatus });
          setDuitkuEnv(data.envStatus.duitkuEnv === 'production' ? 'production' : 'sandbox');
        }
        if (data.detectedClientIp) {
          setDetectedClientIp(String(data.detectedClientIp));
        }
        if (data.success && data.data) {
          setDuitkuSandboxWhitelist(data.data.duitkuSandboxWhitelist || '');
          setAdminIpWhitelist(data.data.adminIpWhitelist || '');
          if (data.data.emailProvider) setEmailProvider(data.data.emailProvider);
          if (data.data.emailFrom) setEmailFrom(data.data.emailFrom);
          if (data.data.emailOtpEnabled !== undefined) setEmailOtpEnabled(Boolean(data.data.emailOtpEnabled));
          if (data.data.emailWelcomeEnabled !== undefined) setEmailWelcomeEnabled(Boolean(data.data.emailWelcomeEnabled));
          if (data.data.emailRenewalReminderEnabled !== undefined) {
            setEmailRenewalReminderEnabled(Boolean(data.data.emailRenewalReminderEnabled));
          }
          setMaintenance(data.data.maintenance || false);
          if (data.data.aiName) setAiName(data.data.aiName);
          if (data.data.aiRoleTitle) setAiRoleTitle(data.data.aiRoleTitle);
          if (data.data.heroTitle1) setHeroTitle1(data.data.heroTitle1);
          if (data.data.heroTitle2Prefix) setHeroTitle2Prefix(data.data.heroTitle2Prefix);
          if (data.data.heroSubtitle) setHeroSubtitle(data.data.heroSubtitle);
          if (data.data.heroFont) setHeroFont(data.data.heroFont);
          if (data.data.socials) {
            setSocials({
              whatsapp: data.data.socials.whatsapp || '',
              tiktok: data.data.socials.tiktok || '',
              threads: data.data.socials.threads || '',
              instagram: data.data.socials.instagram || '',
              youtube: data.data.socials.youtube || '',
              facebook: data.data.socials.facebook || '',
            });
          }
        }

        const res2fa = await fetch('/api/admin/2fa/setup', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res2fa.ok) {
          const data2fa = await res2fa.json();
          setQrCodeUrl(data2fa.qrCodeUrl || '');
          setIs2FAEnabled(Boolean(data2fa.enabled));
          setTotpConfiguredViaEnv(Boolean(data2fa.configuredViaEnv));
        }
      } catch (err) {
        console.error('Failed to fetch settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSection = async (sectionId: string, successMessage: string) => {
    setMessages((prev) => ({ ...prev, [sectionId]: undefined } as any));

    for (const [platform, url] of Object.entries(socials)) {
      if (url && typeof url === 'string') {
        const trimmed = url.trim();
        if (!isSafeUrl(trimmed) || (!trimmed.startsWith('https://') && !trimmed.startsWith('http://'))) {
          setMessages((prev) => ({
            ...prev,
            [sectionId]: { type: 'error', text: `Link ${platform} tidak valid atau berisiko keamanan.` },
          }));
          return false;
        }
        const check = checkMaliciousContent(trimmed);
        if (check.isMalicious) {
          setMessages((prev) => ({
            ...prev,
            [sectionId]: { type: 'error', text: `Link ${platform} ditolak: terdeteksi pola berbahaya.` },
          }));
          return false;
        }
      }
    }

    try {
      const payload = {
        duitkuSandboxWhitelist,
        adminIpWhitelist,
        emailProvider,
        emailFrom: emailFrom.trim(),
        emailOtpEnabled,
        emailWelcomeEnabled,
        emailRenewalReminderEnabled,
        maintenance,
        socials,
        appName,
        appVersion,
        supportEmail,
        aiName,
        aiRoleTitle,
        heroTitle1,
        heroTitle2Prefix,
        heroSubtitle,
        heroFont,
      };
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const resData = await res.json().catch(() => ({}));
      if (resData.envStatus) {
        setEnvStatus({ ...DEFAULT_ENV_STATUS, ...resData.envStatus });
      }
      if (res.ok) {
        updateSettings({
          appName,
          appVersion,
          supportEmail,
          aiName,
          aiRoleTitle,
          heroTitle1,
          heroTitle2Prefix,
          heroSubtitle,
          heroFont,
        });
        setMessages((prev) => ({ ...prev, [sectionId]: { type: 'success', text: successMessage } }));
        return true;
      } else {
        setMessages((prev) => ({
          ...prev,
          [sectionId]: { type: 'error', text: resData.error || 'Gagal menyimpan pengaturan.' },
        }));
        return false;
      }
    } catch {
      setMessages((prev) => ({
        ...prev,
        [sectionId]: { type: 'error', text: 'Koneksi gagal. Periksa koneksi internet Anda.' },
      }));
      return false;
    }
  };

  const handleTestEmail = async () => {
    const target = (testEmailTarget || supportEmail || '').trim();
    if (!target || !target.includes('@')) {
      setMessages((prev) => ({
        ...prev,
        email: { type: 'error', text: 'Masukkan alamat email tujuan untuk uji coba.' },
      }));
      return;
    }
    setTestingEmail(true);
    try {
      const saved = await handleSaveSection('email', 'Pengaturan email disimpan, mengirim uji coba...');
      if (!saved) return;
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toEmail: target }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => ({
          ...prev,
          email: { type: 'success', text: data.message || `Email uji coba terkirim ke ${target}!` },
        }));
      } else {
        setMessages((prev) => ({
          ...prev,
          email: { type: 'error', text: data.error || 'Gagal mengirim email uji coba.' },
        }));
      }
    } catch {
      setMessages((prev) => ({
        ...prev,
        email: { type: 'error', text: 'Koneksi gagal saat mengirim uji coba email.' },
      }));
    } finally {
      setTestingEmail(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleVerify2FA = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: totpToken }),
      });
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(true);
        setTwoFaMessage({ type: 'success', text: 'Google Authenticator 2FA berhasil diaktifkan!' });
        setTotpToken('');
      } else {
        setTwoFaMessage({ type: 'error', text: 'Token tidak valid. Silakan coba lagi.' });
      }
    } catch {
      setTwoFaMessage({ type: 'error', text: 'Koneksi gagal saat memverifikasi 2FA.' });
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${currentOrigin}/api/payment/duitku/callback`;
  const returnUrl = `${currentOrigin}/checkout?payment=success`;

  const isDuitkuActiveEnvConfigured = duitkuEnv === 'production' ? envStatus.duitkuProduction : envStatus.duitkuSandbox;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">System & Gateway Settings</h1>
        <p className="text-sm text-stone-400 mt-1">
          Seluruh private key, secret key, API key, token, dan merchant credential dikelola eksklusif melalui Environment Variables server (tidak pernah disimpan atau diinput via dashboard).
        </p>
      </div>

      {loading && (
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center gap-3 text-xs text-stone-400">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          Memuat konfigurasi & status Environment Variables...
        </div>
      )}

      <div className="space-y-6">
        {/* STATUS KUNCI INTEGRASI (ENVIRONMENT VARIABLES ONLY) */}
        <div className="bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Status Kredensial Integrasi (Environment Variables)
            </h3>
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full w-fit">
              Zero-Secret Dashboard Policy
            </span>
          </div>
          <p className="text-xs text-stone-400 mb-5">
            Demi keamanan tingkat produksi, tidak ada formulir input untuk secret key, merchant key, token API, atau password SMTP di dashboard. Atur variabel berikut pada Environment / Secret panel hosting Anda (Render / VPS / Cloud Run).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-200">Supabase PostgreSQL</div>
                <div className="text-[11px] font-mono text-stone-500">DATABASE_URL</div>
              </div>
              <EnvStatusBadge active={envStatus.database} />
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-200">AI Advisor Engine</div>
                <div className="text-[11px] font-mono text-stone-500">OPENROUTER_API_KEY / GEMINI_API_KEY</div>
              </div>
              <EnvStatusBadge active={envStatus.aiEngine} />
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-200">Telegram Bot Token</div>
                <div className="text-[11px] font-mono text-stone-500">TELEGRAM_BOT_TOKEN</div>
              </div>
              <EnvStatusBadge active={envStatus.telegramBot} />
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-stone-200">Meta Pixel & CAPI</div>
                <div className="text-[11px] font-mono text-stone-500">META_PIXEL_ID / META_CAPI_TOKEN</div>
              </div>
              <EnvStatusBadge active={envStatus.metaPixel && envStatus.metaCapi} />
            </div>
          </div>
        </div>

        {/* DUITKU PAYMENT GATEWAY CONFIGURATION */}
        <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500/15 border-b border-l border-amber-500/30 rounded-bl-xl text-[11px] font-bold text-amber-400">
            Duitku Official Gateway
          </div>

          <h3 className="text-lg font-bold text-stone-100 mb-2 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            Integrasi Duitku Payment Gateway
          </h3>
          <p className="text-xs text-stone-400 mb-6">
            Mode aktif (<code className="text-amber-300">DUITKU_ENV</code>) maupun Merchant Code &amp; API Key Duitku dibaca eksklusif dari Environment Variables server (<code className="text-amber-300">.env</code>) dan tidak dapat diubah melalui dashboard.
          </p>

          <div className="space-y-4 mt-4">
            {messages['duitku'] && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  messages['duitku'].type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                {messages['duitku'].type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <p className="text-sm font-medium">{messages['duitku'].text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-300 uppercase">
                    Mode Aktif (Read-Only ENV)
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                      duitkuEnv === 'production'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {duitkuEnv === 'production' ? 'PRODUCTION / LIVE' : 'SANDBOX / TESTING'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-stone-500 leading-relaxed">
                  ENV: DUITKU_ENV=&quot;{duitkuEnv}&quot;{' '}
                  {!envStatus.duitkuEnvSetInEnv && '(default sandbox karena DUITKU_ENV kosong)'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-300 uppercase">
                    Kredensial ({duitkuEnv})
                  </span>
                  <EnvStatusBadge active={isDuitkuActiveEnvConfigured} />
                </div>
                <div className="text-[11px] font-mono text-stone-500 leading-relaxed">
                  {duitkuEnv === 'production'
                    ? 'ENV: DUITKU_PRODUCTION_MERCHANT_CODE & DUITKU_PRODUCTION_API_KEY'
                    : 'ENV: DUITKU_SANDBOX_MERCHANT_CODE & DUITKU_SANDBOX_API_KEY'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Sandbox Whitelist Emails (Opsional, pisahkan koma)
              </label>
              <input
                type="text"
                value={duitkuSandboxWhitelist}
                onChange={(e) => setDuitkuSandboxWhitelist(e.target.value)}
                placeholder="tester@domain.com, qa@domain.com"
                className="block w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800/80 space-y-3 mt-4 text-xs">
              <div className="text-stone-300 font-bold flex items-center justify-between">
                <span>URL Callback Webhook Duitku (Salin ke Dashboard Duitku):</span>
                {copiedUrl === 'callback' && <span className="text-emerald-400 font-normal">Tersalin!</span>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={callbackUrl}
                  className="w-full bg-stone-900 border border-stone-800 px-3 py-2 rounded-lg font-mono text-[11px] text-amber-300"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(callbackUrl, 'callback')}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold shrink-0"
                >
                  Salin
                </button>
              </div>

              <div className="text-stone-300 font-bold flex items-center justify-between pt-2 border-t border-stone-900">
                <span>URL Return / Redirect Selesai Bayar:</span>
                {copiedUrl === 'return' && <span className="text-emerald-400 font-normal">Tersalin!</span>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={returnUrl}
                  className="w-full bg-stone-900 border border-stone-800 px-3 py-2 rounded-lg font-mono text-[11px] text-stone-300"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(returnUrl, 'return')}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold shrink-0"
                >
                  Salin
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => handleSaveSection('duitku', 'Whitelist Sandbox Duitku berhasil disimpan!')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
              >
                <Save className="w-4 h-4" /> Simpan Whitelist Duitku
              </button>
            </div>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-stone-400" /> General Configuration
          </h3>
          <div className="space-y-4">
            {messages['general'] && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  messages['general'].type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                {messages['general'].type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <p className="text-sm font-medium">{messages['general'].text}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-300">App Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300">
                  Nama Asisten AI (Default: Portal Uang Advisor)
                </label>
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Portal Uang Advisor"
                  className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100 font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300">Gelar / Role AI</label>
                <input
                  type="text"
                  value={aiRoleTitle}
                  onChange={(e) => setAiRoleTitle(e.target.value)}
                  placeholder="AI Wealth Strategist"
                  className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Support Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">App Version</label>
              <input
                type="text"
                value={appVersion}
                onChange={(e) => setAppVersion(e.target.value)}
                placeholder="e.g. 1.2.0"
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button
              type="button"
              onClick={() => handleSaveSection('general', 'General Configuration berhasil disimpan!')}
              className="px-5 py-2.5 bg-stone-100 hover:bg-white text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
            >
              <Save className="w-4 h-4" /> Simpan General Config
            </button>
          </div>
        </div>

        {/* Hero Section Configuration */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Landing Page Text & Typography</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {messages['hero'] && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  messages['hero'].type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                {messages['hero'].type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <p className="text-sm font-medium">{messages['hero'].text}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-stone-300">Pilihan Font Headline</label>
              <select
                value={heroFont}
                onChange={(e) => setHeroFont(e.target.value)}
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50"
              >
                <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans (Modern Clean)</option>
                <option value="'Outfit', sans-serif">Outfit (Tech / Start-up)</option>
                <option value="ui-sans-serif, system-ui, -apple-system, sans-serif">System Default</option>
                <option value="'Georgia', serif">Georgia (Serif Klasik)</option>
                <option value="ui-monospace, monospace">Monospace (Terminal)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-300">Headline Baris 1</label>
                <input
                  type="text"
                  value={heroTitle1}
                  onChange={(e) => setHeroTitle1(e.target.value)}
                  placeholder="Tinggalkan Spreadsheet Rumit."
                  className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-300">Headline Baris 2 (Prefix)</label>
                <input
                  type="text"
                  value={heroTitle2Prefix}
                  onChange={(e) => setHeroTitle2Prefix(e.target.value)}
                  placeholder="Kuasai Uang Anda dengan "
                  className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-300">
                Subtitle Bawah Headline (Bisa pakai HTML)
              </label>
              <p className="text-xs text-stone-500 mt-1 mb-2">
                Contoh formatting:{' '}
                <code className="bg-stone-950 px-1 py-0.5 rounded text-amber-400">
                  &lt;strong class="text-amber-400"&gt;Teks Kuning&lt;/strong&gt;
                </code>
              </p>
              <textarea
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                rows={4}
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button
              type="button"
              onClick={() => handleSaveSection('hero', 'Teks & Font Landing Page berhasil disimpan!')}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
            >
              <Save className="w-4 h-4" /> Simpan Landing Page
            </button>
          </div>
        </div>

        {/* EMAIL GATEWAY: VPS SMTP (RP 0 SELAMANYA) & SELF-HOSTED FREERESEND */}
        <div className="bg-stone-900 border border-cyan-500/30 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1 bg-cyan-500/15 border-b border-l border-cyan-500/30 rounded-bl-xl text-[11px] font-bold text-cyan-300">
            Rp 0 Selamanya • 1 App Slot + Supabase
          </div>

          <h3 className="text-lg font-bold text-stone-100 mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            Email Gateway (SMTP VPS Sendiri & FreeResend Self-Hosted)
          </h3>
          <p className="text-xs text-stone-400 mb-6">
            Host SMTP, username, password, dan API key FreeResend dibaca otomatis dari Environment Variables (<code className="text-cyan-300">SMTP_*</code> / <code className="text-cyan-300">RESEND_*</code>). Seluruh template email, status toggle notifikasi, dan log pengiriman tersimpan di Supabase.
          </p>

          {messages['email'] && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 mb-5 ${
                messages['email'].type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {messages['email'].type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <p className="text-sm font-medium">{messages['email'].text}</p>
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-200">SMTP Server VPS</div>
                  <div className="text-[11px] font-mono text-stone-500">SMTP_HOST, SMTP_USER, SMTP_PASS</div>
                </div>
                <EnvStatusBadge active={envStatus.smtp} />
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-200">FreeResend HTTP API</div>
                  <div className="text-[11px] font-mono text-stone-500">RESEND_BASE_URL, RESEND_API_KEY</div>
                </div>
                <EnvStatusBadge active={envStatus.freeResend} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                  Mode Pengiriman
                </label>
                <select
                  value={emailProvider}
                  onChange={(e) => setEmailProvider(e.target.value as 'auto' | 'freeresend' | 'smtp')}
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm focus:border-cyan-500 outline-none"
                >
                  <option value="smtp">SMTP VPS Sendiri (Postfix / Stalwart / Mailcow - Rp 0)</option>
                  <option value="freeresend">Self-Hosted FreeResend HTTP API (di VPS Anda)</option>
                  <option value="auto">Otomatis (FreeResend VPS jika diset, fallback SMTP VPS)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                  Alamat Pengirim Tampilan (From)
                </label>
                <input
                  type="text"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  placeholder="Portal Uang <noreply@domainanda.com>"
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm font-mono focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer text-xs text-stone-200">
                <input
                  type="checkbox"
                  checked={emailOtpEnabled}
                  onChange={(e) => setEmailOtpEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
                <span>Wajib OTP Email saat Daftar</span>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer text-xs text-stone-200">
                <input
                  type="checkbox"
                  checked={emailWelcomeEnabled}
                  onChange={(e) => setEmailWelcomeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
                <span>Email Selamat Datang</span>
              </label>
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer text-xs text-stone-200">
                <input
                  type="checkbox"
                  checked={emailRenewalReminderEnabled}
                  onChange={(e) => setEmailRenewalReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
                <span>Pengingat Perpanjangan (H-3)</span>
              </label>
            </div>

            <div className="pt-4 border-t border-stone-800/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex gap-2 flex-1">
                <input
                  type="email"
                  value={testEmailTarget}
                  onChange={(e) => setTestEmailTarget(e.target.value)}
                  placeholder="Email tujuan test (mis. emailanda@gmail.com)"
                  className="flex-1 px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-xs font-mono"
                />
                <button
                  type="button"
                  disabled={testingEmail}
                  onClick={handleTestEmail}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 font-bold rounded-xl flex items-center gap-2 text-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  {testingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Uji Kirim Email</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleSaveSection('email', 'Konfigurasi Email Gateway berhasil disimpan!')}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shrink-0"
              >
                <Save className="w-4 h-4" /> Simpan Email Gateway
              </button>
            </div>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" /> Social Media Links
          </h3>
          {messages['social'] && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 mb-4 ${
                messages['social'].type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {messages['social'].type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <p className="text-sm font-medium">{messages['social'].text}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300">WhatsApp</label>
              <input
                type="text"
                value={socials.whatsapp}
                onChange={(e) => setSocials({ ...socials, whatsapp: e.target.value })}
                placeholder="https://wa.me/..."
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">TikTok</label>
              <input
                type="text"
                value={socials.tiktok}
                onChange={(e) => setSocials({ ...socials, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@..."
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Threads</label>
              <input
                type="text"
                value={socials.threads}
                onChange={(e) => setSocials({ ...socials, threads: e.target.value })}
                placeholder="https://threads.net/@..."
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Instagram</label>
              <input
                type="text"
                value={socials.instagram}
                onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
                placeholder="https://instagram.com/..."
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">YouTube</label>
              <input
                type="text"
                value={socials.youtube}
                onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
                placeholder="https://youtube.com/..."
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Facebook</label>
              <input
                type="text"
                value={socials.facebook}
                onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
                placeholder="https://facebook.com/..."
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button
              type="button"
              onClick={() => handleSaveSection('social', 'Tautan Social Media berhasil diperbarui!')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
            >
              <Save className="w-4 h-4" /> Simpan Social Media
            </button>
          </div>
        </div>

        <div className="bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Google Authenticator (2FA)
          </h3>
          <p className="text-sm text-stone-400 mb-6">
            Amankan akses admin dengan verifikasi dua langkah melalui aplikasi Google Authenticator atau Authy. Secret 2FA dikelola melalui Environment Variable <code className="text-emerald-400">ADMIN_TOTP_SECRET</code> dan tidak pernah ditampilkan sebagai teks polos di dashboard.
          </p>

          {twoFaMessage && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 mb-6 ${
                twoFaMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {twoFaMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <p className="text-sm font-medium">{twoFaMessage.text}</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 bg-white p-4 rounded-xl flex items-center justify-center shrink-0 aspect-square">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code 2FA" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-stone-100 animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-stone-400 text-sm">Memuat QR...</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-stone-400 uppercase font-bold tracking-wider">Konfigurasi Secret Key 2FA</p>
                  <p className="text-[11px] font-mono text-stone-500 mt-1">
                    ENV: ADMIN_TOTP_SECRET (disembunyikan dari UI demi keamanan)
                  </p>
                </div>
                <EnvStatusBadge
                  active={totpConfiguredViaEnv}
                  labelActive="CONNECTED"
                  labelInactive="Sesi Ephemeral"
                />
              </div>

              {!is2FAEnabled && (
                <div className="pt-2 space-y-3">
                  <label className="block text-sm font-medium text-stone-300">
                    Masukkan 6 digit kode token untuk aktivasi:
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono tracking-[0.25em] text-lg text-center focus:border-emerald-500 focus:outline-none"
                      placeholder="123456"
                    />
                    <button
                      type="button"
                      onClick={handleVerify2FA}
                      disabled={totpToken.length !== 6}
                      className="px-6 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verifikasi
                    </button>
                  </div>
                </div>
              )}

              {is2FAEnabled && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">Autentikasi Dua Langkah (2FA) telah aktif dan terverifikasi.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Keamanan Admin
          </h3>

          {messages['security'] && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 mb-6 ${
                messages['security'].type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {messages['security'].type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <p className="text-sm font-medium">{messages['security'].text}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-stone-200">Admin IP Whitelist (ENV Server)</div>
                  <div className="text-[11px] font-mono text-stone-500">ENV: ADMIN_IP_WHITELIST (pisahkan koma)</div>
                </div>
                <EnvStatusBadge
                  active={envStatus.adminIpWhitelist}
                  labelActive="AKTIF DI ENV"
                  labelInactive="Belum diset di ENV"
                />
              </div>

              {envStatus.adminIpWhitelistIps.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {envStatus.adminIpWhitelistIps.map((ip) => (
                    <span
                      key={ip}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-mono text-[11px]"
                    >
                      {ip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-400">
                  Tambahkan <code className="text-amber-300">ADMIN_IP_WHITELIST=&quot;{detectedClientIp || 'IP_ANDA'}&quot;</code> pada file <code className="text-amber-300">.env</code> server untuk mengunci akses login Admin dari IP tertentu via ENV.
                </p>
              )}

              {detectedClientIp && (
                <div className="pt-2 border-t border-stone-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-stone-400">
                    IP Anda saat ini: <span className="font-mono text-amber-300 font-bold">{detectedClientIp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(detectedClientIp, 'clientIp')}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-bold"
                    >
                      {copiedUrl === 'clientIp' ? 'IP Tersalin!' : 'Salin IP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const existing = adminIpWhitelist
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (!existing.includes(detectedClientIp)) {
                          setAdminIpWhitelist([...existing, detectedClientIp].join(', '));
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold"
                    >
                      + Tambah IP ke Daftar Bawah
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-300 mb-2">
                Admin IP Whitelist Tambahan (Dashboard)
              </label>
              <p className="text-xs text-stone-500 mb-2">
                Digabungkan dengan <code className="text-amber-300">ADMIN_IP_WHITELIST</code> di ENV. Pisahkan dengan koma (contoh: 114.79.20.150, 192.168.1.1). IP lokal (127.0.0.1, localhost) otomatis diizinkan. Kosongkan keduanya (ENV &amp; sini) jika ingin mengizinkan semua IP.
              </p>
              <input
                type="text"
                value={adminIpWhitelist}
                onChange={(e) => setAdminIpWhitelist(e.target.value)}
                placeholder="114.79.20.150"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex justify-end border-t border-stone-800 pt-6">
              <button
                onClick={() => handleSaveSection('security', 'Pengaturan Keamanan Admin berhasil diperbarui!')}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
              >
                <Save className="w-4 h-4" /> Simpan Keamanan Admin
              </button>
            </div>
          </div>
        </div>

        <div className="bg-stone-900 border border-rose-500/20 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-rose-500 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl">
            <div>
              <p className="font-bold text-stone-200">Maintenance Mode</p>
              <p className="text-sm text-stone-400 mt-1">
                Menutup akses non-admin sementara. Atur pesan khusus, notifikasi kompensasi & tambah hari di menu Maintenance & Kompensasi.
              </p>
              <a
                href="/admin/maintenance"
                className="inline-block text-xs font-bold text-amber-400 hover:underline mt-2"
              >
                Kelola Maintenance, Kompensasi & Tambah Hari →
              </a>
            </div>
            <button
              type="button"
              onClick={() => setMaintenance(!maintenance)}
              className={`px-4 py-2 font-bold rounded-lg transition-colors shrink-0 ${
                maintenance ? 'bg-rose-500 text-stone-950' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {maintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          {messages['all'] && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 mr-4 ${
                messages['all'].type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}
            >
              {messages['all'].type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <p className="text-sm font-medium">{messages['all'].text}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => handleSaveSection('all', 'Semua perubahan berhasil disimpan!')}
            className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <Save className="w-5 h-5" /> Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};
