import { Shield } from 'lucide-react';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import React, { useState, useEffect } from 'react';
import { Save, Settings2, Key, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { isSafeUrl, checkMaliciousContent } from '../../utils/security';

export const AdminSettings: React.FC = () => {
  const [maintenance, setMaintenance] = useState(false);
  const { settings, updateSettings } = useGlobalSettings();
  const [appName, setAppName] = useState(settings.appName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [appVersion, setAppVersion] = useState(settings.appVersion);
  const [aiName, setAiName] = useState(settings.aiName || 'Portal Uang Advisor');
  const [aiRoleTitle, setAiRoleTitle] = useState(settings.aiRoleTitle || 'AI Wealth Strategist');
  
  // 2FA State
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [twoFaMessage, setTwoFaMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
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
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle || 'Hentikan "bocor halus" seketika dengan sistem <strong class="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong class="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong class="text-emerald-300">AI Cerdas</strong>.');
  const [heroFont, setHeroFont] = useState(settings.heroFont || 'Plus Jakarta Sans, sans-serif');

  const [pixelId, setPixelId] = useState('');
  const [capiToken, setCapiToken] = useState('');
  const [duitkuMerchantCode, setDuitkuMerchantCode] = useState('');
  const [duitkuApiKey, setDuitkuApiKey] = useState('');
  const [duitkuEnv, setDuitkuEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [socials, setSocials] = useState({
    whatsapp: '',
    tiktok: '',
    threads: '',
    instagram: '',
    youtube: '',
    facebook: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success && data.data) {
          setPixelId(data.data.pixelId || '');
          setCapiToken(data.data.capiToken || '');
          setDuitkuMerchantCode(data.data.duitkuMerchantCode || '');
          setDuitkuApiKey(data.data.duitkuApiKey || '');
          setDuitkuEnv(data.data.duitkuEnv || 'sandbox');
          setTelegramBotToken(data.data.telegramBotToken || '');
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
              facebook: data.data.socials.facebook || ''
            });
          }

        }

        // Fetch 2FA Setup
        const res2fa = await fetch('/api/admin/2fa/setup', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res2fa.ok) {
          const data2fa = await res2fa.json();
          setQrCodeUrl(data2fa.qrCodeUrl);
          setTotpSecret(data2fa.secret);
          setIs2FAEnabled(data2fa.enabled);
        }

      } catch (err) {
        console.error('Failed to fetch settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security validation on social URLs to prevent phishing links or judi online redirects
    for (const [platform, url] of Object.entries(socials)) {
      if (url && typeof url === 'string') {
        const trimmed = (url as string).trim();
        if (!isSafeUrl(trimmed) || (!trimmed.startsWith('https://') && !trimmed.startsWith('http://'))) {
          setMessage({ type: 'error', text: `Link ${platform} tidak valid atau berisiko keamanan (harus menggunakan HTTPS).` });
          return;
        }
        const check = checkMaliciousContent(trimmed);
        if (check.isMalicious) {
          setMessage({ type: 'error', text: `Link ${platform} ditolak: terdeteksi pola berbahaya.` });
          return;
        }
      }
    }

    try {
      const payload = {
        pixelId,
        capiToken,
        duitkuMerchantCode,
        duitkuApiKey,
        duitkuEnv,
        telegramBotToken,
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
        heroFont
      };
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        updateSettings({ 
          appName, appVersion, supportEmail, aiName, aiRoleTitle,
          heroTitle1, heroTitle2Prefix, heroSubtitle, heroFont
        });
        setMessage({ type: 'success', text: 'Konfigurasi Sistem & Pengaturan berhasil diverifikasi dan disimpan!' });
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error menyimpan pengaturan.' });
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
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: totpToken })
      });
      const data = await res.json();
      if (data.success) {
        setIs2FAEnabled(true);
        setTwoFaMessage({ type: 'success', text: 'Google Authenticator 2FA berhasil diaktifkan!' });
        setTotpToken('');
      } else {
        setTwoFaMessage({ type: 'error', text: 'Token tidak valid. Silakan coba lagi.' });
      }
    } catch (err) {
      setTwoFaMessage({ type: 'error', text: 'Koneksi gagal saat memverifikasi 2FA.' });
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${currentOrigin}/api/payment/duitku/callback`;
  const returnUrl = `${currentOrigin}/checkout?payment=success`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">System & Gateway Settings</h1>
        <p className="text-sm text-stone-400 mt-1">Konfigurasi parameter aplikasi dan integrasi Payment Gateway Duitku.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-6">
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
            Seluruh transaksi pendaftaran dan perpanjangan langganan diamankan dengan enkripsi 256-bit dan verifikasi hash signature MD5 Duitku.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Duitku Merchant Code
                </label>
                <input 
                  type="text" 
                  value={duitkuMerchantCode} 
                  onChange={(e) => setDuitkuMerchantCode(e.target.value)} 
                  placeholder="D12345 (Dari Dashboard Duitku)" 
                  className="mt-1.5 block w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-amber-500 focus:outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                  Duitku Environment Mode
                </label>
                <select
                  value={duitkuEnv}
                  onChange={(e) => setDuitkuEnv(e.target.value as 'sandbox' | 'production')}
                  className="mt-1.5 block w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                >
                  <option value="sandbox">Sandbox / Testing (sandbox.duitku.com)</option>
                  <option value="production">Production / Live (passport.duitku.com)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300">
                Duitku Merchant API Key
              </label>
              <input 
                type="password" 
                value={duitkuApiKey} 
                onChange={(e) => setDuitkuApiKey(e.target.value)} 
                placeholder="abcdef0123456789abcdef0123456789" 
                className="mt-1.5 block w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-amber-500 focus:outline-none" 
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Kunci API rahasia untuk menghasilkan & memvalidasi MD5 signature pada request inquiry dan IPN webhook.
              </p>
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
              <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm">
                <Save className="w-4 h-4" /> Simpan Pengaturan Duitku
              </button>
            </div>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-stone-400" /> General Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300">App Name</label>
              <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300">Nama Asisten AI (Default: Portal Uang Advisor)</label>
                <input type="text" value={aiName} onChange={(e) => setAiName(e.target.value)} placeholder="Portal Uang Advisor" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100 font-semibold" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300">Gelar / Role AI</label>
                <input type="text" value={aiRoleTitle} onChange={(e) => setAiRoleTitle(e.target.value)} placeholder="AI Wealth Strategist" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Support Email</label>
              <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">App Version</label>
              <input type="text" value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder="e.g. 1.2.0" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button type="submit" className="px-5 py-2.5 bg-stone-100 hover:bg-white text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm">
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
                <input type="text" value={heroTitle1} onChange={(e) => setHeroTitle1(e.target.value)} placeholder="Tinggalkan Spreadsheet Rumit." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-300">Headline Baris 2 (Prefix)</label>
                <input type="text" value={heroTitle2Prefix} onChange={(e) => setHeroTitle2Prefix(e.target.value)} placeholder="Kuasai Uang Anda dengan " className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-stone-300">Subtitle Bawah Headline (Bisa pakai HTML)</label>
              <p className="text-xs text-stone-500 mt-1 mb-2">Contoh formatting: <code className="bg-stone-950 px-1 py-0.5 rounded text-amber-400">&lt;strong class="text-amber-400"&gt;Teks Kuning&lt;/strong&gt;</code></p>
              <textarea 
                value={heroSubtitle} 
                onChange={(e) => setHeroSubtitle(e.target.value)} 
                rows={4}
                className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button type="submit" className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl flex items-center gap-2 transition-colors text-sm">
              <Save className="w-4 h-4" /> Simpan Landing Page
            </button>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" /> Marketing & External API Keys
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300">Meta Pixel ID</label>
              <input type="text" value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="123456789012345" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Meta Conversions API Token</label>
              <input type="password" value={capiToken} onChange={(e) => setCapiToken(e.target.value)} placeholder="EAAB..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Telegram Bot Token</label>
              <input type="password" value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="123456789:ABCDEF..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm">
              <Save className="w-4 h-4" /> Simpan API Keys
            </button>
          </div>
        </div>


        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" /> Social Media Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-300">WhatsApp</label>
              <input type="text" value={socials.whatsapp} onChange={(e) => setSocials({...socials, whatsapp: e.target.value})} placeholder="https://wa.me/..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">TikTok</label>
              <input type="text" value={socials.tiktok} onChange={(e) => setSocials({...socials, tiktok: e.target.value})} placeholder="https://tiktok.com/@..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Threads</label>
              <input type="text" value={socials.threads} onChange={(e) => setSocials({...socials, threads: e.target.value})} placeholder="https://threads.net/@..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Instagram</label>
              <input type="text" value={socials.instagram} onChange={(e) => setSocials({...socials, instagram: e.target.value})} placeholder="https://instagram.com/..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">YouTube</label>
              <input type="text" value={socials.youtube} onChange={(e) => setSocials({...socials, youtube: e.target.value})} placeholder="https://youtube.com/..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Facebook</label>
              <input type="text" value={socials.facebook} onChange={(e) => setSocials({...socials, facebook: e.target.value})} placeholder="https://facebook.com/..." className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-stone-800/60">
            <button type="submit" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm">
              <Save className="w-4 h-4" /> Simpan Social Media
            </button>
          </div>
        </div>

        <div className="bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Google Authenticator (2FA)
          </h3>
          <p className="text-sm text-stone-400 mb-6">
            Amankan akses admin dengan verifikasi dua langkah melalui aplikasi Google Authenticator atau Authy.
          </p>

          {twoFaMessage && (
            <div className={`p-4 rounded-xl flex items-center gap-3 mb-6 ${
              twoFaMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}>
              {twoFaMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
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
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                <p className="text-xs text-stone-400 mb-1 uppercase font-bold tracking-wider">Secret Key</p>
                <p className="font-mono text-amber-400 text-lg tracking-[0.2em]">{totpSecret || '...'}</p>
                <p className="text-[11px] text-stone-500 mt-2">
                  Jika Anda tidak dapat memindai kode QR, masukkan Secret Key ini ke aplikasi authenticator.
                </p>
              </div>

              {!is2FAEnabled && (
                <div className="pt-4 space-y-3">
                  <label className="block text-sm font-medium text-stone-300">
                    Masukkan 6 digit kode token:
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

        <div className="bg-stone-900 border border-rose-500/20 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-rose-500 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </h3>
          <div className="flex items-center justify-between p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl">
            <div>
              <p className="font-bold text-stone-200">Maintenance Mode</p>
              <p className="text-sm text-stone-400 mt-1">Disables access for all non-admin users.</p>
            </div>
            <button 
              type="button"
              onClick={() => setMaintenance(!maintenance)}
              className={`px-4 py-2 font-bold rounded-lg transition-colors ${maintenance ? 'bg-rose-500 text-stone-950' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}
            >
              {maintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors">
            <Save className="w-5 h-5" /> Save All Changes
          </button>
        </div>
      </form>
    </div>
  );
};
