const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const notifRenderDesktop = `
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
`;

// Insert into desktop footer before Backup Data button
content = content.replace(
  '<button\n                  onClick={onOpenBackupModal}',
  notifRenderDesktop + '\n                <button\n                  onClick={onOpenBackupModal}'
);

fs.writeFileSync('src/components/Navbar.tsx', content, 'utf8');
