const fs = require('fs');

const path = 'src/components/Navbar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace standard imports
if (!content.includes('Menu,')) {
    content = content.replace('X, Clock', 'Menu, X, Clock');
}

// Ensure Menu is imported
if (!content.includes('Menu')) {
   content = content.replace('lucide-react\';', 'Menu, lucide-react\';');
}

const componentStart = content.indexOf('export const Navbar: React.FC<NavbarProps> = (');
const returnStart = content.indexOf('  return (', componentStart);
const componentEnd = content.lastIndexOf('};');

const beforeReturn = content.substring(0, returnStart);

const newReturn = `
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="bg-stone-900 text-stone-100 flex flex-col md:w-64 md:h-screen md:sticky md:top-0 md:border-r border-stone-800 border-b md:border-b-0 z-40 no-print md:overflow-y-auto shrink-0 shadow-md transition-all">
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
        <div className={\`\${isMobileMenuOpen ? 'flex absolute top-full left-0 right-0 bg-stone-900 border-b border-stone-800 shadow-xl max-h-[80vh] overflow-y-auto' : 'hidden'} md:flex md:static md:max-h-none md:shadow-none md:border-none flex-col flex-1 p-4 pt-0 md:px-4 md:pb-6 gap-6 z-40\`}>
          
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
                className={\`py-2 px-2 rounded-xl border font-bold flex items-center justify-center transition-all text-xs \${
                  Math.abs(unassignedCash) < 1
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
                    : unassignedCash > 0
                    ? 'bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60'
                    : 'bg-rose-950/60 border-rose-700/60 text-rose-300 hover:bg-rose-900/60'
                }\`}
              >
                {unassignedCash > 0 ? \`+\${formatRupiah(unassignedCash)}\` : formatRupiah(unassignedCash)}
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
                  className={\`relative px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-all \${
                    isActive
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold"
                      : "text-stone-400 font-medium hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                  }\`}
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
              className={\`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all \${
                sub.planId === 'free_trial'
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20'
                  : sub.planId === 'annual'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
              }\`}
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

        {/* Notifications (Absolute Overlay handled differently now, or simple bell?) */}
        {/* We can put the Bell next to hamburger if we want, but keeping it simple for now */}
      </header>
    </>
  );
};
`;

const newContent = beforeReturn + newReturn;
fs.writeFileSync(path, newContent, 'utf8');

