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
  User, Bell, AlertTriangle, Calendar, Info, X, Clock, Zap, Crown } from 'lucide-react';

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
  isStkamulone?: boolean;
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
  isStkamulone = false,
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

  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-40 shadow-md no-print">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/app/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner">
            PU
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight text-stone-100">{settings.appName}</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Cloud Database
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">Aplikasi Manajemen Keuangan & Anggaran Berbasis Nol</p>
          </div>
        </Link>

        {/* Action Buttons & Quick Stats */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Zero-Based Status Pill */}
          <button
            onClick={() => navigate('/app/budget')}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
              Math.abs(unassignedCash) < 1
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                : unassignedCash > 0
                ? 'bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
            }`}
            title="Status Anggaran Berbasis Nol"
          >
            <span className="font-mono font-bold">
              {unassignedCash > 0 ? `+${formatRupiah(unassignedCash)}` : formatRupiah(unassignedCash)}
            </span>
            <span className="opacity-80 hidden md:inline">
              {Math.abs(unassignedCash) < 1 ? 'Teralokasi Sempurna (Rp0)' : unassignedCash > 0 ? 'Belum Dialokasikan' : 'Overbudget'}
            </span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAiAdvisor}
            className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Tanya {settings.aiName || 'Portal Uang Advisor'}</span>
          </button>

          {/* Theme Switcher Button */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Pilih Tema Tampilan"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Tema</span>
            </button>

            {isThemeMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 sm:hidden animate-fadeIn" 
                  onClick={() => setIsThemeMenuOpen(false)} 
                />
                <div className="fixed sm:absolute top-28 sm:top-full left-4 right-4 sm:left-auto sm:right-0 sm:mt-2 sm:w-64 max-h-[75vh] sm:max-h-80 overflow-y-auto bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                  <div className="text-[10px] uppercase font-bold text-stone-400 px-3 py-1.5 border-b border-stone-800 mb-1 sticky top-0 bg-stone-900 z-10 flex items-center justify-between">
                    <span>Pilih Tema Aplikasi</span>
                    <button 
                      onClick={() => setIsThemeMenuOpen(false)}
                      className="sm:hidden p-0.5 text-stone-400 hover:text-stone-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setThemeMode(opt.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        themeMode === opt.id
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                        <span>{opt.label}</span>
                      </div>
                      <span className="text-[9px] text-stone-500">{opt.badge}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Notifications Button */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Notifikasi"
            >
              <Bell className="w-3.5 h-3.5 text-stone-400" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-stone-900"></span>
                </span>
              )}
            </button>
            
            {isNotificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 sm:hidden animate-fadeIn" 
                  onClick={() => setIsNotificationsOpen(false)} 
                />
                <div className="fixed sm:absolute top-28 sm:top-full left-4 right-4 sm:left-auto sm:right-0 sm:mt-2 sm:w-80 max-h-[75vh] sm:max-h-[28rem] overflow-y-auto bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl z-50 animate-fadeIn custom-scrollbar">
                  <div className="sticky top-0 bg-stone-900/95 backdrop-blur-sm z-10 border-b border-stone-800 px-4 py-3 flex items-center justify-between">
                    <h3 className="font-bold text-stone-100 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      Notifikasi
                    </h3>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {notifications.length} Baru
                        </span>
                      )}
                      <button 
                        onClick={() => setIsNotificationsOpen(false)}
                        className="sm:hidden p-1 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors"
                        aria-label="Tutup"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-stone-500 text-sm">Belum ada notifikasi</div>
                    ) : notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        className="p-3 rounded-xl hover:bg-stone-800/50 transition-colors border border-transparent hover:border-stone-800 flex gap-3 group cursor-pointer"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          if (notif.path) navigate(notif.path);
                        }}
                      >
                        <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-stone-950 border border-stone-800 group-hover:bg-stone-800 transition-colors">
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-0.5">
                            <h4 className="text-sm font-bold text-stone-200 truncate">{notif.title}</h4>
                          </div>
                          <p className="text-xs text-stone-400 leading-relaxed mb-1.5">{notif.desc}</p>
                          <p className="text-[10px] font-semibold text-stone-600">{notif.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sticky bottom-0 bg-stone-900 border-t border-stone-800 p-2">
                    <button 
                      onClick={() => setIsNotificationsOpen(false)}
                      className="w-full py-2 text-xs font-bold text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                      Tkamui Semua Dibaca
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reset Demo Data */}
          <button
            onClick={onResetData}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors border border-stone-800"
            title="Reset ke Data Contoh Indonesia"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Backup / Export */}
          <button
            onClick={onOpenBackupModal}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors border border-stone-800"
            title="Cadangkan & Pulihkan Data"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Subscription Status Pill */}
          <button
            onClick={() => navigate('/app/profile')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
              sub.planId === 'free_trial'
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
                : sub.planId === 'annual'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
            }`}
            title={`Paket Aktif: ${sub.planName} (${remaining.text})`}
          >
            {sub.planId === 'free_trial' ? (
              <Clock className="w-3 h-3 text-blue-400" />
            ) : sub.planId === 'annual' ? (
              <Crown className="w-3 h-3 text-amber-400" />
            ) : (
              <Zap className="w-3 h-3 text-emerald-400" />
            )}
            <span>{sub.planName}</span>
            <span className="opacity-70 text-[10px]">({remaining.text})</span>
          </button>

          {/* Install App Button (Visible if not stkamulone) */}
          {onOpenInstallModal && !isStkamulone && (
            <button
              onClick={onOpenInstallModal}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Pasang Portal Uang di Perangkat (PWA)"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Pasang App</span>
            </button>
          )}

          {/* Quick Add Transaction */}
          <button
            onClick={onOpenQuickAdd}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Tambah Catatan</span>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => {
              navigate('/app/profile');
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Profil Pengguna"
          >
            <User className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => navigate('/app/settings')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Pengaturan & Notifikasi"
          >
            <Settings className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar */}
      <div 
        ref={scrollContainerRef}
        className="border-t border-stone-800/80 bg-stone-950/50 overflow-x-auto custom-scrollbar pb-1"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 min-w-max pt-1.5 pb-0.5">
                    {navItems.map((item) => {
            const isActive = currentPath.startsWith(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                data-active={isActive}
                className={`relative px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50 font-bold shadow-sm shadow-amber-500/20 drop-shadow-md"
                    : "text-stone-400 font-semibold hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                }`}
              >
                <span className={isActive ? "text-amber-400 drop-shadow-md" : "text-stone-400"}>{item.icon}</span>
                <span className="tracking-wide">{item.label}</span>
                {item.id === "bills" && hasDueBills && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};

