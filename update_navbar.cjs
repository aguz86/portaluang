const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Find the return statement
const returnIndex = content.indexOf('  return (');
if (returnIndex === -1) {
  console.log("Could not find return statement");
  process.exit(1);
}

const beforeReturn = content.substring(0, returnIndex);

const newRender = `  return (
    <>
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-50 w-full shadow-sm">
        {/* Top Row: Brand & Actions */}
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
          <Link to="/app/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner shrink-0">
              PU
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-lg tracking-tight leading-none mb-1">{settings.appName}</h1>
              {isCloudSyncing ? (
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 leading-none">
                  <HardDrive className="w-3 h-3" /> Menyinkronkan...
                </span>
              ) : (
                <span className="text-[10px] font-medium text-stone-500 flex items-center gap-1 leading-none">
                  <HardDrive className="w-3 h-3" /> Tersimpan lokal
                </span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2 mr-2">
              <button
                onClick={onOpenQuickAdd}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 text-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                Tambah Catatan
              </button>
              <button
                onClick={onOpenAiAdvisor}
                className="py-2 px-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-all text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                AI Advisor
              </button>
              <button
                onClick={() => navigate('/app/budget')}
                className={\`py-2 px-3 rounded-xl border font-bold flex items-center justify-center transition-all text-xs \${
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

            {/* Common Actions */}
            <button 
              onClick={() => navigate('/app/settings')}
              className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800/50 rounded-lg border border-stone-700/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800/50 rounded-lg border border-stone-700/50 relative transition-colors"
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
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: Horizontal Navigation */}
        <div className="border-t border-stone-800/50">
          <div className="max-w-7xl mx-auto w-full">
            <div 
              ref={scrollContainerRef}
              className="flex overflow-x-auto hide-scrollbar px-4 py-2 gap-2 snap-x"
            >
              {navItems.map((item) => {
                const isActive = currentPath.startsWith(item.path);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    data-active={isActive}
                    className={\`snap-center shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border \${
                      isActive 
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                        : 'bg-stone-800/50 text-stone-400 border-transparent hover:bg-stone-800'
                    }\`}
                  >
                    {item.icon}
                    {item.label}
                    {item.id === "bills" && hasDueBills && (
                      <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500 top-0.5 left-0.5"></span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile FAB for Quick Add */}
      <button
        onClick={onOpenQuickAdd}
        className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 border-4 border-stone-950"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>
    </>
  );
};
`;

fs.writeFileSync('src/components/Navbar.tsx', beforeReturn + newRender);
console.log("Navbar updated");
