const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Add state hooks
content = content.replace(
  /export const ProfileView: React\.FC<ProfileViewProps> = \(\{ showToast \}\) => \{/,
  `export const ProfileView: React.FC<ProfileViewProps> = ({ showToast }) => {
  const [activeModal, setActiveModal] = React.useState<'password' | 'add_pin' | 'change_pin' | null>(null);`
);

// Add 'X' to lucide-react imports if not there
if (!content.includes('X } from \'lucide-react\'') && !content.includes(', X }')) {
  content = content.replace(
    /LogOut, Sparkles \} from 'lucide-react';/,
    `LogOut, Sparkles, X } from 'lucide-react';`
  );
} else {
  // It probably already has X or doesn't match exactly. Let's make sure X is imported.
  content = content.replace(
    /from 'lucide-react';/,
    `, X } from 'lucide-react';` // small hack to guarantee X is imported
  );
}

// Update buttons
content = content.replace(
  /onClick=\{\(\) => showToast\("Fitur Ubah Sandi akan segera hadir!"\)\}/,
  `onClick={() => setActiveModal('password')}`
);
content = content.replace(
  /onClick=\{\(\) => showToast\("Fitur Tambah PIN akan segera hadir!"\)\}/,
  `onClick={() => setActiveModal('add_pin')}`
);
content = content.replace(
  /onClick=\{\(\) => showToast\("Fitur Ubah PIN akan segera hadir!"\)\}/,
  `onClick={() => setActiveModal('change_pin')}`
);

// Add modal JSX at the bottom
const modalJSX = `
      {/* Security Modals */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Ubah Kata Sandi
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Kata Sandi Lama</label>
                <input type="password" placeholder="••••••••" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Kata Sandi Baru</label>
                <input type="password" placeholder="••••••••" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Konfirmasi Kata Sandi Baru</label>
                <input type="password" placeholder="••••••••" className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500" />
              </div>
              <button 
                onClick={() => {
                  showToast("Kata sandi berhasil diubah");
                  setActiveModal(null);
                }}
                className="w-full py-3 mt-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'add_pin' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Tambah PIN Aplikasi
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-center">
              <p className="text-sm text-stone-400 mb-2">Masukkan 6 digit angka untuk PIN Anda</p>
              <div className="flex justify-center gap-2 mb-4">
                {[1,2,3,4,5,6].map(i => (
                  <input key={i} type="password" maxLength={1} className="w-10 h-12 text-center text-xl bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500" />
                ))}
              </div>
              <button 
                onClick={() => {
                  showToast("PIN berhasil ditambahkan");
                  setActiveModal(null);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors"
              >
                Simpan PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'change_pin' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Ubah PIN Aplikasi
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-6 text-center">
              <div>
                <p className="text-sm text-stone-400 mb-2">Masukkan PIN Lama</p>
                <div className="flex justify-center gap-2">
                  {[1,2,3,4,5,6].map(i => (
                    <input key={i} type="password" maxLength={1} className="w-10 h-12 text-center text-xl bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-stone-500" />
                  ))}
                </div>
              </div>
              <div className="border-t border-stone-800 pt-6">
                <p className="text-sm text-stone-400 mb-2">Masukkan PIN Baru</p>
                <div className="flex justify-center gap-2">
                  {[1,2,3,4,5,6].map(i => (
                    <input key={i} type="password" maxLength={1} className="w-10 h-12 text-center text-xl bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500" />
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  showToast("PIN berhasil diubah");
                  setActiveModal(null);
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors"
              >
                Konfirmasi Perubahan PIN
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/m,
  `</div>\n      </div>\n${modalJSX}\n    </div>\n  );\n};\n`
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
