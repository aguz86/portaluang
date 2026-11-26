import React, { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
  Link,
  Radio,
  Lock,
  Webhook,
  Users,
  Info,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { PluConnectedBadge } from '../../components/PluConnectedBadge';

interface WebhookStatus {
  url: string;
  isConfiguredOnTelegram: boolean;
  isMatch: boolean;
  pendingUpdateCount: number;
  lastErrorMessage?: string;
  lastErrorDate?: number;
}

export const AdminTelegram: React.FC = () => {
  const [message, setMessage] = useState('');
  const [configured, setConfigured] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [linkedUsersCount, setLinkedUsersCount] = useState(0);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [suggestedWebhookUrl, setSuggestedWebhookUrl] = useState(`${window.location.origin}/api/telegram/webhook`);
  const [webhookFromEnv, setWebhookFromEnv] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const expectedWebhookUrl = suggestedWebhookUrl;

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const fetchTelegramStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/telegram/status', {
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
      if (data.success) {
        setConfigured(Boolean(data.configured));
        setBotUsername(data.username || '');
        setLinkedUsersCount(Number(data.linkedUsersCount || 0));
        setWebhookStatus(data.webhook || null);
        if (data.suggestedWebhookUrl) setSuggestedWebhookUrl(String(data.suggestedWebhookUrl));
        setWebhookFromEnv(Boolean(data.webhookFromEnv));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBotServer = async () => {
    setTestingBot(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/telegram/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl: expectedWebhookUrl }),
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login?expired=1';
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigured(true);
        setBotUsername(data.username || '');
        if (data.webhook) setWebhookStatus(data.webhook);
        setFeedback({
          success: true,
          text: `Bot terverifikasi (@${data.username} - ${data.firstName}) dan daftar perintah bot sudah disinkronkan.`,
        });
      } else {
        setFeedback({
          success: false,
          text: data.error || 'Gagal memverifikasi TELEGRAM_BOT_TOKEN di server.',
        });
      }
    } catch {
      setFeedback({ success: false, text: 'Gagal menghubungi server untuk verifikasi Telegram API.' });
    } finally {
      setTestingBot(false);
    }
  };

  const handleRegisterWebhook = async () => {
    setSettingWebhook(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/telegram/set-webhook', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl: expectedWebhookUrl }),
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login?expired=1';
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setWebhookStatus(data.webhook || null);
        setFeedback({
          success: true,
          text: data.message || `Webhook Telegram berhasil diaktifkan ke ${expectedWebhookUrl}`,
        });
      } else {
        setFeedback({
          success: false,
          text: data.error || 'Gagal mendaftarkan webhook ke Telegram.',
        });
      }
    } catch {
      setFeedback({ success: false, text: 'Gagal menghubungi server saat mendaftarkan webhook.' });
    } finally {
      setSettingWebhook(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setBroadcasting(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/telegram/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login?expired=1';
        return;
      }
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          success: true,
          text:
            data.message ||
            `Broadcast selesai: terkirim ke ${data.sentCount || 0} dari ${data.totalTargets || 0} pengguna Telegram terhubung.`,
        });
        if ((data.sentCount || 0) > 0) setMessage('');
      } else {
        setFeedback({
          success: false,
          text: data.error || 'Gagal mengirim broadcast Telegram.',
        });
      }
    } catch {
      setFeedback({ success: false, text: 'Terjadi kesalahan jaringan saat broadcast.' });
    } finally {
      setBroadcasting(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(expectedWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-cyan-400" />
            <span>Telegram Bot & Notifikasi Pengguna</span>
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Kelola koneksi Bot Telegram, aktifkan Webhook agar bot membalas chat user otomatis, dan kirim broadcast.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchTelegramStatus}
          disabled={loading}
          className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 flex items-center gap-2 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Muat Ulang Status
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* BOT CONFIGURATION STATUS CARD (ENV-ONLY) */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" />
                <span>Kredensial Bot Telegram (ENV Server Only)</span>
              </h3>
              <PluConnectedBadge
                connected={configured}
                configured={false}
                size="sm"
                labelConnected="CONNECTED"
                labelUnconfigured="Belum diset di ENV"
              />
            </div>

            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-stone-300">
                    <div className="font-bold text-stone-100">
                      Token Bot disimpan eksklusif di Environment Variable server
                    </div>
                    <p className="text-stone-400 leading-relaxed">
                      <code className="text-cyan-400">TELEGRAM_BOT_TOKEN</code> (dan opsional{' '}
                      <code className="text-cyan-400">TELEGRAM_BOT_USERNAME</code>) dibaca langsung dari file{' '}
                      <code className="text-cyan-400">.env</code> server dan tidak pernah dikirim ke browser.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-stone-950 border border-stone-800">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-bold text-stone-500">
                      Bot Username Terdeteksi
                    </div>
                    <div className="text-sm font-mono text-cyan-400 mt-0.5">
                      {botUsername ? `@${botUsername.replace(/^@/, '')}` : 'Belum terdeteksi'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyBotServer}
                    disabled={testingBot}
                    className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-cyan-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {testingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                    <span>Uji Koneksi Bot (via Server)</span>
                  </button>
                </div>

                {feedback && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                      feedback.success
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}
                  >
                    {feedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WEBHOOK INTEGRATION & EXPLANATION CARD */}
          <div className="bg-stone-900 border border-cyan-500/25 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Webhook className="w-5 h-5 text-cyan-400" />
                <span>Status & Aktivasi Link Webhook Bot</span>
              </h3>
              <PluConnectedBadge
                connected={Boolean(webhookStatus?.isConfiguredOnTelegram && webhookStatus?.isMatch)}
                configured={Boolean(configured)}
                size="sm"
                labelConnected="WEBHOOK AKTIF"
                labelDisconnected={webhookStatus?.url ? 'URL BERBEDA' : 'BELUM DIAKTIFKAN'}
                labelUnconfigured="BOT BELUM DISET"
              />
            </div>

            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-3 text-xs text-stone-300 leading-relaxed">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="font-bold text-cyan-200">Apa kegunaan Link Webhook ini?</div>
                <p className="text-stone-400">
                  Link Webhook adalah alamat &ldquo;penerima pesan masuk&rdquo; di server Anda. Setiap kali pengguna
                  menekan <strong>Start</strong>, mengetik <code className="text-cyan-300">/status</code>,{' '}
                  <code className="text-cyan-300">/tagihan</code>, atau{' '}
                  <code className="text-cyan-300">/ringkasan</code> di Telegram, server Telegram langsung meneruskan
                  chat tersebut ke link ini agar Portal Uang otomatis menghubungkan akun &amp; membalas pesan user.
                </p>
                <p className="text-stone-400">
                  Tanpa mengaktifkan Webhook (status masih <em>BELUM DIAKTIFKAN</em>), bot bisa mengirim notif keluar,
                  tetapi <strong>tidak akan merespons chat masuk atau pairing user</strong>. Cukup klik tombol{' '}
                  <strong>Aktifkan Webhook Sekarang</strong> di bawah ini (tidak perlu atur manual).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Endpoint Webhook Aplikasi Anda {webhookFromEnv && <span className="text-emerald-400">(Dari ENV TELEGRAM_WEBHOOK_URL)</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-xs text-cyan-300 break-all select-all">
                  {expectedWebhookUrl}
                </div>
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>

            {webhookStatus && (
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">Webhook terdaftar di Telegram:</span>
                  <span className="font-mono text-stone-200 break-all text-right">
                    {webhookStatus.url || '(Belum ada URL terdaftar)'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500">Antrean update tertunda:</span>
                  <span className="font-mono text-stone-300">{webhookStatus.pendingUpdateCount}</span>
                </div>
                {webhookStatus.lastErrorMessage && (
                  <div className="text-rose-400 pt-1 border-t border-stone-900">
                    Error terakhir Telegram: {webhookStatus.lastErrorMessage}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-stone-500">
                Perintah aktif otomatis: <code className="text-stone-300">/start</code>,{' '}
                <code className="text-stone-300">/status</code>, <code className="text-stone-300">/tagihan</code>,{' '}
                <code className="text-stone-300">/ringkasan</code>, <code className="text-stone-300">/bantuan</code>
              </div>
              <button
                type="button"
                onClick={handleRegisterWebhook}
                disabled={settingWebhook || !configured}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {settingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                <span>
                  {webhookStatus?.isConfiguredOnTelegram && webhookStatus?.isMatch
                    ? 'Sinkronkan Ulang Webhook'
                    : 'Aktifkan Webhook Sekarang'}
                </span>
              </button>
            </div>
          </div>

          {/* BROADCAST CARD */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-rose-400" />
                <span>Kirim Pengumuman (Broadcast Telegram)</span>
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-950 border border-stone-800 text-[11px] font-bold text-stone-300">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                {linkedUsersCount} User Terhubung
              </span>
            </div>
            <p className="text-xs text-stone-400 mb-4">
              Kirimkan pengumuman penting, info fitur baru, atau peringatan sistem ke seluruh pengguna yang telah
              menghubungkan Telegram.
            </p>
            <form onSubmit={handleBroadcast}>
              <textarea
                rows={4}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-shadow resize-none text-xs"
                placeholder="Tulis pesan pengumuman broadcast..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={broadcasting || !configured || linkedUsersCount === 0}
                  className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-xs shadow-md"
                >
                  {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Kirim Broadcast ({linkedUsersCount})
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SIDEBAR INFO & WEBHOOK */}
        <div className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm text-center">
            <div className="w-14 h-14 mx-auto bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 mb-3">
              <Send className="w-7 h-7 ml-[-2px]" />
            </div>
            <h3 className="text-base font-bold text-stone-100">Status Bot</h3>

            {configured ? (
              <div className="mt-2 space-y-2 flex flex-col items-center">
                <PluConnectedBadge connected={true} size="sm" labelConnected="CONNECTED" />
                {botUsername && (
                  <p className="text-xs text-cyan-400 font-mono pt-1">@{botUsername.replace(/^@/, '')}</p>
                )}
                <p className="text-[11px] text-stone-400">
                  {linkedUsersCount} akun user terhubung ke bot
                </p>
              </div>
            ) : (
              <div className="mt-2 flex justify-center">
                <PluConnectedBadge connected={false} configured={false} size="sm" labelUnconfigured="Belum Terkonfigurasi" />
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-stone-800 text-left text-xs text-stone-400 space-y-2">
              <div className="font-bold text-stone-300">Alur Kerja Verifikasi:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>Admin aktifkan Webhook (1 klik di halaman ini)</li>
                <li>User klik &ldquo;Hubungkan Telegram&rdquo; di aplikasi</li>
                <li>Web membuat token &amp; QR code pairing</li>
                <li>User membuka bot &amp; tekan Start</li>
                <li>Telegram mengirim pesan ke Webhook &amp; akun otomatis terhubung</li>
              </ol>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-stone-200 font-bold text-xs">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Daftar Perintah Bot User</span>
            </div>
            <div className="space-y-2 text-[11px] text-stone-400">
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800">
                <code className="text-cyan-300 font-bold">/start</code> — Panduan &amp; verifikasi pairing akun
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800">
                <code className="text-cyan-300 font-bold">/status</code> — Cek apakah chat Telegram sudah tersambung
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800">
                <code className="text-cyan-300 font-bold">/tagihan</code> — Lihat daftar tagihan yang belum lunas
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800">
                <code className="text-cyan-300 font-bold">/ringkasan</code> — Lihat ringkasan saldo &amp; pengeluaran
              </div>
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800">
                <code className="text-cyan-300 font-bold">/bantuan</code> — Tampilkan daftar perintah
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
