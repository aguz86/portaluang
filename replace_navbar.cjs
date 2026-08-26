const fs = require('fs');
const content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
const index = content.indexOf('  return (\n    <>');
if (index === -1) {
  console.log("Not found");
  process.exit(1);
}

const before = content.substring(0, index);
const replacement = `  return (
    <>
      {/* Mobile Top Header */}
      <header className="bg-stone-900 border-b border-stone-800 p-4 sticky top-0 z-50 flex items-center justify-between md:hidden shadow-sm">
        <Link to="/app/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg shadow-inner shrink-0">
            PU
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold text-base tracking-tight">{settings.appName}</h1>
            {isCloudSyncing ? (
              <span className="text-[9px] font-medium text-emerald-400 flex items-center gap-1">
                <HardDrive className="w-2.5 h-2.5" /> Syncing...
              </span>
            ) : (
              <span className="text-[9px] font-medium text-stone-500 flex items-center gap-1">
                <HardDrive className="w-2.5 h-2.5" /> Lokal
              </span>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2">
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
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
                <div 
                  className="fixed inset-0 bg-black/40"
                  onClick={() => setIsNotificationsOpen(false)}
                />
                <div className="relative w-full max-w-sm max-h-[60vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-50 p-2 custom-scrollbar">
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
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Horizontal Navigation */}
      <div className="bg-stone-900 border-b border-stone-800 sticky top-[65px] z-40 md:hidden shadow-sm">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto hide-scrollbar px-4 py-3 gap-2 snap-x"
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

      {/* Mobile FAB for Quick Add */}
      <button
        onClick={onOpenQuickAdd}
        className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 border-4 border-stone-950"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-900 h-screen sticky top-0 border-r border-stone-800 shadow-xl z-40 shrink-0">
        <div className="p-6">
          <Link to="/app/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xl shadow-inner shrink-0">
              PU
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-lg tracking-tight">{settings.appName}</h1>
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

          <div className="flex flex-col gap-3">
            <button
              onClick={onOpenQuickAdd}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
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
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 flex flex-col gap-1 pb-6">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 px-2 mt-2">Menu Utama</div>
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

        <div className="p-4 border-t border-stone-800 flex flex-col gap-3">
          {/* Subscription Pill */}
          <Link to="/app/settings" className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 hover:from-amber-500/20 hover:to-orange-500/20 transition-all group">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-stone-200 truncate">Premium Pro</h4>
              <p className="text-[10px] text-amber-400 truncate">Sisa 24 Hari</p>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-500" />
          </Link>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors flex items-center justify-center gap-2 border border-transparent hover:border-stone-700/50"
            >
              <Settings className="w-3.5 h-3.5" /> Pengaturan
            </button>
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 rounded-lg border border-transparent hover:border-stone-700/50 transition-colors relative"
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
                <div className="absolute bottom-full left-0 mb-2 w-80 max-h-[60vh] overflow-y-auto bg-stone-900 border border-stone-800 rounded-xl shadow-2xl z-50 p-2 custom-scrollbar">
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
      </aside>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsView 
          onClose={() => setIsSettingsOpen(false)} 
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          onOpenBackupModal={onOpenBackupModal}
          onResetData={onResetData}
        />
      )}
    </>
  );
};`;

fs.writeFileSync('src/components/Navbar.tsx', before + replacement);
