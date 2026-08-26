const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Remove settings from navItems
content = content.replace(
  /\s*\{\s*id:\s*'settings',\s*path:\s*'\/app\/settings',\s*label:\s*'Pengaturan & Notifikasi',\s*icon:\s*<Settings className="w-4 h-4" \/>\s*\},/g,
  ''
);

// Add Settings button before Profile button
const settingsButton = `
          {/* Settings Button */}
          <button
            onClick={() => navigate('/app/settings')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Pengaturan & Notifikasi"
          >
            <Settings className="w-3.5 h-3.5 text-stone-400" />
          </button>
`;

content = content.replace(
  /\s*{\/\* Profile Button \*\/}/,
  settingsButton + '\n          {/* Profile Button */}'
);

fs.writeFileSync('src/components/Navbar.tsx', content);
