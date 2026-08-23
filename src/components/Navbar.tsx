import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { ActiveTab, ThemeMode, formatRupiah, Bill, Transaction, BudgetCategory, NotificationSettings } from '../types';
import { getUserSubscription, getRemainingTimeDisplay } from '../utils/subscription';
import { 
  LayoutDashboard, 
  Calculator, 
  ReceiptText, 
  CalendarDays, 
  Target, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  BookOpen, 
  Plus, 
  Sparkles, 
  HardDrive, 
  Download,
  RotateCcw,
  Palette,
  Settings,
  User, Bell, AlertTriangle, Calendar, Info, X, Clock, Zap, Crown , Menu } from 'lucide-react';

interface NavbarProps {
  isStandalone?: boolean;
  themeMode: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
  onOpenQuickAdd: () => void;
  onOpenAiAdvisor: () => void;
  onOpenBackupModal: () => void;
  onResetData: () => void;
  unassignedCash: number;
  hasDueBills?: boolean;
  isCloudSyncing?: boolean;
  bills?: Bill[];
  transactions?: Transaction[];
  budgetCategories?: BudgetCategory[];
  notificationSettings?: NotificationSettings;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  themeMode,
  setThemeMode,
  onOpenQuickAdd,
  onOpenAiAdvisor,
  onOpenBackupModal,
  onResetData,
  unassignedCash,
  hasDueBills = false,
  isCloudSyncing,
  bills = [],
  transactions = [],
  budgetCategories = [],
  notificationSettings,
  onOpenInstallModal,
  isStandalone = false,
}) => {
  const location = useLocation();
  const { settings } = useGlobalSettings();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const [sub, setSub] = useState(() => getUserSubscription());
  useEffect(() => {
    setSub(getUserSubscription());
  }, [location.pathname]);

  const remaining = getRemainingTimeDisplay(sub.expiresAt);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  
  const notifications = React.useMemo(() => {
    const notifs = [];
    const today = new Date();
    const reminderDays = notificationSettings?.dueReminderDays || 3;
    let notifId = 1;

    // 1. Cek Tagihan (Bills)
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    bills.forEach(bill => {
      if (bill.isPaid) return;
      
      // Hitung tanggal jatuh tempo bulan ini
      const due = new Date(today.getFullYear(), today.getMonth(), bill.dueDate);
      const diffTime = due.getTime() - todayMidnight.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= reminderDays && diffDays >= 0) {
        notifs.push({
          id: notifId++,
          title: diffDays === 0 ? 'Jatuh Tempo Hari Ini' : 'Waktunya Bayar',
          desc: `Tagihan ${bill.name} sebesar Rp ${bill.amount.toLocaleString('id-ID')} jatuh tempo ${diffDays === 0 ? 'hari ini' : `dalam ${diffDays} hari`}.`,
          type: diffDays === 0 ? 'danger' : 'warning',
          icon: diffDays === 0 ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Calendar className="w-4 h-4 text-amber-400" />,
          time: diffDays === 0 ? 'Hari ini' : `${diffDays} hari lagi`,
          path: '/app/bills'
        });
      } else if (diffDays < 0) {
        const lateDays = Math.abs(diffDays);
        notifs.push({
          id: notifId++,
          title: 'Tagihan Terlewat',
          desc: `Tagihan ${bill.name} sebesar Rp ${bill.amount.toLocaleString('id-ID')} telah lewat jatuh tempo (Telat ${lateDays} hari).`,
          type: 'danger',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          time: `Telat ${lateDays} hari`,
          path: '/app/bills'
        });
      }
    });

    // 2. Cek Anggaran Berlebih (Overbudget)
    budgetCategories.forEach(cat => {
      const spent = transactions
        .filter(t => t.category === cat.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      if (spent > cat.planned && cat.planned > 0) {
        notifs.push({
          id: notifId++,
          title: 'Anggaran Berlebih',
          desc: `Kategori ${cat.name} melebihi batas (${Math.round((spent/cat.planned)*100)}%).`,
          type: 'danger',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          time: 'Baru saja',
          path: '/app/budget'
        });
      }
    });

    // 3. Mock Langganan (karena tidak ada di data, kita munculkan sesuai preferensi hari)
    if (reminderDays >= 3) {
      notifs.push({
        id: notifId++,
        title: 'Perpanjang Langganan',
        desc: `Waktunya perpanjang langganan Premium Pro dalam ${reminderDays} hari.`,
        type: 'info',
        icon: <Info className="w-4 h-4 text-blue-400" />,
        time: 'Baru saja',
        path: '/app/settings'
      });
    }

    return notifs;
  }, [bills, transactions, budgetCategories, notificationSettings]);


  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (scrollContainerRef.current) {
        const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]') as HTMLElement;
        if (activeEl) {
          const container = scrollContainerRef.current;
          const containerRect = container.getBoundingClientRect();
          const activeRect = activeEl.getBoundingClientRect();
          
          const scrollPos = container.scrollLeft + activeRect.left - containerRect.left - (containerRect.width / 2) + (activeRect.width / 2);
          
          container.scrollTo({ left: scrollPos, behavior: 'smooth' });
        }
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [currentPath]);

      const themeOptions: { id: ThemeMode; label: string; badge: string; color: string }[] = [
    { id: 'amber_dark', label: 'Warm Amber Dark', badge: 'Monochrome', color: 'bg-amber-500' },
    { id: 'wordpress_blue', label: 'Deep Navy Blue', badge: 'Biru Navy', color: 'bg-blue-800' },
    { id: 'aurora_finance', label: 'Aurora Finance', badge: 'Glassmorphism', color: 'bg-cyan-400' },
    { id: 'wealth_elite', label: 'Wealth Elite', badge: 'Hitam-Emas', color: 'bg-yellow-500' },
    { id: 'cyber_matrix', label: 'Cyber Matrix', badge: 'Cyberpunk', color: 'bg-lime-400' },
    { id: 'mono_matrix', label: 'Mono Matrix', badge: 'Black & White', color: 'bg-white' },
    { id: 'retro_pixel', label: 'Retro Pixel Pink', badge: 'Arcade Pink', color: 'bg-pink-500' },
  ];

  const navItems: { id: ActiveTab; path: string; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', path: '/app/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'zero_based', path: '/app/budget', label: 'Anggaran Berbasis Nol', icon: <Calculator className="w-4 h-4" /> },
    { id: 'transactions', path: '/app/transactions', label: 'Transaksi', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'bills', path: '/app/bills', label: 'Kalender Tagihan', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'sinking_funds', path: '/app/goals', label: 'Pos Sinking Fund', icon: <Target className="w-4 h-4" /> },
    { id: 'accounts_debt', path: '/app/accounts', label: 'Rekening & Hutang', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'investments', path: '/app/investments', label: 'Investasi', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'net_worth', path: '/app/net-worth', label: 'Kekayaan Bersih', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'payday', path: '/app/payday', label: 'Perencana Gajian', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'reports', path: '/app/reports', label: 'Laporan Finansial', icon: <PieChart className="w-4 h-4" /> },
    { id: 'guide', path: '/app/guide', label: 'Panduan', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  return (
    <>
      <header className="bg-stone-900 text-stone-100 flex flex-col md:w-64 md:h-screen sticky top-0 md:border-r border-stone-800 border-b md:border-b-0 z-40 no-print md:overflow-y-auto shrink-0 shadow-md transition-all">
        {/* Mobile Header (Brand + Hamburger) */}
        <div className="flex items-center justify-between p-4 md:px-5 md:py-6 relative z-50 bg-stone-900">
          <Link to="/app/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner shrink-0">
              PU
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-lg tracking-tight">{settings.appName}</h1>
              </div>
              {isCloudSyncing ? (
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Menyinkronkan...
                </span>
              ) : (
                <span className="text-[10px] font-medium text-stone-500 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Tersimpan lokal
                </span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-2 md:hidden">
            
            {/* Notification Bell */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800/50 rounded-lg border border-stone-700/50 relative"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-black/20 md:hidden"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-72 md:w-80 max-h-[60vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-50 p-2 custom-scrollbar">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-stone-800/50 mb-2">
                      <span className="font-bold text-sm">Notifikasi</span>
                      {notifications.length > 0 && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">
                          {notifications.length} Baru
                        </span>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-stone-500 text-xs">Belum ada notifikasi</div>
                    ) : notifications.map(notif => (
                      <div 
                        key={notif.id}
                        className="p-2.5 rounded-lg hover:bg-stone-800/50 transition-colors flex gap-3 cursor-pointer"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          if (notif.path) navigate(notif.path);
                        }}
                      >
                        <div className="shrink-0 mt-0.5 text-stone-400">
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-stone-200 truncate">{notif.title}</h4>
                          <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2">{notif.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => navigate('/app/profile')}
              className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800/50 rounded-lg border border-stone-700/50"
            >
              <User className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800 rounded-lg border border-stone-700"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
            </button>
          </div>
        </div>

        {/* Content Drawer (Mobile) / Sidebar (Desktop) */}
        <div className={`\${isMobileMenuOpen ? 'flex absolute top-full left-0 right-0 bg-stone-900 border-b border-stone-800 shadow-xl max-h-[80vh] overflow-y-auto' : 'hidden'} md:flex md:static md:max-h-none md:shadow-none md:border-none flex-col flex-1 p-4 pt-0 md:px-4 md:pb-6 gap-6 z-40`}>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onOpenQuickAdd}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Tambah Catatan
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenAiAdvisor}
                className="py-2 px-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-all text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AI Advisor
              </button>
              <button
                onClick={() => navigate('/app/budget')}
                className={`py-2 px-2 rounded-xl border font-bold flex items-center justify-center transition-all text-xs \${
                  Math.abs(unassignedCash) < 1
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                    : unassignedCash > 0
                    ? 'bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                    : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
                }`}
              >
                {unassignedCash > 0 ? `+\${formatRupiah(unassignedCash)}` : formatRupiah(unassignedCash)}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 flex-1">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 px-2">Menu Utama</div>
            {navItems.map((item) => {
              const isActive = currentPath.startsWith(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`relative px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-all \${
                    isActive
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold"
                      : "text-stone-400 font-medium hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                  }`}
                >
                  <span className={isActive ? "text-amber-400" : "text-stone-500"}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === "bills" && hasDueBills && (
                    <span className="ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-stone-800 flex flex-col gap-3">
            {/* Subscription Pill */}
            <button
              onClick={() => navigate('/app/profile')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all \${
                sub.planId === 'free_trial'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                  : sub.planId === 'annual'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {sub.planId === 'free_trial' ? <Clock className="w-3.5 h-3.5" /> : sub.planId === 'annual' ? <Crown className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{sub.planName}</span>
              </div>
              <span className="opacity-70 text-[10px]">{remaining.text}</span>
            </button>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => navigate('/app/settings')}
                className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center gap-2 transition-colors text-xs font-semibold"
              >
                <Settings className="w-4 h-4" /> Pengaturan
              </button>
              
              <div className="flex gap-1">
                
                {/* Desktop Notification Bell */}
                <div className="relative hidden md:block" ref={notificationsRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors relative"
                    title="Notifikasi"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </button>
                  
                  {isNotificationsOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-72 max-h-[60vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-50 p-2 custom-scrollbar">
                      <div className="px-3 py-2 flex items-center justify-between border-b border-stone-800/50 mb-2">
                        <span className="font-bold text-sm">Notifikasi</span>
                        {notifications.length > 0 && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">
                            {notifications.length} Baru
                          </span>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-stone-500 text-xs">Belum ada notifikasi</div>
                      ) : notifications.map(notif => (
                        <div 
                          key={notif.id}
                          className="p-2.5 rounded-lg hover:bg-stone-800/50 transition-colors flex gap-3 cursor-pointer"
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            if (notif.path) navigate(notif.path);
                          }}
                        >
                          <div className="shrink-0 mt-0.5 text-stone-400">
                            {notif.icon}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <h4 className="text-xs font-bold text-stone-200 truncate">{notif.title}</h4>
                            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2">{notif.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={onOpenBackupModal}
                  className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
                  title="Cadangkan Data"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={onResetData}
                  className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
                  title="Reset Demo Data"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Install App Button */}
            {onOpenInstallModal && !isStandalone && (
              <button
                onClick={onOpenInstallModal}
                className="w-full mt-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Pasang App
              </button>
            )}
          </div>
        </div>

      </header>
    </>
  );
};
