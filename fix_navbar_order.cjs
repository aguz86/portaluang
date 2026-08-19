const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const oldSection = `          {/* Settings Button */}
          <button
            onClick={() => navigate('/app/settings')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Pengaturan & Notifikasi"
          >
            <Settings className="w-3.5 h-3.5 text-stone-400" />
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

          {/* Quick Add Transaction */}
          <button
            onClick={onOpenQuickAdd}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Tambah Catatan</span>
          </button>

          {/* Backup / Export */}
          <button
            onClick={onOpenBackupModal}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors border border-stone-800"
            title="Cadangkan & Pulihkan Data"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset Demo Data */}
          <button
            onClick={onResetData}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors border border-stone-800"
            title="Reset ke Data Contoh Indonesia"
          >
            <RotateCcw className="w-4 h-4" />
          </button>`;

const newSection = `          {/* Reset Demo Data */}
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
          </button>`;

content = content.replace(oldSection, newSection);
fs.writeFileSync('src/components/Navbar.tsx', content);
