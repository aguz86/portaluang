import React, { useState, useEffect } from 'react';
import { NotificationSettings } from '../types';
import { 
  Settings, 
  BellRing, 
  Send, 
  Info, 
  Check, 
  Save, 
  Link2, 
  Unlink, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Smartphone, 
  Loader2, 
  QrCode,
  ShieldCheck,
  Download,
  Laptop,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';
import { TelegramLinkModal } from './TelegramLinkModal';

interface SettingsViewProps {
  isStandalone?: boolean;
  settings: NotificationSettings;
  setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  showToast: (msg: string) => void;
  userId?: string;
  onOpenInstallModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  settings, 
  setSettings, 
  showToast,
  userId: propUserId,
  onOpenInstallModal,
  isStandalone = false,
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettings>(settings);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [testingTelegram, setTestingTelegram] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const effectiveUserId = propUserId || localStorage.getItem('auraledger_user_id') || 'pengguna@portaluang.id';

  // Keep localSettings in sync if parent settings change (e.g. from linking)
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    setSettings(localSettings);
    showToast('Pengaturan notifikasi berhasil disimpan');
  };

  const handleModalLinked = (newSettings: Partial<NotificationSettings>) => {
    const updated = {
      ...localSettings,
      ...newSettings,
      telegramEnabled: true
    };
    setLocalSettings(updated);
    setSettings(updated);
  };

  const handleDisconnectTelegram = async () => {
    if (!window.confirm('Apakah Kamu yakin ingin memutuskan koneksi bot Telegram?')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await fetch('/api/telegram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUserId })
      });
      const data = await res.json();
      if (data.success) {
        const cleared: NotificationSettings = {
          ...localSettings,
          telegramChatId: '',
          telegramUsername: '',
          telegramFirstName: '',
          telegramLinkedAt: '',
          telegramEnabled: false
        };
        setLocalSettings(cleared);
        setSettings(cleared);
        showToast('Koneksi Telegram berhasil diputuskan');
      } else {
        showToast(data.error || 'Gagal memutuskan koneksi');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan');
    } finally {
      setDisconnecting(false);
    }
  };

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Browser ini tidak mendukung desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const updated = { ...localSettings, pushEnabled: true };
      setLocalSettings(updated);
      setSettings(updated);
      new Notification('Notifikasi Berhasil Diaktifkan!', {
        body: 'Kamu akan menerima pengingat tagihan melalui notifikasi browser.'
      });
      showToast('Izin notifikasi browser diberikan');
    } else {
      const updated = { ...localSettings, pushEnabled: false };
      setLocalSettings(updated);
      setSettings(updated);
      showToast('Izin notifikasi ditolak');
    }
  };

  const testTelegram = async () => {
    if (!localSettings.telegramChatId) {
      showToast('Silakan hubungkan bot Telegram terlebih dahulu');
      return;
    }
    setTestingTelegram(true);
    try {
      const userTag = localSettings.telegramUsername ? `@${localSettings.telegramUsername}` : 'Pengguna';
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: localSettings.telegramChatId,
          message: `✅ <b>Portal Uang Notifikasi Uji Coba</b>\n\nHalo ${userTag}! Notifikasi Telegram Kamu berfungsi dengan sempurna. Pengingat tagihan dan alarm anggaran akan dikirimkan ke sini secara otomatis.`
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Pesan uji coba berhasil dikirim ke Telegram Kamu!');
      } else {
        showToast('Gagal mengirim pesan: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan saat menghubungi server');
    } finally {
      setTestingTelegram(false);
    }
  };

  const testPush = () => {
    if (localSettings.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Portal Uang Reminder', {
        body: '🔔 Ini adalah uji coba notifikasi desktop/push browser.'
      });
      showToast('Notifikasi push berhasil diuji coba');
    } else {
      showToast('Push notifikasi belum aktif atau belum diizinkan');
    }
  };

  const isTelegramConnected = Boolean(localSettings.telegramChatId);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-stone-100">Pengaturan & Notifikasi</h2>
          </div>
          <p className="text-stone-400 text-sm">
            Konfigurasikan integrasi Bot Telegram instan dan Push Notification untuk pengingat jatuh tempo otomatis.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Save className="w-4 h-4" />
          Simpan Pengaturan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Config Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-100 text-base flex items-center gap-2">
                    Bot Telegram Notifikasi
                  </h3>
                  <span className="text-xs text-stone-400">Pengingat 3 detik langsung ke HP</span>
                </div>
              </div>

              {isTelegramConnected && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={localSettings.telegramEnabled}
                    onChange={(e) => {
                      const updated = { ...localSettings, telegramEnabled: e.target.checked };
                      setLocalSettings(updated);
                      setSettings(updated);
                    }}
                  />
                  <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              )}
            </div>

            {/* CONNECTED STATE */}
            {isTelegramConnected ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                        Terhubung & Siap Menerima Notif
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      ID: {localSettings.telegramChatId}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
                      ✈️
                    </div>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>@{localSettings.telegramUsername || 'Telegram User'}</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
                      </div>
                      <div className="text-xs text-stone-400">
                        {localSettings.telegramFirstName ? `${localSettings.telegramFirstName} • ` : ''}
                        {localSettings.telegramLinkedAt 
                          ? `Terkoneksi ${new Date(localSettings.telegramLinkedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                          : 'Tersinkronisasi'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={testTelegram}
                    disabled={testingTelegram}
                    className="py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {testingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Uji Coba Kirim Pesan</span>
                  </button>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hubungkan Ulang</span>
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="text-[11px] text-stone-400 hover:text-stone-300 underline"
                  >
                    {showManualInput ? 'Sembunyikan Pengaturan Lanjutan' : 'Edit Chat ID Manual'}
                  </button>

                  <button
                    onClick={handleDisconnectTelegram}
                    disabled={disconnecting}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Putuskan Koneksi</span>
                  </button>
                </div>

                {showManualInput && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-[11px] text-stone-400 mb-1">Telegram Chat ID (Manual)</label>
                    <input
                      type="text"
                      value={localSettings.telegramChatId}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                )}
              </div>
            ) : (
              /* NOT CONNECTED STATE */
              <div className="space-y-5">
                <div className="bg-stone-950/80 border border-stone-800/80 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-stone-300 leading-relaxed">
                    Hubungkan akun Kamu dengan Bot Telegram Portal Uang untuk mendapatkan notifikasi instan:
                  </p>
                  <ul className="text-xs text-stone-400 space-y-1.5">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Pengingat tagihan H-{localSettings.dueReminderDays} sebelum jatuh tempo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>Peringatan over-budgeting & sinking funds target</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>100% Gratis & tanpa instalasi aplikasi tambahan</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="w-4 h-4 fill-stone-950" />
                  <span>Hubungkan Telegram (Auto-Link)</span>
                </button>

                <div className="flex justify-between items-center text-[11px] text-stone-500 pt-1">
                  <span>Proses 1-Klik / Scan QR Code</span>
                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="hover:text-stone-400 underline"
                  >
                    {showManualInput ? 'Tutup Input Manual' : 'Gunakan Chat ID Manual'}
                  </button>
                </div>

                {showManualInput && (
                  <div className="pt-2 animate-fadeIn space-y-2">
                    <label className="block text-[11px] text-stone-400">Telegram Chat ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="123456789"
                        value={localSettings.telegramChatId}
                        onChange={(e) => setLocalSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                        className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                      <button
                        onClick={handleSave}
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-800/60 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pesan verifikasi & pengingat dikirim melalui bot terenkripsi.</span>
          </div>
        </div>

        {/* Push Notification Config Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-100 text-base">Notifikasi Perangkat (Push)</h3>
                  <span className="text-xs text-stone-400">Notifikasi browser & desktop</span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={localSettings.pushEnabled}
                  onChange={(e) => {
                    if (e.target.checked && Notification.permission !== 'granted') {
                      requestPushPermission();
                    } else {
                      const updated = { ...localSettings, pushEnabled: e.target.checked };
                      setLocalSettings(updated);
                      setSettings(updated);
                    }
                  }}
                />
                <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            <div className="space-y-4">
              <div className="bg-stone-950/80 border border-stone-800/80 p-4 rounded-2xl text-xs text-stone-300 leading-relaxed">
                Menerima pop-up notifikasi langsung di layar komputer atau smartphone saat membuka aplikasi web jika terdapat tagihan yang mendekati jatuh tempo.
              </div>

              {localSettings.pushEnabled ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Izin push notification browser telah aktif</span>
                </div>
              ) : (
                <button
                  onClick={requestPushPermission}
                  className="w-full py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Izinkan Notifikasi Browser</span>
                </button>
              )}

              <button
                onClick={testPush}
                className="w-full py-2.5 rounded-xl border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 text-xs font-medium transition-colors"
              >
                Uji Coba Push Notifikasi
              </button>
            </div>
          </div>

          <div className="text-[11px] text-stone-500 pt-2 border-t border-stone-800/60 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-stone-500" />
            <span>Memerlukan izin 'Allow Notifications' dari browser Kamu.</span>
          </div>
        </div>
      </div>
      
      {/* Auto Checklist & Daily Note Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-100 text-base">Note & Auto Checklist</h3>
                <span className="text-xs text-stone-400">Pengingat harian otomatis via Bot Telegram</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={localSettings.dailyReminderEnabled || false}
                onChange={(e) => {
                  const updated = { ...localSettings, dailyReminderEnabled: e.target.checked };
                  setLocalSettings(updated);
                  setSettings(updated);
                }}
                disabled={!isTelegramConnected}
              />
              <div className={`w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isTelegramConnected ? 'peer-checked:bg-indigo-500' : 'opacity-50'}`}></div>
            </label>
          </div>

          <div className="space-y-4">
            {!isTelegramConnected && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Hubungkan akun Telegram terlebih dahulu untuk menggunakan fitur ini.
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Waktu Pengingat (Setiap Hari)</label>
              <input
                type="time"
                className="w-full bg-stone-950/50 border border-stone-800 text-stone-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500/50 transition-colors"
                value={localSettings.dailyReminderTime || '08:00'}
                onChange={(e) => {
                  const updated = { ...localSettings, dailyReminderTime: e.target.value };
                  setLocalSettings(updated);
                  setSettings(updated);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300">Pesan / Checklist Khusus</label>
              <textarea
                className="w-full bg-stone-950/50 border border-stone-800 text-stone-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors min-h-[100px] resize-none"
                placeholder="Jangan impulsif buying, jangan lapar mata, ingat goals"
                value={localSettings.dailyReminderNote ?? 'Jangan impulsif buying, jangan lapar mata, ingat goals'}
                onChange={(e) => {
                  const updated = { ...localSettings, dailyReminderNote: e.target.value };
                  setLocalSettings(updated);
                  setSettings(updated);
                }}
              ></textarea>
            </div>
            
            <button
              onClick={async () => {
                if (!isTelegramConnected) {
                  showToast('Hubungkan Telegram terlebih dahulu');
                  return;
                }
                const note = localSettings.dailyReminderNote || 'Jangan impulsif buying, jangan lapar mata, ingat goals';
                const time = localSettings.dailyReminderTime || '08:00';
                
                showToast(`Menguji pengiriman checklist...`);
                try {
                  const res = await fetch('/api/telegram/test-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      userId: effectiveUserId, 
                      message: `📋 *DAILY CHECKLIST PENGINGAT*\n\n${note}` 
                    })
                  });
                  if (res.ok) {
                    showToast(`Checklist berhasil dikirim! Akan diulangi setiap pukul ${time}`);
                  } else {
                    showToast('Gagal mengirim uji coba checklist');
                  }
                } catch (e) {
                  showToast('Terjadi kesalahan koneksi saat menguji checklist');
                }
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold transition-colors disabled:opacity-50"
              disabled={!isTelegramConnected}
            >
              Simpan & Uji Coba Kirim Sekarang
            </button>
          </div>
        </div>
      </div>

      {/* Progressive Web App (PWA) Device Installation Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-100 text-base">Instalasi Aplikasi di Perangkat (PWA)</h3>
                {isStandalone ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Berjalan sebagai Aplikasi Native
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Siap Dipasang
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Jalankan Portal Uang di layar penuh tanpa bar browser di Android, iOS (iPhone/iPad), macOS, atau Windows.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenInstallModal?.()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isStandalone ? 'Buka Info PWA' : 'Pasang / Panduan Instal'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-stone-200">Android & iOS Support</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Mendukung Add to Home Screen instan di semua smartphone</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-stone-200">Desktop & Laptop</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Jendela standalone di Windows, Mac, dan Linux tanpa tab</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-stone-200">Aset Cepat & Offline</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Service Worker meng-cache antarmuka agar loading seketika</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Days Range Config */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
        <h3 className="font-bold text-stone-100 flex items-center gap-2 mb-4">
          <BellRing className="w-5 h-5 text-amber-500" />
          Pengaturan Waktu Pengingat Tagihan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">
              Kirim Notifikasi H- Berapa Hari
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="30"
                value={localSettings.dueReminderDays}
                onChange={(e) => {
                  const days = Math.max(1, parseInt(e.target.value) || 1);
                  setLocalSettings(prev => ({ ...prev, dueReminderDays: days }));
                }}
                className="w-28 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              />
              <span className="text-sm text-stone-300 font-medium">Hari sebelum jatuh tempo</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-2">
              Contoh: Jika disetel 3 hari, sistem akan mengirimkan notifikasi pada H-3, H-2, dan H-1 sebelum tenggat pembayaran.
            </p>
          </div>

          <div className="bg-stone-950/60 border border-stone-800/80 p-4 rounded-2xl text-xs text-stone-400 flex gap-3">
            <Info className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Pemeriksaan tagihan berjalan otomatis di latar belakang saat Kamu mengakses aplikasi. Pengingat hanya dikirimkan 1x per hari agar tidak mengganggu fokus Kamu.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Telegram Linking Modal */}
      <TelegramLinkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={effectiveUserId}
        onLinked={handleModalLinked}
        showToast={showToast}
      />
    </div>
  );
};
