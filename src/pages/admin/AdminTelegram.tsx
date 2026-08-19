import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Settings, 
  Loader2, 
  Save, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle, 
  Bot, 
  Sparkles,
  Link,
  Radio
} from 'lucide-react';

export const AdminTelegram: React.FC = () => {
  const [message, setMessage] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setBotToken(data.data.telegramBotToken || '');
        setBotUsername(data.data.telegramBotUsername || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      const current = data.success && data.data ? data.data : {};
      
      current.telegramBotToken = botToken;
      current.telegramBotUsername = botUsername;

      const saveRes = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current)
      });
      if (saveRes.ok) {
        setTestResult({ success: true, text: 'Konfigurasi Bot Telegram berhasil disimpan!' });
      }
    } catch (err) {
      setTestResult({ success: false, text: 'Gagal menyimpan konfigurasi' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    if (!botToken) {
      setTestResult({ success: false, text: 'Silakan masukkan Bot Token terlebih dahulu' });
      return;
    }
    setTestingBot(true);
    setTestResult(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        setBotUsername(data.result.username || '');
        setTestResult({
          success: true,
          text: `✅ Bot terverifikasi: @${data.result.username} (${data.result.first_name})`
        });
      } else {
        setTestResult({
          success: false,
          text: `❌ Gagal verifikasi: ${data.description || 'Token tidak valid'}`
        });
      }
    } catch (err) {
      setTestResult({ success: false, text: 'Gagal menghubungi Telegram API' });
    } finally {
      setTestingBot(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setBroadcasting(true);
    
    try {
      const res = await fetch('/api/admin/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('Pesan broadcast berhasil diinisialisasi!');
        setMessage('');
      } else {
        alert('Gagal broadcast: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Terjadi kesalahan jaringan');
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
          Kelola integrasi bot Telegram, webhook otomatis, dan pesan broadcast ke seluruh pengguna Portal Uang.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* BOT CONFIGURATION CARD */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" /> 
                <span>Konfigurasi Bot Telegram</span>
              </h3>
              {botToken && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Bot Aktif
                </span>
              )}
            </div>
            
            {loading ? (
              <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-stone-500" /></div>
            ) : (
              <form onSubmit={handleSaveToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Telegram Bot Token (dari @BotFather)
                  </label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdef..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                    Dapatkan token gratis dengan mengirimkan <code className="text-cyan-400">/newbot</code> ke @BotFather di Telegram.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Bot Username (contoh: Portal UangBot)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-3 text-stone-500 text-sm">@</span>
                      <input
                        type="text"
                        value={botUsername}
                        onChange={e => setBotUsername(e.target.value.replace(/^@/, ''))}
                        placeholder="Portal UangBot"
                        className="w-full bg-stone-950 border border-stone-800 rounded-2xl pl-8 pr-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestBot}
                      disabled={testingBot || !botToken}
                      className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-cyan-400 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {testingBot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                      <span>Uji & Deteksi</span>
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{testResult.text}</span>
                  </div>
                )}
                
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 text-xs shadow-md"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Konfigurasi
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* BROADCAST CARD */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-100 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-rose-400" /> 
              <span>Kirim Pengumuman (Broadcast Telegram)</span>
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Kirimkan pengumuman penting, info fitur baru, atau peringatan sistem ke seluruh pengguna yang telah menghubungkan Telegram.
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
                  disabled={broadcasting || !botToken}
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
            
            {botToken ? (
              <div className="mt-2 space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Terkonfigurasi
                </span>
                {botUsername && (
                  <p className="text-xs text-cyan-400 font-mono pt-1">
                    @{botUsername}
                  </p>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-2">
                Belum Terkonfigurasi
              </span>
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
