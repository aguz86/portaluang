const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Ensure Eye and EyeOff are imported
if (!content.includes('Eye, EyeOff')) {
  content = content.replace(
    /import \{ User,/,
    `import { Eye, EyeOff, User,`
  );
}

// Add state variables for passwords and showPassword toggles
content = content.replace(
  /const \[activeModal, setActiveModal\] = React\.useState<'password' \| 'add_pin' \| 'change_pin' \| null>\(null\);/,
  `const [activeModal, setActiveModal] = React.useState<'password' | 'add_pin' | 'change_pin' | null>(null);
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState("");`
);

// Reset state when modal closes
content = content.replace(
  /onClick=\{\(\) => setActiveModal\(null\)\}/g,
  `onClick={() => {
    setActiveModal(null);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }}`
);

// Replace password modal content
const oldPasswordModal = /<div className="p-5 space-y-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;

const newPasswordModal = `<div className="p-5 space-y-4">
              {passwordError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs mb-2">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Kata Sandi Lama</label>
                <div className="relative">
                  <input 
                    type={showOldPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 pr-10 text-sm text-stone-200 focus:outline-none focus:border-amber-500" 
                  />
                  <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Kata Sandi Baru</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="Max 8 kar, angka, huruf besar, & spesial" 
                    maxLength={8}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 pr-10 text-sm text-stone-200 focus:outline-none focus:border-amber-500" 
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    maxLength={8}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 pr-10 text-sm text-stone-200 focus:outline-none focus:border-amber-500" 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!oldPassword || !newPassword || !confirmPassword) {
                    setPasswordError("Semua kolom harus diisi.");
                    return;
                  }
                  
                  const passwordRegex = /^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]).{1,8}$/;
                  if (!passwordRegex.test(newPassword)) {
                    setPasswordError("Kata sandi maksimal 8 karakter, harus mengandung angka, huruf kapital, dan karakter spesial.");
                    return;
                  }
                  
                  if (newPassword !== confirmPassword) {
                    setPasswordError("Konfirmasi kata sandi tidak cocok.");
                    return;
                  }
                  
                  showToast("Kata sandi berhasil diubah");
                  setActiveModal(null);
                  setOldPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                }}
                className="w-full py-3 mt-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-colors"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}`;

content = content.replace(oldPasswordModal, newPasswordModal);

fs.writeFileSync('src/components/ProfileView.tsx', content);
