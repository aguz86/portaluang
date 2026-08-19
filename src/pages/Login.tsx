import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";
import { setUserAuthSession, getRememberedEmail } from "../utils/auth";
import { Check, ShieldCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { settings } = useGlobalSettings();
  
  // Default to remembered email or initial demo email
  const [email, setEmail] = useState(() => getRememberedEmail() || "caksuga86@gmail.com");
  const [password, setPassword] = useState("1234");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const remembered = getRememberedEmail();
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setError("Hanya akun @gmail.com yang diizinkan untuk masuk");
      return;
    }
    
    // Save authentication session with rememberMe option (30 days validity)
    setUserAuthSession(email, rememberMe);
    navigate("/app/dashboard");
  };

  return (
    <LandingLayout>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Selamat Datang Kembali</h2>
            <p className="text-stone-400 text-sm">Masuk ke akun {settings.appName} Anda.</p>
          </div>
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-sm mb-5 flex items-center gap-2">
              <span className="font-semibold">{error}</span>
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                Email Akun (@gmail.com)
              </label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@gmail.com"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  Kata Sandi
                </span>
                <Link to="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300 font-semibold normal-case">
                  Lupa password?
                </Link>
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none pr-11 transition-all" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1"
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {/* Checklist Remember Me (Ingat Saya 30 Hari) */}
            <div className="pt-2 pb-1">
              <label 
                htmlFor="remember-me"
                className="flex items-start gap-3 cursor-pointer select-none group p-2.5 rounded-xl hover:bg-stone-950/60 transition-colors border border-transparent hover:border-stone-800"
              >
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    rememberMe 
                      ? 'bg-amber-500 border-amber-400 shadow-md shadow-amber-500/20' 
                      : 'bg-stone-950 border-stone-700 group-hover:border-stone-500'
                  }`}>
                    {rememberMe && <Check className="w-3.5 h-3.5 text-stone-950 stroke-[3]" />}
                  </div>
                </div>
                
                <div className="flex-1 text-left">
                  <div className="text-xs font-bold text-stone-200 group-hover:text-white flex items-center gap-1.5">
                    <span>Ingat Saya (Tetap Login 30 Hari)</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      30 Hari
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">
                    Sesi login Anda akan tersimpan aman sehingga Anda tidak perlu memasukkan password berulang kali.
                  </p>
                </div>
              </label>
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] mt-4 text-sm"
            >
              Masuk ke Dashboard
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-stone-400">
            Belum punya akun?{" "}
            <Link to="/register" className="text-amber-400 hover:text-amber-300 font-bold underline">
              Daftar sekarang
            </Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
