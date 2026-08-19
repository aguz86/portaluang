const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Add pin state
content = content.replace(
  /const \[passwordError, setPasswordError\] = React\.useState\(""\);/,
  `const [passwordError, setPasswordError] = React.useState("");
  const [newPin, setNewPin] = React.useState("");
  const [oldPin, setOldPin] = React.useState("");
  const [pinError, setPinError] = React.useState("");
  const [hasPin, setHasPin] = React.useState(false); // mock state to check if user has PIN
  `
);

// clear pin state on close
content = content.replace(
  /setPasswordError\(""\);\s*\}\}\s*className="text-stone-400/g,
  `setPasswordError("");
    setNewPin("");
    setOldPin("");
    setPinError("");
  }} className="text-stone-400`
);

// update Add PIN modal
const oldAddPin = /<div className="p-5 space-y-4 text-center">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;
const newAddPin = `<div className="p-5 space-y-4 text-center">
              {pinError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs mb-2">
                  {pinError}
                </div>
              )}
              <p className="text-sm text-stone-400 mb-2">Masukkan 6 digit angka untuk PIN Anda</p>
              <div className="flex justify-center gap-2 mb-4">
                {[0,1,2,3,4,5].map(i => (
                  <input 
                    key={i} 
                    id={\`add_pin_\${i}\`}
                    type="password" 
                    maxLength={1} 
                    value={newPin[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!/^\\d*$/.test(val)) return;
                      const nextPin = newPin.split('');
                      nextPin[i] = val;
                      setNewPin(nextPin.join(''));
                      setPinError("");
                      if (val && i < 5) {
                        document.getElementById(\`add_pin_\${i+1}\`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !newPin[i] && i > 0) {
                        document.getElementById(\`add_pin_\${i-1}\`)?.focus();
                      }
                    }}
                    className="w-10 h-12 text-center text-xl bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500" 
                  />
                ))}
              </div>
              <button 
                onClick={() => {
                  if (newPin.length < 6) {
                    setPinError("PIN harus 6 digit.");
                    return;
                  }
                  showToast("PIN berhasil ditambahkan");
                  setHasPin(true);
                  setActiveModal(null);
                  setNewPin("");
                  setPinError("");
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors"
              >
                Simpan PIN
              </button>
            </div>
          </div>
        </div>
      )}`;
content = content.replace(oldAddPin, newAddPin);

// update Change PIN modal
const oldChangePin = /<div className="p-5 space-y-6 text-center">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;
const newChangePin = `<div className="p-5 space-y-4 text-center">
              {pinError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs mb-2">
                  {pinError}
                </div>
              )}
              <div>
                <p className="text-sm text-stone-400 mb-2">Masukkan PIN Lama</p>
                <div className="flex justify-center gap-2 mb-4">
                  {[0,1,2,3,4,5].map(i => (
                    <input 
                      key={i} 
                      id={\`old_pin_\${i}\`}
                      type="password" 
                      maxLength={1} 
                      value={oldPin[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\\d*$/.test(val)) return;
                        const nextPin = oldPin.split('');
                        nextPin[i] = val;
                        setOldPin(nextPin.join(''));
                        setPinError("");
                        if (val && i < 5) {
                          document.getElementById(\`old_pin_\${i+1}\`)?.focus();
                        } else if (val && i === 5) {
                          document.getElementById(\`new_pin_0\`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !oldPin[i] && i > 0) {
                          document.getElementById(\`old_pin_\${i-1}\`)?.focus();
                        }
                      }}
                      className="w-10 h-12 text-center text-xl bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-stone-500" 
                    />
                  ))}
                </div>
              </div>
              <div className="border-t border-stone-800 pt-4">
                <p className="text-sm text-stone-400 mb-2">Masukkan PIN Baru</p>
                <div className="flex justify-center gap-2 mb-4">
                  {[0,1,2,3,4,5].map(i => (
                    <input 
                      key={i} 
                      id={\`new_pin_\${i}\`}
                      type="password" 
                      maxLength={1} 
                      value={newPin[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\\d*$/.test(val)) return;
                        const nextPin = newPin.split('');
                        nextPin[i] = val;
                        setNewPin(nextPin.join(''));
                        setPinError("");
                        if (val && i < 5) {
                          document.getElementById(\`new_pin_\${i+1}\`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !newPin[i] && i > 0) {
                          document.getElementById(\`new_pin_\${i-1}\`)?.focus();
                        } else if (e.key === 'Backspace' && !newPin[i] && i === 0) {
                          document.getElementById(\`old_pin_5\`)?.focus();
                        }
                      }}
                      className="w-10 h-12 text-center text-xl bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500" 
                    />
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (oldPin.length < 6 || newPin.length < 6) {
                    setPinError("Semua PIN harus 6 digit.");
                    return;
                  }
                  if (!hasPin) {
                    setPinError("Anda belum mengatur PIN sebelumnya.");
                    return;
                  }
                  showToast("PIN berhasil diubah");
                  setActiveModal(null);
                  setOldPin("");
                  setNewPin("");
                  setPinError("");
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors"
              >
                Konfirmasi Perubahan PIN
              </button>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(oldChangePin, newChangePin);

// Also we should disable/enable Add PIN/Change PIN based on hasPin state
content = content.replace(
  /<button\s*onClick=\{\(\) => setActiveModal\('add_pin'\)\}\s*className="text-xs font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 px-3 py-1\.5 rounded-lg transition-colors"\s*>\s*Tambah PIN\s*<\/button>/,
  `{!hasPin && <button 
                        onClick={() => setActiveModal('add_pin')}
                        className="text-xs font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Tambah PIN
                      </button>}`
);

content = content.replace(
  /<button\s*onClick=\{\(\) => setActiveModal\('change_pin'\)\}\s*className="text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1\.5 rounded-lg transition-colors"\s*>\s*Ubah PIN\s*<\/button>/,
  `{hasPin && <button 
                        onClick={() => setActiveModal('change_pin')}
                        className="text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Ubah PIN
                      </button>}`
);


fs.writeFileSync('src/components/ProfileView.tsx', content);
