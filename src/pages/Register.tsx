import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Sparkles, 
  Crown, 
  ShieldCheck, 
  ArrowRight,
  Zap,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { LandingLayout } from "../components/LandingLayout";
import { 
  SUBSCRIPTION_PLANS, 
  SubscriptionPlanId, 
  saveUserRegistration,
  hasUserUsedTrial
} from "../utils/subscription";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const formSectionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const initialPlanParam = searchParams.get("plan") as SubscriptionPlanId;
  const validPlanIds: SubscriptionPlanId[] = ['free_trial', 'monthly', 'semi_annual', 'annual'];
  const defaultPlan: SubscriptionPlanId = validPlanIds.includes(initialPlanParam) ? initialPlanParam : 'free_trial';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>(defaultPlan);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Check if current typed email already claimed trial
  const isTrialUsedForEmail = email.trim().length > 5 && hasUserUsedTrial(email);

  const scrollToForm = () => {
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 500);
    }
  };

  const handleSelectPlan = (planId: SubscriptionPlanId) => {
    if (planId === 'free_trial' && isTrialUsedForEmail) {
      setError("Email ini sudah pernah menggunakan Free Trial 24 Jam sebelumnya. Silakan pilih paket Bulanan, 6 Bulan, atau 1 Tahun.");
      return;
    }
    setSelectedPlanId(planId);
    setError("");

    // Smooth auto-scroll down to fill name & email
    setTimeout(() => {
      scrollToForm();
    }, 150);
  };

  useEffect(() => {
    const planParam = searchParams.get("plan") as SubscriptionPlanId;
    if (validPlanIds.includes(planParam)) {
      if (planParam === 'free_trial' && isTrialUsedForEmail) {
        setSelectedPlanId('annual');
      } else {
        setSelectedPlanId(planParam);
      }
      // If user came from Pricing with plan param, auto-scroll to form
      setTimeout(() => {
        scrollToForm();
      }, 350);
    }
  }, [searchParams, isTrialUsedForEmail]);

  useEffect(() => {
    if (isTrialUsedForEmail && selectedPlanId === 'free_trial') {
      setSelectedPlanId('annual');
    }
  }, [isTrialUsedForEmail, selectedPlanId]);

  const criteria = {
    length: password.length > 0 && password.length <= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const isPasswordValid = Object.values(criteria).every(Boolean);

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[0];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Mohon masukkan nama lengkap Anda");
      return;
    }

    if (!isPasswordValid) {
      setError("Kata sandi belum memenuhi semua kriteria keamanan");
      return;
    }
    
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setError("Pendaftaran hanya diizinkan menggunakan akun @gmail.com");
      return;
    }

    if (selectedPlanId === 'free_trial' && hasUserUsedTrial(email)) {
      setError("Email ini sudah pernah menggunakan Free Trial 24 Jam sebelumnya. Silakan pilih paket Bulanan, 6 Bulan, atau 1 Tahun.");
      setSelectedPlanId('annual');
      return;
    }

    if (!city.trim()) {
      setError("Mohon masukkan kota domisili Anda");
      return;
    }

    if (!selectedPlanId) {
      setError("Wajib memilih salah satu paket berlangganan untuk melanjutkan");
      return;
    }
    
    // Save user registration and plan duration with exact expiration timestamp
    saveUserRegistration(name.trim(), email.trim().toLowerCase(), selectedPlanId, city.trim());

    // Redirect to checkout page with locked selected plan
    navigate(`/checkout?plan=${selectedPlanId}`);
  };

  return (
    <LandingLayout>
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3 border border-amber-500/30">
            <Zap className="w-3.5 h-3.5" /> Pendaftaran Akun Aura Ledger
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Buat Akun & Mulai Kendalikan Keuangan
          </h1>
          <p className="text-stone-300 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Lengkapi data diri Anda dan pilih paket langganan yang sesuai untuk memulai.
          </p>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-6 bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3">
            <X className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-8">
          
          {/* STEP 1: PILIH PAKET BERLANGGANAN (WAJIB) */}
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-stone-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Langkah 1 (Wajib)</span>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Pilih Paket Berlangganan
                </h2>
              </div>
              <div className="text-xs text-stone-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800 self-start sm:self-auto font-medium">
                * Wajib memilih salah satu opsi
              </div>
            </div>

            {/* 4 Cards Grid: Free Trial (24 Jam), Bulanan (30 Hari), 6 Bulan (180 Hari), 1 Tahun (365 Hari) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isTrial = plan.id === 'free_trial';
                const isTrialDisabled = isTrial && isTrialUsedForEmail;

                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`relative p-5 rounded-2xl transition-all flex flex-col justify-between text-left border-2 ${
                      isTrialDisabled
                        ? "bg-stone-950/40 border-stone-800/60 opacity-50 cursor-not-allowed"
                        : isSelected
                        ? "bg-gradient-to-b from-stone-850 to-stone-900 border-amber-500 shadow-xl shadow-amber-500/15 scale-[1.02] cursor-pointer"
                        : "bg-stone-950/90 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60 opacity-90 hover:opacity-100 cursor-pointer"
                    }`}
                  >
                    {/* Badge top right */}
                    {plan.popular && (
                      <div className="absolute -top-3 right-3 bg-amber-500 text-stone-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md">
                        {plan.badge}
                      </div>
                    )}
                    {plan.discountText && !plan.popular && (
                      <div className="absolute -top-3 right-3 bg-emerald-500 text-stone-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                        {plan.discountText}
                      </div>
                    )}
                    {isTrial && (
                      <div className={`absolute -top-3 right-3 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md ${isTrialDisabled ? 'bg-stone-700 text-stone-300' : 'bg-blue-500 text-white'}`}>
                        {isTrialDisabled ? "Sudah Terpakai" : "24 Jam"}
                      </div>
                    )}

                    <div>
                      {/* Radio Indicator */}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                          isTrialDisabled 
                            ? "border-stone-700 bg-stone-900 text-stone-600"
                            : isSelected ? "border-amber-400 bg-amber-400 text-stone-950" : "border-stone-600 bg-stone-900"
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          {isTrialDisabled && <X className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-stone-400 font-semibold">
                          {isTrial ? <Clock className="w-3.5 h-3.5 text-blue-400" /> : <Calendar className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{plan.durationShort}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-white">{plan.name}</h3>
                      
                      {/* Duration Highlight Box */}
                      <div className={`mt-2 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        isTrialDisabled
                          ? "bg-stone-900 text-stone-500 border border-stone-800"
                          : isTrial 
                          ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                          : "bg-stone-900 text-stone-300 border border-stone-800"
                      }`}>
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{isTrialDisabled ? "Trial 1x Sudah Diklaim" : plan.durationLabel}</span>
                      </div>

                      {/* Price */}
                      <div className="mt-4 mb-2">
                        {plan.originalPrice && (
                          <div className="text-xs text-stone-500 line-through font-medium">
                            Rp {plan.originalPrice.toLocaleString('id-ID')}
                          </div>
                        )}
                        <div className="text-2xl font-black text-white">
                          {plan.price === 0 ? (
                            <span className={isTrialDisabled ? "text-stone-500" : "text-emerald-400"}>Gratis (Rp 0)</span>
                          ) : (
                            <span>Rp {plan.price.toLocaleString('id-ID')}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {isTrialDisabled ? "Hanya bisa 1x per email" : isTrial ? "Mulai uji coba instan" : plan.tagline}
                        </div>
                      </div>
                    </div>

                    {/* Features list mini */}
                    <div className="mt-4 pt-3 border-t border-stone-800/80 space-y-1.5">
                      {plan.features.slice(0, 3).map((feat, i) => (
                        <div key={i} className="text-[11px] text-stone-300 flex items-start gap-1.5">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? "text-amber-400" : "text-stone-500"}`} />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Selected Plan Summary Banner */}
            <div className="mt-6 p-4 rounded-2xl bg-stone-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-stone-400 font-semibold">Paket yang Anda Pilih:</div>
                  <div className="text-sm sm:text-base font-bold text-white">
                    <span className="text-amber-400">{selectedPlan.name}</span> &bull; {selectedPlan.durationLabel} {selectedPlan.price > 0 ? `(Rp ${selectedPlan.price.toLocaleString('id-ID')})` : '(Rp 0 / Trial)'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-md self-start sm:self-auto"
              >
                <span>Isi Nama & Email</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            </div>

          </div>

          {/* STEP 2: DATA AKUN PENGGUNA */}
          <div ref={formSectionRef} id="account-info-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-6">
            
            {/* Form Inputs (2 Cols) */}
            <div className="lg:col-span-2 bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="border-b border-stone-800 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Langkah 2</span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Informasi Akun Anda
                  </h2>
                </div>
                <span className="text-xs text-stone-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
                  Lengkapi Data Diri
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-200 mb-1.5">
                  Nama Lengkap <span className="text-amber-400">*</span>
                </label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-stone-950 border-2 border-stone-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none transition-colors" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-200 mb-1.5">
                  Email Akun Gmail <span className="text-amber-400">*</span>
                </label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-stone-950 border-2 border-stone-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none transition-colors" 
                  placeholder="nama.anda@gmail.com" 
                />
                <div className="text-xs text-stone-400 mt-1">
                  * Sistem pendaftaran wajib menggunakan akun berakhiran <strong className="text-amber-400">@gmail.com</strong>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-200 mb-1.5">
                  Kota Domisili <span className="text-amber-400">*</span>
                </label>
                <input 
                  type="text" 
                  required 
                  value={city} 
                  onChange={(e) => setCity(e.target.value)} 
                  className="w-full bg-stone-950 border-2 border-stone-800 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-base outline-none transition-colors" 
                  placeholder="Contoh: Jakarta" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-200 mb-1.5">
                  Password <span className="text-amber-400">*</span>
                </label>
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
                    className="w-full bg-stone-950 border-2 border-stone-800 focus:border-amber-500 rounded-xl px-4 py-3 pr-11 text-white text-base outline-none transition-colors" 
                    placeholder="Maks 8 karakter, angka, huruf besar, spesial"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={!isPasswordValid || !name.trim() || !email.trim()}
                  className={`w-full py-4 font-black rounded-xl text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-xl ${
                    !isPasswordValid || !name.trim() || !email.trim()
                      ? "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700" 
                      : "bg-amber-500 hover:bg-amber-400 text-stone-950 hover:scale-[1.01] shadow-amber-500/25"
                  }`}
                >
                  <span>
                    {selectedPlan.id === 'free_trial' 
                      ? "Daftar & Lanjut ke Checkout (Free Trial Rp 0)" 
                      : `Daftar & Lanjut ke Pembayaran (${selectedPlan.name})`}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

            </div>

            {/* Criteria & Security Info Sidebar (1 Col) */}
            <div className="space-y-6">
              
              {/* Password Checklist */}
              <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-stone-200 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Kriteria Keamanan Password
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${criteria.length ? 'bg-emerald-950/40 text-emerald-300 font-semibold' : 'bg-stone-950 text-stone-400'}`}>
                    {criteria.length ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-stone-500 shrink-0" />}
                    <span>Maksimal 8 karakter</span>
                  </div>
                  <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${criteria.uppercase ? 'bg-emerald-950/40 text-emerald-300 font-semibold' : 'bg-stone-950 text-stone-400'}`}>
                    {criteria.uppercase ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-stone-500 shrink-0" />}
                    <span>Huruf kapital (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${criteria.number ? 'bg-emerald-950/40 text-emerald-300 font-semibold' : 'bg-stone-950 text-stone-400'}`}>
                    {criteria.number ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-stone-500 shrink-0" />}
                    <span>Mengandung angka (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-2.5 p-2 rounded-xl transition-colors ${criteria.special ? 'bg-emerald-950/40 text-emerald-300 font-semibold' : 'bg-stone-950 text-stone-400'}`}>
                    {criteria.special ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <X className="w-4 h-4 text-stone-500 shrink-0" />}
                    <span>Karakter spesial (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              {/* Account Benefits */}
              <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-2">
                  Jaminan Privasi & Layanan
                </h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Data keuangan Anda dienkripsi secara aman dan privasi Anda terlindungi. Anda dapat mengupgrade, mengubah, atau memperpanjang paket kapan saja melalui menu Profil.
                </p>
                <div className="mt-4 pt-4 border-t border-stone-800 text-center text-xs text-stone-400">
                  Sudah punya akun sebelumnya?{" "}
                  <Link to="/login" className="text-amber-400 hover:text-amber-300 font-bold underline">
                    Masuk di sini
                  </Link>
                </div>
              </div>

            </div>

          </div>

        </form>
      </div>
    </LandingLayout>
  );
}
