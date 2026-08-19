import React from 'react';
import { Download, X, Smartphone, Laptop, Sparkles, ArrowRight } from 'lucide-react';
import { PWAInstallState } from '../hooks/usePWAInstall';

interface InstallAppBannerProps {
  pwa: PWAInstallState;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({ pwa }) => {
  const { shouldShowBanner, isStandalone, isInstalled, platform, promptInstall, dismissPrompt, setShowModal } = pwa;

  if (!shouldShowBanner || isStandalone || isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowModal(true);
    } else {
      const result = await promptInstall();
      if (result === 'manual_guide') {
        setShowModal(true);
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-6 sm:w-96 z-40 animate-fadeIn select-none">
      <div className="bg-stone-900/95 backdrop-blur-md border border-amber-500/30 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl shadow-black/80 relative overflow-hidden group">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition-all" />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* App Logo */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-stone-800 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 shadow-md">
            <img 
              src="/icon.svg" 
              alt="Portal Uang" 
              className="w-8 h-8 rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-sm font-black text-white truncate">
                Pasang Aplikasi Portal Uang
              </h4>
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>
            
            <p className="text-[11px] text-stone-300 leading-snug line-clamp-2">
              Jalankan layar penuh tanpa browser di {platform === 'ios' ? 'iPhone' : platform === 'android' ? 'Android' : 'Desktop'}.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Pasang Sekarang</span>
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
              >
                Panduan
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={dismissPrompt}
            className="absolute top-2 right-2 p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
            title="Tutup / Ingatkan Nanti"
            aria-label="Tutup Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
