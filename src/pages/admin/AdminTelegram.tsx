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
  Lock
} from 'lucide-react';
import { PluConnectedBadge } from '../../components/PluConnectedBadge';

export const AdminTelegram: React.FC = () => {
  const [message, setMessage] = useState('');
  const [configured, setConfigured] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

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
      const data = await res.json();
      if (data.success) {
        setConfigured(Boolean(data.configured));
        setBotUsername(data.username || '');
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
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfigured(true);
        setBotUsername(data.username || '');
        setFeedback({
          success: true,
          text: `Bot terverifikasi melalui server: @${data.username} (${data.firstName})`,
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
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          success: true,
          text: data.message || 'Pesan broadcast berhasil dikirim ke pengguna Telegram terhubung!',
        });
        setMessage('');
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

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
          <Bot className="w-7 h-7 text-cyan-400" />
          <span>Telegram Bot & Notifikasi Pengguna</span>
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Kelola status koneksi Bot Telegram (via Environment Variable) dan kirim pesan broadcast ke pengguna Portal Uang.
        </p>
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
                      Demi keamanan, <code className="text-cyan-400">TELEGRAM_BOT_TOKEN</code> (dan opsional{' '}
                      <code className="text-cyan-400">TELEGRAM_BOT_USERNAME</code>) hanya dikonfigurasi pada panel
                      Environment Variables server dan tidak pernah diinput atau dikirim ke browser.
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

          {/* BROADCAST CARD */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-100 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rose-400" />
              <span>Kirim Pengumuman (Broadcast Telegram)</span>
            </h3>
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
                  disabled={broadcasting || !configured}
                  className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-xs shadow-md"
                >
                  {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Kirim Broadcast
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
              </div>
            ) : (
              <div className="mt-2 flex justify-center">
                <PluConnectedBadge connected={false} configured={false} size="sm" labelUnconfigured="Belum Terkonfigurasi" />
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-stone-800 text-left text-xs text-stone-400 space-y-2">
              <div className="font-bold text-stone-300">Alur Kerja Verifikasi:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                <li>User klik "Hubungkan Telegram"</li>
                <li>Web generate token & QR code pairing</li>
                <li>User membuka bot & tekan Start</li>
                <li>Bot auto-verifikasi & web auto-refresh</li>
              </ol>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-stone-200 font-bold text-xs">
              <Link className="w-4 h-4 text-cyan-400" />
              <span>Webhook Endpoint URL</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Webhook bot menerima update realtime pada endpoint:
            </p>
            <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[10px] text-stone-300 break-all select-all">
              {window.location.origin}/api/telegram/webhook
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
