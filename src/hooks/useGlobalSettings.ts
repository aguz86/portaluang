import { useState, useEffect } from 'react';

export interface GlobalSettings {
  appName: string;
  supportEmail: string;
  appVersion: string;
  aiName?: string;
  aiRoleTitle?: string;
  aiTone?: string;
  aiSystemPrompt?: string;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  appName: "Portal Uang",
  supportEmail: "support@portaluang.id",
  appVersion: "1.0.0",
  aiName: "Portal Uang Advisor",
  aiRoleTitle: "AI Wealth Strategist",
  aiTone: "professional_supportive",
  aiSystemPrompt: ""
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
          aiSystemPrompt: data.aiSystemPrompt || DEFAULT_SETTINGS.aiSystemPrompt
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
