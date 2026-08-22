import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Briefcase, 
  Star, 
  Clock, 
  CreditCard, 
  Shield, 
  Key, 
  LogOut, 
  Sparkles, 
  X, 
  Check, 
  AlertCircle,
  Calendar,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearUserAuthSession } from '../utils/auth';
import { 
  getUserProfile, 
  getUserSubscription, 
  getRemainingTimeDisplay, 
  SUBSCRIPTION_PLANS, 
  RENEWAL_PLANS,
  SubscriptionPlanId, 
  calculateSubscriptionExpiration,
  activateUserPlan,
  getPaymentHistory,
  UserProfile,
  UserSubscription,
  PaymentRecord
} from '../utils/subscription';

interface ProfileViewProps {
  showToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ showToast }) => {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [subscription, setSubscription] = useState<UserSubscription>(getUserSubscription());
  
  const [activeModal, setActiveModal] = useState<'password' | 'add_pin' | 'change_pin' | 'upgrade' | null>(null);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<SubscriptionPlanId>('annual');

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [newPin, setNewPin] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [hasPin, setHasPin] = useState(false);

  const navigate = useNavigate();

  // Refresh remaining time every 30 seconds
  const [remainingInfo, setRemainingInfo] = useState(() => getRemainingTimeDisplay(subscription.expiresAt));

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>(() => getPaymentHistory());

  useEffect(() => {
    const p = getUserProfile();
    const s = getUserSubscription();
    setProfile(p);
    setSubscription(s);
    setPaymentHistory(getPaymentHistory());
    setRemainingInfo(getRemainingTimeDisplay(s.expiresAt));

    const interval = setInterval(() => {
      const currentSub = getUserSubscription();
      setRemainingInfo(getRemainingTimeDisplay(currentSub.expiresAt));
      setPaymentHistory(getPaymentHistory());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleApplyUpgrade = (planId: SubscriptionPlanId) => {
    const targetPlan = SUBSCRIPTION_PLANS.find(p => p.id === planId) || SUBSCRIPTION_PLANS[3];
    const { profile: updatedProfile, subscription: updatedSub } = activateUserPlan(planId, 'Perpanjangan Akun');

    setSubscription(updatedSub);
    setProfile(updatedProfile);
    setPaymentHistory(getPaymentHistory());
    setRemainingInfo(getRemainingTimeDisplay(updatedSub.expiresAt));
    setActiveModal(null);

    showToast(`Selamat! Paket ${targetPlan.name} berhasil diaktifkan.`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-100 tracking-tight">Profil & Langganan</h2>
          <p className="text-stone-400 text-sm mt-1">Kelola data keanggotaan, masa aktif paket, dan keamanan akun Kamu.</p>
        </div>
        <button
          onClick={() => setActiveModal('upgrade')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm transition-all"
        >
          <Zap className="w-4 h-4" /> Ubah / Perpanjang Paket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: User Info & Membership Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* User Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg border-4 border-stone-950 mb-3">
              <span className="text-3xl font-black text-stone-950">{profile.name.charAt(0).toUpperCase()}</span>
            </div>
            <h3 className="text-xl font-bold text-stone-100">{profile.name}</h3>
            <p className="text-stone-400 text-xs flex items-center gap-1.5 justify-center mt-1">
              <Mail className="w-3.5 h-3.5" /> {profile.email}
            </p>
            
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Star className="w-3.5 h-3.5" />
              {subscription.planName}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-stone-100 border-b border-stone-800 pb-3 text-sm">Informasi Akun</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-500 flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-3.5 h-3.5" /> Status Akun
                </label>
                <div className="text-xs font-semibold text-stone-200 bg-stone-950 px-3 py-2 rounded-xl border border-stone-800 flex items-center justify-between">
                  <span>{subscription.status === 'active' ? 'Aktif' : 'Kadaluarsa'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-stone-500 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5" /> Terdaftar Sejak
                </label>
                <div className="text-xs font-semibold text-stone-200 bg-stone-950 px-3 py-2 rounded-xl border border-stone-800">
                  {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(profile.createdAt))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => { 
                showToast("Berhasil Keluar"); 
                clearUserAuthSession();
                window.location.href = "/"; 
              }} 
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 text-xs font-bold border border-rose-900/50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar dari Akun
            </button>
          </div>

        </div>

        {/* Right Column: Subscription Detail & Security */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Subscription Status Banner */}
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Paket Langganan Aktif</span>
                <h3 className="text-2xl font-black text-white mt-0.5">{subscription.planName}</h3>
                <p className="text-xs text-stone-400 mt-1">
                  {subscription.price === 0 ? "Uji coba akses penuh seluruh fitur" : `Biaya berlangganan Rp ${subscription.price.toLocaleString('id-ID')}`}
                </p>
              </div>

              <div className="text-right sm:text-right">
                <div className="text-xs text-stone-400 font-medium">Sisa Waktu Aktif:</div>
                <div className={`text-lg font-black ${remainingInfo.isUrgent ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {remainingInfo.text}
                </div>
              </div>
            </div>

            {/* Grid of Duration & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 mb-6">
              <div>
                <div className="text-[11px] text-stone-500 font-bold uppercase">Durasi Paket</div>
                <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {subscription.durationHours ? `${subscription.durationHours} Jam` : `${subscription.durationDays} Hari`}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-stone-500 font-bold uppercase">Mulai Aktif</div>
                <div className="text-xs font-semibold text-stone-300 mt-0.5">
                  {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(subscription.startDate))}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-stone-500 font-bold uppercase">Berakhir Pada</div>
                <div className="text-xs font-semibold text-amber-300 mt-0.5">
                  {remainingInfo.formattedExpiry}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-stone-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Seluruh 10 fitur Portal Uang terbuka & siap digunakan</span>
              </div>
              <button
                onClick={() => setActiveModal('upgrade')}
                className="w-full sm:w-auto px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Lihat Pilihan Paket Lain</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Payment / Invoice History */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Riwayat Pembayaran & Invois
              </h3>
              <button onClick={() => showToast("Invois PDF siap diunduh")} className="text-xs text-amber-400 font-semibold hover:underline">
                Unduh Invois
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-400 border-b border-stone-800/60">
                    <th className="py-2.5 px-3 font-semibold">No. Invois</th>
                    <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                    <th className="py-2.5 px-3 font-semibold">Paket</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Jumlah</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {paymentHistory.map((payment, i) => (
                    <tr key={i} className="text-stone-300 hover:bg-stone-850/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-xs text-stone-400">{payment.invoiceId || payment.id}</td>
                      <td className="py-3 px-3 whitespace-nowrap">{payment.date}</td>
                      <td className="py-3 px-3 text-amber-300 font-medium">{payment.planName}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {payment.amount === 0 ? "Rp 0 (Trial)" : `Rp ${payment.amount.toLocaleString('id-ID')}`}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                          {payment.status === 'free_trial' ? 'Free Trial' : 'Lunas'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 mb-4 border-b border-stone-800 pb-3">
              <Shield className="w-4 h-4 text-amber-500" />
              Keamanan Akun
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 hover:border-amber-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-200 text-xs mb-1">Kata Sandi</h4>
                    <p className="text-[11px] text-stone-500 mb-3">Maks 8 karakter, huruf besar & angka.</p>
                    <button 
                      onClick={() => setActiveModal('password')}
                      className="text-xs font-semibold text-stone-900 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Ubah Sandi
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 hover:border-amber-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-200 text-xs mb-1">PIN Aplikasi</h4>
                    <p className="text-[11px] text-stone-500 mb-3">Gunakan PIN 6 digit untuk proteksi.</p>
                    <div className="flex gap-2">
                      {!hasPin ? (
                        <button 
                          onClick={() => setActiveModal('add_pin')}
                          className="text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors border border-stone-700"
                        >
                          Tambah PIN
                        </button>
                      ) : (
                        <button 
                          onClick={() => setActiveModal('change_pin')}
                          className="text-xs font-semibold text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Ubah PIN
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* UPGRADE / CHANGE SUBSCRIPTION MODAL */}
      {activeModal === 'upgrade' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col">
            
            <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950/80">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <Zap className="w-3 h-3" /> Alur Perpanjangan Langganan
                </div>
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Pilih Paket Perpanjangan Akun
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Free Trial hanya berlaku 1x. Pilih paket berbayar di bawah ini untuk memperpanjang masa aktif:
                </p>
              </div>
              <button 
                onClick={() => setActiveModal(null)} 
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Flow Tracker */}
            <div className="bg-stone-950 px-6 py-3 border-b border-stone-800/80 flex items-center justify-between text-xs overflow-x-auto">
              <div className="flex items-center gap-2 text-amber-400 font-bold shrink-0">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center text-[10px] font-black">1</span>
                <span>Pilih Paket</span>
              </div>
              <div className="w-8 h-px bg-stone-800 shrink-0 mx-2" />
              <div className="flex items-center gap-2 text-stone-400 font-medium shrink-0">
                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Bayar Sesuai Paket</span>
              </div>
              <div className="w-8 h-px bg-stone-800 shrink-0 mx-2" />
              <div className="flex items-center gap-2 text-stone-400 font-medium shrink-0">
                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Lunas & Aktif Otomatis</span>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {RENEWAL_PLANS.map((plan) => {
                  const isSelected = selectedUpgradePlan === plan.id;
                  const isCurrent = subscription.planId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedUpgradePlan(plan.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected 
                          ? 'border-amber-500 bg-stone-950 shadow-lg shadow-amber-500/10 scale-[1.02]' 
                          : 'border-stone-800 bg-stone-950/50 hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase text-stone-300">{plan.name}</span>
                          {plan.popular && (
                            <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded-full">Populer</span>
                          )}
                          {plan.discountText && !plan.popular && (
                            <span className="text-[10px] bg-emerald-500 text-stone-950 font-black px-2 py-0.5 rounded-full">{plan.discountText}</span>
                          )}
                        </div>

                        <div className="text-xl font-black text-white">
                          Rp {plan.price.toLocaleString('id-ID')}
                        </div>
                        
                        <div className="text-xs text-amber-400 font-medium mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{plan.durationLabel}</span>
                        </div>

                        <p className="text-[11px] text-stone-400 mt-2 leading-relaxed">
                          {plan.tagline}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between">
                        {isCurrent ? (
                          <span className="text-[10px] text-emerald-400 font-bold">Paket Saat Ini</span>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-medium">Klik untuk memilih</span>
                        )}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-amber-400 bg-amber-400 text-stone-950' : 'border-stone-600'}`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Free Trial Expired/1x Note */}
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800/80 flex items-center gap-2 text-xs text-stone-400">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Catatan:</strong> Masa aktif baru akan ditambahkan secara akumulatif ke akun Kamu setelah pembayaran diverifikasi lunas.
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-stone-800 bg-stone-950/80 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-400">
                Langkah 1 dari 3: Pilih paket di atas
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 text-xs font-bold hover:bg-stone-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    navigate(`/checkout?plan=${selectedUpgradePlan}&mode=renew`);
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Password Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
              <h3 className="font-bold text-stone-100 flex items-center gap-2 text-sm">
                <Key className="w-4 h-4 text-amber-500" />
                Ubah Kata Sandi
              </h3>
              <button onClick={() => { setActiveModal(null); setPasswordError(""); }} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {passwordError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5 block">Kata Sandi Lama</label>
                <input 
                  type={showOldPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5 block">Kata Sandi Baru</label>
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  placeholder="Max 8 kar, huruf besar, angka, spesial" 
                  maxLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5 block">Konfirmasi Kata Sandi Baru</label>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  maxLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500" 
                />
              </div>
              <button 
                onClick={() => {
                  if (!oldPassword || !newPassword || !confirmPassword) {
                    setPasswordError("Semua kolom harus diisi.");
                    return;
                  }
                  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{1,8}$/;
                  if (!passwordRegex.test(newPassword)) {
                    setPasswordError("Kata sandi maksimal 8 karakter, harus mengandung angka, huruf kapital, dan karakter spesial.");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError("Konfirmasi kata sandi tidak cocok.");
                    return;
                  }
                  showToast("Kata sandi berhasil diperbarui!");
                  setActiveModal(null);
                }}
                className="w-full py-3 mt-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors"
              >
                Simpan Kata Sandi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add PIN Modal */}
      {activeModal === 'add_pin' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
              <h3 className="font-bold text-stone-100 flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Tambah PIN 6-Digit
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-stone-400 hover:text-stone-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-center">
              <p className="text-xs text-stone-400">Masukkan 6 digit angka PIN baru:</p>
              <input 
                type="password" 
                maxLength={6} 
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-widest text-2xl bg-stone-950 border border-stone-800 rounded-xl py-3 text-stone-200 focus:outline-none focus:border-amber-500" 
              />
              <button 
                onClick={() => {
                  if (newPin.length < 6) {
                    setPinError("PIN harus 6 digit angka.");
                    return;
                  }
                  showToast("PIN berhasil disimpan.");
                  setHasPin(true);
                  setActiveModal(null);
                  setNewPin("");
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors"
              >
                Simpan PIN
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
