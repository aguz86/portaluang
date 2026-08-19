const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

const securitySection = `
          {/* Security Settings */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2 mb-4 border-b border-stone-800 pb-3">
              <Shield className="w-5 h-5 text-amber-500" />
              Keamanan Akun
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-200 text-sm mb-1">Kata Sandi</h4>
                    <p className="text-xs text-stone-500 mb-3">Terakhir diubah 3 bulan lalu.</p>
                    <button 
                      onClick={() => showToast("Fitur Ubah Sandi akan segera hadir!")}
                      className="text-xs font-semibold text-stone-900 bg-stone-200 hover:bg-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Ubah Sandi
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 text-stone-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-200 text-sm mb-1">PIN Aplikasi</h4>
                    <p className="text-xs text-stone-500 mb-3">Gunakan PIN untuk akses cepat & aman.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => showToast("Fitur Tambah PIN akan segera hadir!")}
                        className="text-xs font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Tambah PIN
                      </button>
                      <button 
                        onClick={() => showToast("Fitur Ubah PIN akan segera hadir!")}
                        className="text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Ubah PIN
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
`;

content = content.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/m,
  `</div>\n          </div>\n${securitySection}\n        </div>\n      </div>\n    </div>\n  );\n};\n`
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
