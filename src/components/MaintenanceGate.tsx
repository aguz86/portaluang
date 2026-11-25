import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Wrench, Gift, RefreshCw, Clock, ShieldCheck, X, ArrowRight, Sparkles } from 'lucide-react';

export interface MaintenanceConfig {
  enabled: boolean;
  title: string;
  message: string;
  estimatedEnd?: string;
  compensationBannerEnabled: boolean;
  compensationBannerText: string;
  updatedAt?: string | null;
}

export interface UserCompensationNotice {
  id: string;
  bonusDays: number;
  reason: string;
  newExpiresAt: string;
  createdAt: string;
}

export const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [loading, setLoading] = useState(!isAdminRoute);
  const [appName, setAppName] = useState('Portal Uang');
  const [supportEmail, setSupportEmail] = useState('support@portaluang.id');
  const [config, setConfig] = useState<MaintenanceConfig | null>(null);

  const checkMaintenance = async () => {
    try {
      const res = await fetch('/api/public-settings');
      const data = await res.json();
      if (data.success) {
        if (data.appName) setAppName(data.appName);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
        if (data.maintenanceConfig) {
          setConfig(data.maintenanceConfig);
        } else {
          setConfig({
            enabled: Boolean(data.maintenance),
            title: 'Sistem Sedang Dalam Pemeliharaan',
            message:
              'Kami sedang melakukan pemeliharaan dan peningkatan server agar layanan semakin cepat & stabil. Data keuangan Anda tetap aman.',
            estimatedEnd: '',
            compensationBannerEnabled: false,
            compensationBannerText: '',
            updatedAt: null,
          });
        }
      }
    } catch {
      // Fail open on transient network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminRoute) {
      checkMaintenance();
    } else {
      setLoading(false);
    }
  }, [isAdminRoute, location.pathname]);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  if (loading && !config) {
    return <>{children}</>;
  }

  if (config?.enabled) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle ambient gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[540px] bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 w-[420px] h-[420px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-xl w-full bg-stone-900/90 border border-stone-800 rounded-3xl p-7 sm:p-10 shadow-2xl space-y-6 text-center backdrop-blur-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Wrench className="w-3.5 h-3.5" />
            Maintenance Mode • {appName}
          </div>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Wrench className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {config.title || 'Sistem Sedang Dalam Pemeliharaan'}
            </h1>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
              {config.message ||
                'Kami sedang melakukan pemeliharaan dan peningkatan server agar layanan semakin cepat & stabil. Data keuangan Anda tetap aman.'}
            </p>
          </div>

          {config.estimatedEnd && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs sm:text-sm text-stone-200 font-semibold">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Estimasi Selesai: {config.estimatedEnd}</span>
            </div>
          )}

          {config.compensationBannerEnabled && config.compensationBannerText && (
            <div className="text-left bg-emerald-950/35 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                <Gift className="w-4 h-4 shrink-0" />
                Informasi Kompensasi Pengguna
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                {config.compensationBannerText}
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => checkMaintenance()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-colors shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Cek Status Kembali
            </button>
            <Link
              to="/admin/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Login Admin
            </Link>
          </div>

          <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-800/80">
            Butuh bantuan mendesak? Hubungi kami di <span className="text-stone-300 font-medium">{supportEmail}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const CompensationNoticeBanner: React.FC<{
  maintenanceConfig: MaintenanceConfig | null;
  userCompensationNotice: UserCompensationNotice | null;
  onViewProfile: () => void;
}> = ({ maintenanceConfig, userCompensationNotice, onViewProfile }) => {
  const [dismissedKey, setDismissedKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem('pu_dismissed_compensation_key');
    } catch {
      return null;
    }
  });

  const activeKey = userCompensationNotice?.id
    ? `user_${userCompensationNotice.id}`
    : maintenanceConfig?.compensationBannerEnabled
    ? `global_${maintenanceConfig.updatedAt || maintenanceConfig.compensationBannerText}`
    : null;

  if (!activeKey || dismissedKey === activeKey) return null;

  const hasPersonalBonus = Boolean(userCompensationNotice && userCompensationNotice.bonusDays > 0);
  const formattedExp = userCompensationNotice?.newExpiresAt
    ? new Date(userCompensationNotice.newExpiresAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const handleDismiss = () => {
    try {
      localStorage.setItem('pu_dismissed_compensation_key', activeKey);
    } catch {
      // ignore
    }
    setDismissedKey(activeKey);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-950/60 via-stone-900 to-amber-950/40 border-b border-emerald-500/30 px-4 py-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5 flex-wrap">
              <Sparkles className="w-3.5 h-3.5" />
              {hasPersonalBonus
                ? `Kompensasi Masa Langganan +${userCompensationNotice!.bonusDays} Hari Telah Ditambahkan!`
                : 'Pemberitahuan Kompensasi Sistem'}
            </div>
            <p className="text-stone-300 mt-0.5">
              {hasPersonalBonus ? (
                <>
                  {userCompensationNotice!.reason}. Masa aktif Anda kini berlaku hingga{' '}
                  <strong className="text-white">{formattedExp}</strong> (Invoice: <span className="font-mono text-amber-300">{userCompensationNotice!.id}</span>).
                </>
              ) : (
                maintenanceConfig?.compensationBannerText
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={onViewProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-colors"
          >
            Lihat Invoice
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
