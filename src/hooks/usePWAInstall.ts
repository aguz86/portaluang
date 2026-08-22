import { useState, useEffect, useCallback } from 'react';

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'other';
  browser: 'safari' | 'chrome' | 'edge' | 'firefox' | 'other';
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'manual_guide'>;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  dismissPrompt: () => void;
  shouldShowBanner: boolean;
  hasDeferredPrompt: boolean;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [shouldShowBanner, setShouldShowBanner] = useState<boolean>(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'other'>('other');
  const [browser, setBrowser] = useState<'safari' | 'chrome' | 'edge' | 'firefox' | 'other'>('other');

  useEffect(() => {
    // 1. Detect platform & browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);
    const isDesktopDevice = !isIOSDevice && !isAndroidDevice;

    if (isIOSDevice) setPlatform('ios');
    else if (isAndroidDevice) setPlatform('android');
    else if (isDesktopDevice) setPlatform('desktop');
    else setPlatform('other');

    if (/safari/.test(userAgent) && !/chrome|chromium|edg/.test(userAgent)) {
      setBrowser('safari');
    } else if (/edg/.test(userAgent)) {
      setBrowser('edge');
    } else if (/chrome|chromium|crios/.test(userAgent)) {
      setBrowser('chrome');
    } else if (/firefox|fxios/.test(userAgent)) {
      setBrowser('firefox');
    } else {
      setBrowser('other');
    }

    // 2. Check if already running in standalone mode (installed)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // 3. Listen for beforeinstallprompt event (Chromium browsers: Android Chrome/Edge, Desktop Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user previously dismissed in the last 24 hours
      const dismissedAt = localStorage.getItem('auraledger_pwa_dismissed_at');
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      if (!dismissedAt || (now - parseInt(dismissedAt, 10)) > oneDay) {
        setShouldShowBanner(true);
      }
    };

    // 4. Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShouldShowBanner(false);
      setShowModal(false);
      localStorage.setItem('auraledger_pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS / Android and not standalone, check if we should show prompt
    const previouslyInstalled = localStorage.getItem('auraledger_pwa_installed') === 'true';
    if (previouslyInstalled) {
      setIsInstalled(true);
    } else if (!isStandalone) {
      const dismissedAt = localStorage.getItem('auraledger_pwa_dismissed_at');
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (!dismissedAt || (now - parseInt(dismissedAt, 10)) > oneDay) {
        // Show after a gentle 1.5s delay so the dashboard loads smoothly
        const timer = setTimeout(() => {
          setShouldShowBanner(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_guide'> => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShouldShowBanner(false);
          setShowModal(false);
          setDeferredPrompt(null);
          localStorage.setItem('auraledger_pwa_installed', 'true');
          return 'accepted';
        } else {
          dismissPrompt();
          return 'dismissed';
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setShowModal(true);
        return 'manual_guide';
      }
    } else {
      // For iOS Safari or browsers without beforeinstallprompt, open visual guide modal
      setShowModal(true);
      return 'manual_guide';
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setShouldShowBanner(false);
    localStorage.setItem('auraledger_pwa_dismissed_at', Date.now().toString());
  }, []);

  return {
    isInstallable: !isStandalone && !isInstalled,
    isInstalled,
    isStandalone,
    platform,
    browser,
    promptInstall,
    showModal,
    setShowModal,
    dismissPrompt,
    shouldShowBanner: shouldShowBanner && !isStandalone && !isInstalled,
    hasDeferredPrompt: !!deferredPrompt,
  };
}
