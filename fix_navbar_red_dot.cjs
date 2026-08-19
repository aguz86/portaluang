const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  /<span className="absolute -top-1 -right-1 flex h-3 w-3">\s*<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"><\/span>\s*<span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-stone-900"><\/span>\s*<\/span>/,
  `{notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-stone-900"></span>
                </span>
              )}`
);

content = content.replace(
  /<span className="text-\[10px\] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500\/20 text-rose-400 border border-rose-500\/30">\s*\{notifications.length\} Baru\s*<\/span>/,
  `{notifications.length > 0 && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {notifications.length} Baru
                    </span>
                  )}`
);

// If no notifications, show empty state message
content = content.replace(
  /\{notifications\.map\(notif => \(/,
  `{notifications.length === 0 ? (
                    <div className="p-4 text-center text-stone-500 text-sm">Belum ada notifikasi</div>
                  ) : notifications.map(notif => (`
);

content = content.replace(
  /\)\)\}\s*<\/div>/,
  `))}\n                </div>`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
