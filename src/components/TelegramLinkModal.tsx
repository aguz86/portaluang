import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Send, 
  Check, 
  Copy, 
  ExternalLink, 
  QrCode, 
  Loader2, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  X, 
  AlertCircle,
  Smartphone,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { NotificationSettings } from '../types';

interface TelegramLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onLinked: (newSettings: Partial<NotificationSettings>) => void;
  showToast: (msg: string) => void;
}

export const TelegramLinkModal: React.FC<TelegramLinkModalProps> = ({
  isOpen,
  onClose,
  userId,
  onLinked,
  showToast
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string>('');
  const [deepLink, setDeepLink] = useState<string>('');
  const [botUsername, setBotUsername] = useState<string>('Portal UangBot');
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [status, setStatus] = useState<'generating' | 'pending' | 'linked' | 'expired' | 'error'>('generating');
  const [linkedData, setLinkedData] = useState<{
    telegramChatId?: string;
    telegramUsername?: string;
    telegramFirstName?: string;
    linkedAt?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 minutes in seconds
  const [simulating, setSimulating] = useState<boolean>(false);

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Initialize and generate link when modal opens
  useEffect(() => {
    if (isOpen) {
      generatePairingLink();
    } else {
      cleanupTimers();
      setStatus('generating');
      setLinkedData(null);
    }
    return () => cleanupTimers();
  }, [isOpen]);

  const cleanupTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // 1. Generate Link
  const generatePairingLink = async () => {
    cleanupTimers();
    setLoading(true);
    setStatus('generating');
    try {
      const res = await fetch('/api/telegram/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();

      if (data.success) {
        setToken(data.token);
        setDeepLink(data.deepLink);
        setBotUsername(data.botUsername || 'Portal UangBot');
        setIsConfigured(data.isConfigured);
        setStatus('pending');
        setTimeLeft(900); // 15 mins

        // Generate QR code
        try {
          const qrUrl = await QRCode.toDataURL(data.deepLink, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          });
          setQrDataUrl(qrUrl);
        } catch (qrErr) {
          console.error('QR code generation error:', qrErr);
        }

        // Start Countdown Timer
        countdownTimerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              setStatus('expired');
              cleanupTimers();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Start Live Polling every 2 seconds
        startPolling(data.token);
      } else {
        setStatus('error');
        showToast(data.error || 'Gagal membuat tautan pairing');
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      showToast('Terjadi kesalahan jaringan saat membuat link');
    } finally {
      setLoading(false);
    }
  };

  // 2. Start Status Polling
  const startPolling = (pairingToken: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/telegram/check-status?token=${pairingToken}&userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        if (data.success) {
          if (data.status === 'linked') {
            cleanupTimers();
            setStatus('linked');
            setLinkedData({
              telegramChatId: data.telegramChatId,
              telegramUsername: data.telegramUsername,
              telegramFirstName: data.telegramFirstName,
              linkedAt: data.linkedAt || new Date().toISOString()
            });

            // Update parent state
            onLinked({
              telegramChatId: data.telegramChatId,
              telegramUsername: data.telegramUsername,
              telegramFirstName: data.telegramFirstName,
              telegramLinkedAt: data.linkedAt || new Date().toISOString(),
              telegramEnabled: true
            });

            showToast(`🎉 Berhasil terhubung ke Telegram @${data.telegramUsername || 'User'}!`);

            // Auto close after 2.5 seconds
            setTimeout(() => {
              onClose();
            }, 2500);
          } else if (data.status === 'expired') {
            cleanupTimers();
            setStatus('expired');
          }
        }
      } catch (err) {
        console.error('Polling Telegram status error:', err);
      }
    }, 2000);
  };

  const handleCopyLink = () => {
    if (!deepLink) return;
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    showToast('Tautan bot Telegram berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCommand = () => {
    if (!token) return;
    navigator.clipboard.writeText(`/start ${token}`);
    setCopied(true);
    showToast('Perintah /start berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Sandbox / Simulation Trigger
  const handleSimulateConnection = async () => {
    setSimulating(true);
    try {
      const cleanName = userId.split('@')[0] || 'pengguna';
      const fakeUsername = `${cleanName}_aura`;
      
      const res = await fetch('/api/telegram/simulate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userId,
          username: fakeUsername,
          firstName: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
          chatId: '184920482'
        })
      });
      const data = await res.json();
      if (data.success) {
        // Polling will catch it or we trigger directly
        cleanupTimers();
        setStatus('linked');
        setLinkedData({
          telegramChatId: data.telegramChatId,
          telegramUsername: data.telegramUsername,
          telegramFirstName: data.telegramFirstName,
          linkedAt: data.linkedAt
        });

        onLinked({
          telegramChatId: data.telegramChatId,
          telegramUsername: data.telegramUsername,
          telegramFirstName: data.telegramFirstName,
          telegramLinkedAt: data.linkedAt,
          telegramEnabled: true
        });

        showToast(`🎉 Simulasi berhasil! Terhubung ke Telegram @${data.telegramUsername}`);
        setTimeout(() => onClose(), 2000);
      }
    } catch (e) {
      showToast('Gagal menjalankan simulasi');
    } finally {
      setSimulating(false);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Hubungkan Bot Telegram</h3>
              <p className="text-xs text-stone-400">Terima pengingat tagihan & update keuangan instan</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading || status === 'generating' ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <div className="text-sm font-bold text-white">Menghasilkan Kode Unik Pairing...</div>
            <p className="text-xs text-stone-400 max-w-xs">Menyiapkan token aman dan tautan integrasi bot Telegram untuk akun Kamu.</p>
          </div>
        ) : status === 'linked' ? (
          /* SUCCESS STATE */
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-black text-white">Telegram Berhasil Terhubung!</h4>
              <p className="text-sm text-stone-300 mt-1">
                Akun web Kamu kini tersinkronisasi dengan Telegram <strong className="text-cyan-400">@{linkedData?.telegramUsername || 'Pengguna'}</strong>
              </p>
            </div>
            
            <div className="w-full bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-400">Username Telegram:</span>
                <span className="font-bold text-cyan-400">@{linkedData?.telegramUsername || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Telegram Chat ID:</span>
                <span className="font-mono text-stone-200">{linkedData?.telegramChatId || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Status Notifikasi:</span>
                <span className="font-bold text-emerald-400">Aktif & Siap Menerima Alarm</span>
              </div>
            </div>

            <div className="text-xs text-stone-400 flex items-center gap-1.5 pt-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pesan selamat datang telah dikirimkan ke Telegram Kamu.</span>
            </div>
          </div>
        ) : status === 'expired' ? (
          /* EXPIRED STATE */
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Tautan Pairing Kedaluwarsa</h4>
              <p className="text-xs text-stone-400 mt-1">Kode unik berlaku selama 15 menit demi keamanan akun Kamu.</p>
            </div>
            <button
              onClick={generatePairingLink}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              Buat Tautan Baru
            </button>
          </div>
        ) : (
          /* ACTIVE PAIRING FLOW */
          <div className="space-y-5">
            {/* Live Waiting Status Banner */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-semibold text-amber-200 truncate">
                  Menunggu Kamu membuka & menekan tombol Start di Telegram...
                </span>
              </div>
              <div className="px-2 py-0.5 rounded-md bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-300 shrink-0">
                {formattedTime}
              </div>
            </div>

            {/* Method 1: Click Link / Open App (Primary) */}
            <div className="space-y-3">
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
              >
                <Send className="w-4 h-4 fill-stone-950" />
                <span>1. Klik untuk Buka Bot Telegram (@{botUsername})</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="text-center text-[11px] text-stone-400">
                Setelah Telegram terbuka, tekan tombol <strong>"START"</strong> di bagian bawah chat.
              </div>
            </div>

            {/* Method 2: QR Code Scan (Mobile) */}
            <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center gap-4">
              {qrDataUrl ? (
                <div className="p-2 bg-white rounded-xl shrink-0 shadow-md">
                  <img src={qrDataUrl} alt="Telegram Pairing QR Code" className="w-28 h-28" />
                </div>
              ) : (
                <div className="w-28 h-28 bg-stone-900 rounded-xl flex items-center justify-center text-stone-600">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
              <div className="text-left space-y-1.5 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-200">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Atau Scan QR Code lewat HP</span>
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  Arahkan kamera smartphone Kamu ke QR code ini untuk langsung membuka aplikasi Telegram secara otomatis.
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg text-[11px] font-medium text-stone-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin Link</span>
                  </button>
                  <button
                    onClick={handleCopyCommand}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-lg text-[11px] font-medium text-stone-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin /start</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Token details */}
            <div className="text-center text-[10px] text-stone-500 font-mono">
              Token ID: {token} &bull; Sesi aman terenkripsi
            </div>

            {/* Quick Sandbox / Simulation option for testing */}
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
              <span className="text-stone-400">Ingin menguji alur verifikasi langsung?</span>
              <button
                type="button"
                onClick={handleSimulateConnection}
                disabled={simulating}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {simulating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                <span>Simulasi Cepat (Sandbox)</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
