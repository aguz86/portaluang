const fs = require('fs');

let content = fs.readFileSync('src/pages/Register.tsx', 'utf8');

// Add Eye, EyeOff imports
content = content.replace(
  /import \{ Link, useNavigate \} from "react-router-dom";/,
  `import { Link, useNavigate } from "react-router-dom";\nimport { Eye, EyeOff } from "lucide-react";`
);

// Add showPassword state
content = content.replace(
  /const \[error, setError\] = useState\(""\);/,
  `const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);`
);

// Password validation logic
content = content.replace(
  /if \(\!email\.toLowerCase\(\)\.endsWith\("@gmail\.com"\)\) \{/,
  `const passwordRegex = /^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>\\/?]).{1,8}$/;
    if (!passwordRegex.test(password)) {
      setError("Kata sandi maksimal 8 karakter, harus mengandung angka, huruf kapital, dan karakter spesial.");
      return;
    }
    
    if (!email.toLowerCase().endsWith("@gmail.com")) {`
);

// Password input changes
const oldPasswordInput = `<div>
              <label className="block text-sm font-bold text-stone-300 mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" />
            </div>`;

const newPasswordInput = `<div>
              <label className="block text-sm font-bold text-stone-300 mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  maxLength={8}
                  value={password} 
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }} 
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 pr-10 text-white focus:border-amber-500 outline-none" 
                  placeholder="Max 8 kar, angka, huruf besar, & spesial"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>`;

content = content.replace(oldPasswordInput, newPasswordInput);

fs.writeFileSync('src/pages/Register.tsx', content);
