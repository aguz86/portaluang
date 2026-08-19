const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const profileBtn = `
          {/* Profile Button */}
          <button
            onClick={() => {
              navigate('/app/profile');
              setIsMobileMenuOpen(false);
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Profil Pengguna"
          >
            <User className="w-3.5 h-3.5 text-stone-400" />
          </button>
`;

content = content.replace(
  /\{\/\* Quick Add Transaction \*\/\}/,
  profileBtn + '\n          {/* Quick Add Transaction */}'
);

fs.writeFileSync('src/components/Navbar.tsx', content);
