import React from 'react';
import { 
  Download, 
  Smartphone, 
  X, 
  Sparkles, 
  Zap, 
  Share2, 
  PlusSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Laptop,
  ArrowRight
} from 'lucide-react';
import { PWAInstallState } from '../hooks/usePWAInstall';

interface InstallAppModalProps {
  pwa: PWAInstallState;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ pwa, onClose }) => {
  if (!pwa.showModal) return null;

  const { platform, browser, promptInstall, isStandalone } = pwa;

  const handleActionClick = async () => {
    if (platform === 'ios' || (browser === 'safari' && platform !== 'android')) {
      onClose();
      return;
    }
    await promptInstall();
  };

  const getDeviceLabel = () => {
    if (platform === 'ios') return 'iPhone / iPad (iOS)';
    if (platform === 'android') return 'Android';
    return 'Komputer / Laptop';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-t-[2rem] sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[85vh] flex flex-col shadow-2xl shadow-black/90 relative overflow-hidden">
        
        {/* Subtle Ambient Background Light */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mobile Pull Bar Indicator */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0">
          <div className="w-12 h-1 bg-stone-700 rounded-full" />
        </div>

        {/* Sticky Header */}
        <div className="px-5 sm:px-6 pt-2 sm:pt-6 pb-3 border-b border-stone-800/80 bg-stone-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner shrink-0">
              <img 
                src="/icon.svg" 
                alt="Portal Uang" 
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">Pasang Portal Uang</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                  App PWA
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-400 leading-tight mt-0.5">
                Jalankan layaknya aplikasi native di <b className="text-stone-300">{getDeviceLabel()}</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors shrink-0 active:scale-95"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 px-5 sm:px-6 py-4 space-y-4 relative z-10 text-stone-200 scrollbar-thin scrollbar-thumb-stone-800">
          
          {/* Key Advantages Grid (Compact & responsive) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-950/70 border border-stone-800/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-stone-200 text-[11px] sm:text-xs truncate">Akses 1-Klik</div>
                <div className="text-[10px] text-stone-400 truncate">Layar utama & taskbar</div>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-950/70 border border-stone-800/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-stone-200 text-[11px] sm:text-xs truncate">Layar Penuh</div>
                <div className="text-[10px] text-stone-400 truncate">Bebas address bar</div>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-950/70 border border-stone-800/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-stone-200 text-[11px] sm:text-xs truncate">Super Ringan</div>
                <div className="text-[10px] text-stone-400 truncate">Hemat memori & kuota</div>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-stone-950/70 border border-stone-800/80 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-stone-200 text-[11px] sm:text-xs truncate">Auto Sinkron</div>
                <div className="text-[10px] text-stone-400 truncate">Tanpa download update</div>
              </div>
            </div>
          </div>

          {/* DEVICE-SPECIFIC STEP GUIDE */}
          <div className="bg-stone-950/90 border border-stone-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
              <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                {platform === 'ios' ? (
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                ) : platform === 'android' ? (
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Laptop className="w-4 h-4 text-amber-400" />
                )}
                <span>Panduan Pasang {getDeviceLabel()}</span>
              </span>
              <span className="text-[10px] text-stone-500 font-medium">Hanya 3 Detik</span>
            </div>

            {/* iOS Safari Steps */}
            {platform === 'ios' ? (
              <div className="space-y-2 text-xs text-stone-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Buka Safari & ketuk ikon <span className="text-cyan-400 font-bold inline-flex items-center gap-0.5">Bagikan (Share) <Share2 className="w-3.5 h-3.5 inline" /></span> di bilah bawah layar.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Pilih menu <span className="text-amber-400 font-bold inline-flex items-center gap-0.5">Tambah ke Layar Utama <PlusSquare className="w-3.5 h-3.5 inline" /></span> (Add to Home Screen).
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Ketuk <span className="text-emerald-400 font-bold">Tambah (Add)</span> di kanan atas. Selesai!
                  </div>
                </div>
              </div>
            ) : platform === 'android' ? (
              /* Android Steps */
              <div className="space-y-2 text-xs text-stone-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Ketuk tombol <span className="text-emerald-400 font-bold">"Pasang Aplikasi Sekarang"</span> di bawah ini.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Atau ketuk menu <b>titik tiga (⋮)</b> di browser Chrome/Edge ➔ pilih <span className="text-cyan-400 font-semibold">"Instal aplikasi"</span> atau <span className="text-cyan-400 font-semibold">"Tambahkan ke Layar Utama"</span>.
                  </div>
                </div>
              </div>
            ) : (
              /* Desktop / Laptop Steps */
              <div className="space-y-2 text-xs text-stone-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Klik tombol <span className="text-amber-400 font-bold">"Pasang di Komputer"</span> di bawah.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Atau klik ikon install <Download className="w-3 h-3 inline text-cyan-400 mx-0.5" /> di ujung kanan Address Bar browser Anda.
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Sticky Footer Action Bar */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-stone-800/80 bg-stone-900/95 backdrop-blur-md shrink-0 space-y-2 relative z-10">
          {platform !== 'ios' ? (
            <button
              onClick={handleActionClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>
                {platform === 'android' ? 'Pasang Aplikasi Sekarang' : 'Pasang di Komputer / Laptop'}
              </span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Saya Mengerti, Tutup Panduan</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Ringan & Terverifikasi
            </span>
            <button
              onClick={() => {
                pwa.dismissPrompt();
                onClose();
              }}
              className="hover:text-stone-300 underline py-0.5"
            >
              Ingatkan Nanti
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
