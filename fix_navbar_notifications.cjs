const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Import Bell
if (!content.includes('Bell,')) {
  content = content.replace(
    /User\s*\} from 'lucide-react';/,
    "User, Bell, AlertTriangle, Calendar, Info } from 'lucide-react';"
  );
}

// Add state for notifications dropdown
if (!content.includes('isNotificationsOpen')) {
  content = content.replace(
    /const \[isThemeMenuOpen, setIsThemeMenuOpen\] = useState\(false\);/,
    `const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, title: 'Waktunya Bayar', desc: 'Tagihan Listrik bulan ini jatuh tempo esok hari.', type: 'warning', icon: <Calendar className="w-4 h-4 text-amber-400" />, time: '2 jam yang lalu' },
    { id: 2, title: 'Jatuh Tempo', desc: 'Cicilan KPR Anda jatuh tempo hari ini.', type: 'danger', icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, time: '5 jam yang lalu' },
    { id: 3, title: 'Anggaran Berlebih', desc: 'Kategori Makanan & Minuman telah melebihi batas 110%.', type: 'danger', icon: <AlertTriangle className="w-4 h-4 text-rose-400" />, time: '1 hari yang lalu' },
    { id: 4, title: 'Perpanjang Langganan', desc: 'Waktunya perpanjang langganan Premium Pro dalam 3 hari.', type: 'info', icon: <Info className="w-4 h-4 text-blue-400" />, time: '2 hari yang lalu' }
  ];
`
  );
}

// Add bell button
const bellButton = `
          {/* Notifications Button */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Notifikasi"
            >
              <Bell className="w-3.5 h-3.5 text-stone-400" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-stone-900"></span>
              </span>
            </button>
            
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl z-50 animate-fadeIn custom-scrollbar">
                <div className="sticky top-0 bg-stone-900/95 backdrop-blur-sm z-10 border-b border-stone-800 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-bold text-stone-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    Notifikasi
                  </h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    4 Baru
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {notifications.map(notif => (
                    <div key={notif.id} className="p-3 rounded-xl hover:bg-stone-800/50 transition-colors border border-transparent hover:border-stone-800 flex gap-3 group cursor-pointer">
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
                    Tandai Semua Dibaca
                  </button>
                </div>
              </div>
            )}
          </div>
`;

content = content.replace(
  /\{\/\* Settings Button \*\/\}/,
  bellButton + '\n          {/* Settings Button */}'
);

fs.writeFileSync('src/components/Navbar.tsx', content);
