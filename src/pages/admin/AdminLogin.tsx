import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, AlertTriangle, ArrowRight, Eye, EyeOff, ShieldCheck, Check, X } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const criteria = {
    length: password.length > 0 && password.length <= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setError('Kata sandi belum memenuhi semua kriteria keamanan');
      return;
    }
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactor })
      });
      const data = await res.json();
      
      if (data.success && data.token) {
        localStorage.setItem('admin_token', data.token);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid credentials or IP not whitelisted.');
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-rose-500 selection:text-stone-950 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-100 tracking-tight">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-stone-400">
          Restricted Access. IP Address Logged.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-stone-900 border border-stone-800 py-8 px-4 shadow sm:rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>

            <div>
              <label className="block text-sm font-medium text-stone-300">Admin Email</label>
              <div className="mt-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-stone-700 rounded-xl bg-stone-950 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:text-sm transition-shadow"
                  placeholder="admin@portaluang.id"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-400 font-medium">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-300">Admin Password</label>
              <div className="mt-2 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 pr-11 border border-stone-700 rounded-xl bg-stone-950 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:text-sm transition-shadow"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300">2FA Code</label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-stone-500" />
                </div>
                <input
                  type="text"
                  required
                  value={twoFactor}
                  onChange={(e) => setTwoFactor(e.target.value)}
                  className="appearance-none block w-full pl-11 pr-4 py-3 border border-stone-700 rounded-xl bg-stone-950 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:text-sm transition-shadow"
                  placeholder="Enter 6-digit code (123456)"
                />
              </div>
            </div>

            {/* Password Checklist */}
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 mt-4">
              <h3 className="text-xs font-bold text-stone-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                Kriteria Keamanan Password
              </h3>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 transition-colors ${criteria.length ? 'text-emerald-400' : 'text-stone-500'}`}>
                  {criteria.length ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                  <span>Maksimal 8 karakter</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${criteria.uppercase ? 'text-emerald-400' : 'text-stone-500'}`}>
                  {criteria.uppercase ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                  <span>Huruf kapital (A-Z)</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${criteria.number ? 'text-emerald-400' : 'text-stone-500'}`}>
                  {criteria.number ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                  <span>Mengandung angka (0-9)</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${criteria.special ? 'text-emerald-400' : 'text-stone-500'}`}>
                  {criteria.special ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                  <span>Karakter spesial (!@#$%^&*)</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isPasswordValid || !email.trim() || !twoFactor.trim()}
              className={`w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold transition-all ${
                !isPasswordValid || !email.trim() || !twoFactor.trim()
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'text-stone-950 bg-rose-500 hover:bg-rose-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500'
              }`}
            >
              Authenticate <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
