import { useState, useEffect } from 'react';

export interface GlobalSettings {
  appName: string;
  supportEmail: string;
  appVersion: string;
  aiName?: string;
  aiRoleTitle?: string;
  aiTone?: string;
  aiSystemPrompt?: string;
  heroTitle1?: string;
  heroTitle2Prefix?: string;
  heroSubtitle?: string;
  heroFont?: string;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  appName: "Portal Uang",
  supportEmail: "support@portaluang.id",
  appVersion: "1.0.0",
  aiName: "Portal Uang Advisor",
  aiRoleTitle: "AI Wealth Strategist",
  aiTone: "professional_supportive",
  aiSystemPrompt: "",
  heroTitle1: 'Tinggalkan Spreadsheet Rumit.',
  heroTitle2Prefix: 'Kuasai Uang Anda dengan ',
  heroSubtitle: 'Hentikan "bocor halus" seketika dengan sistem <strong class="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong class="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong class="text-emerald-300">AI Cerdas</strong>.',
  heroFont: 'Plus Jakarta Sans, sans-serif'
};

export const useGlobalSettings = () => {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const stored = localStorage.getItem('auraledger_global_settings');
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SETTINGS;
  });

  const fetchSettingsFromServer = async () => {
    try {
      const res = await fetch('/api/public-settings');
      const data = await res.json();
      if (data.success && data.appName) {
        const newSettings = {
          appName: data.appName || DEFAULT_SETTINGS.appName,
          supportEmail: data.supportEmail || DEFAULT_SETTINGS.supportEmail,
          appVersion: data.appVersion || DEFAULT_SETTINGS.appVersion,
          aiName: data.aiName || DEFAULT_SETTINGS.aiName,
          aiRoleTitle: data.aiRoleTitle || DEFAULT_SETTINGS.aiRoleTitle,
          aiTone: data.aiTone || DEFAULT_SETTINGS.aiTone,
          aiSystemPrompt: data.aiSystemPrompt || DEFAULT_SETTINGS.aiSystemPrompt,
          heroTitle1: data.heroTitle1 || DEFAULT_SETTINGS.heroTitle1,
          heroTitle2Prefix: data.heroTitle2Prefix || DEFAULT_SETTINGS.heroTitle2Prefix,
          heroSubtitle: data.heroSubtitle || DEFAULT_SETTINGS.heroSubtitle,
          heroFont: data.heroFont || DEFAULT_SETTINGS.heroFont
        };
        
        // Only update if changed
        const currentStr = localStorage.getItem('auraledger_global_settings');
        if (currentStr !== JSON.stringify(newSettings)) {
          localStorage.setItem('auraledger_global_settings', JSON.stringify(newSettings));
          setSettings(newSettings);
          window.dispatchEvent(new CustomEvent('auraledger_settings_update', { detail: newSettings }));
        }
      }
    } catch (err) {
      // Ignore network errors during polling
    }
  };

  useEffect(() => {
    // Fetch immediately on mount
    fetchSettingsFromServer();
    
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchSettingsFromServer, 10000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'auraledger_global_settings' && e.newValue) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) });
      }
    };
    
    const handleCustomEvent = (e: CustomEvent<GlobalSettings>) => {
      setSettings(e.detail);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auraledger_settings_update', handleCustomEvent as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auraledger_settings_update', handleCustomEvent as EventListener);
    };
  }, []);

  const updateSettings = (newSettings: Partial<GlobalSettings>) => {
    const updated = { ...settings, ...newSettings };
    localStorage.setItem('auraledger_global_settings', JSON.stringify(updated));
    setSettings(updated);
    window.dispatchEvent(new CustomEvent('auraledger_settings_update', { detail: updated }));
  };

  return { settings, updateSettings };
};
