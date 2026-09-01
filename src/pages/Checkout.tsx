import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { 
  Lock, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  QrCode, 
  Building2, 
  Wallet, 
  Copy, 
  Check, 
  ArrowRight, 
  Shield, 
  Zap, 
  Crown, 
  Tag, 
  ArrowLeft,
  Loader2,
  AlertCircle
} from "lucide-react";
import { LandingLayout } from "../components/LandingLayout";
import { checkIsAuthenticated } from "../utils/auth";
import { 
  SUBSCRIPTION_PLANS, 
  RENEWAL_PLANS,
  SubscriptionPlanId, 
  getUserProfile, 
  activateUserPlan,
  calculateSubscriptionExpiration,
  hasUserUsedTrial
} from "../utils/subscription";

export default function Checkout() {
  const navigate = useNavigate();
  
  // Security handler: redirect to login if not authenticated
  useEffect(() => {
    if (!checkIsAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  const [searchParams] = useSearchParams();

  // Retrieve plan and mode from URL query param or fallback
  const planParam = searchParams.get("plan") as SubscriptionPlanId;
  const isRenewMode = searchParams.get("mode") === "renew";
  const validPlanIds: SubscriptionPlanId[] = ['free_trial', 'monthly', 'semi_annual', 'annual'];
  
  const userProfile = getUserProfile();
  const userHasUsedTrial = hasUserUsedTrial(userProfile.email);
  const isTrialAllowed = !userHasUsedTrial && !isRenewMode;

  const initialPlanId: SubscriptionPlanId = (validPlanIds.includes(planParam))
    ? ((planParam === 'free_trial' && !isTrialAllowed) ? 'annual' : planParam)
    : (validPlanIds.includes(userProfile.subscription.planId) && (userProfile.subscription.planId !== 'free_trial' || isTrialAllowed) ? userProfile.subscription.planId : 'annual');

  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>(initialPlanId);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va_bca' | 'va_mandiri' | 'va_bri' | 'va_bni' | 'ewallet'>('qris');
  const [ewalletPhone, setEwalletPhone] = useState("");
  const [ewalletProvider, setEwalletProvider] = useState<'gopay' | 'ovo' | 'dana' | 'shopeepay'>('gopay');
  
  // Voucher state
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number; type: 'percent' | 'fixed' } | null>(null);
  const [voucherError, setVoucherError] = useState("");
  const [voucherSuccess, setVoucherSuccess] = useState("");

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Countdown timer for payment (24 hours = 24 * 3600 seconds)
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);

  // Duitku Live Gateway State
  const [duitkuInvoice, setDuitkuInvoice] = useState<{
    merchantOrderId?: string;
    reference?: string;
    vaNumber?: string;
    qrString?: string;
    paymentUrl?: string;
    paymentMethodName?: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[3];
  const isTrial = selectedPlan.id === 'free_trial';

  // Pricing calculations
  const originalPrice = selectedPlan.originalPrice || selectedPlan.price;
  const baseDiscount = selectedPlan.originalPrice ? selectedPlan.originalPrice - selectedPlan.price : 0;
  
  let extraVoucherDiscount = 0;
  if (appliedVoucher && selectedPlan.price > 0) {
    if (appliedVoucher.type === 'percent') {
      extraVoucherDiscount = Math.round((selectedPlan.price * appliedVoucher.discount) / 100);
    } else {
      extraVoucherDiscount = Math.min(appliedVoucher.discount, selectedPlan.price);
    }
  }

  // Prorated discount calculation for upgrades
  let proratedDiscount = 0;
  if (isRenewMode && userProfile.subscription && userProfile.subscription.status === 'active' && userProfile.subscription.planId !== 'free_trial' && selectedPlan.price > 0) {
    const expiresAt = new Date(userProfile.subscription.expiresAt).getTime();
    const now = Date.now();
    const remainingMs = expiresAt - now;
    
    if (remainingMs > 0) {
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      const oldPlan = SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscription.planId);
      if (oldPlan && oldPlan.durationDays) {
         const dailyRate = oldPlan.price / oldPlan.durationDays;
         proratedDiscount = Math.floor(dailyRate * remainingDays);
         
         // Cap the prorated discount to max 80% of new plan price so they still pay something for upgrade
         if (proratedDiscount > selectedPlan.price * 0.8) {
             proratedDiscount = Math.floor(selectedPlan.price * 0.8);
         }
      }
    }
  }

  const finalTotal = Math.max(0, selectedPlan.price - extraVoucherDiscount - proratedDiscount);

  const [duitkuMethods, setDuitkuMethods] = useState<any[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);

  // Fetch available methods on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/payment/duitku/methods?amount=' + (finalTotal || 10000))
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.methods) {
          setDuitkuMethods(data.methods);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setMethodsLoading(false);
      });
    return () => { isMounted = false; };
  }, [finalTotal]);

  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Generate fixed invoice ID fallback
  const [invoiceId, setInvoiceId] = useState(() => {
    const now = new Date();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${rand}`;
  });



  // Request Duitku Invoice from backend whenever plan or payment method changes
  useEffect(() => {
    if (isTrial) {
      setDuitkuInvoice(null);
      return;
    }

    let isMounted = true;
    const createDuitkuInvoice = async () => {
      setInvoiceLoading(true);
      try {
        const res = await fetch('/api/payment/duitku/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlan.id,
            planName: selectedPlan.name,
            amount: finalTotal,
            paymentMethod: paymentMethod === 'ewallet' ? `ewallet_${ewalletProvider}` : paymentMethod,
            email: userProfile.email || 'user@portaluang.id',
            customerName: userProfile.name || 'Pengguna Portal Uang',
            phoneNumber: ewalletPhone || '08123456789'
          })
        });

        const data = await res.json();
        if (isMounted && data.success) {
          setDuitkuInvoice(data);
          if (data.merchantOrderId) {
            setInvoiceId(data.merchantOrderId);
          }

          // If QR string received, generate high-res QR code data URL
          if (data.qrString) {
            const dataUrl = await QRCode.toDataURL(data.qrString, {
              width: 280,
              margin: 2,
              color: { dark: '#1c1917', light: '#ffffff' }
            });
            if (isMounted) setQrDataUrl(dataUrl);
          }
        }
      } catch (err) {
        console.error('Error creating Duitku invoice:', err);
      } finally {
        if (isMounted) setInvoiceLoading(false);
      }
    };

    createDuitkuInvoice();

    return () => {
      isMounted = false;
    };
  }, [selectedPlanId, paymentMethod, finalTotal, isTrial]);

  // Fallback QR code generator if live qrString not present yet
  useEffect(() => {
    if (paymentMethod === 'qris' && !qrDataUrl) {
      const defaultQrPayload = `00020101021226590014ID.LINKAJA.WWW01189360091800000000000215ID${invoiceId}520458125303360540${finalTotal}.005802ID5910AURALEDGER6007JAKARTA61051219062070703A016304`;
      QRCode.toDataURL(defaultQrPayload, { width: 280, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [paymentMethod, invoiceId, finalTotal, qrDataUrl]);

  useEffect(() => {
    if (planParam && validPlanIds.includes(planParam)) {
      if (planParam === 'free_trial' && !isTrialAllowed) {
        setSelectedPlanId('annual');
      } else {
        setSelectedPlanId(planParam);
      }
    }
  }, [planParam, isTrialAllowed]);

  // Timer countdown: 24 Jam (86400 detik)
  useEffect(() => {
    if (isTrial) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isTrial]);

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError("");
    setVoucherSuccess("");

    if (isTrial) {
      setVoucherError("Voucher tidak diperlukan untuk paket Free Trial (Rp 0).");
      return;
    }

    const cleanCode = voucherCode.trim().toUpperCase();
    if (cleanCode === "HEMAT20" || cleanCode === "DISKON20") {
      setAppliedVoucher({ code: cleanCode, discount: 20, type: 'percent' });
      setVoucherSuccess("Voucher berhasil! Diskon tambahan 20% diterapkan.");
    } else if (cleanCode === "PORTAL10") {
      setAppliedVoucher({ code: cleanCode, discount: 10, type: 'percent' });
      setVoucherSuccess("Voucher berhasil! Diskon tambahan 10% diterapkan.");
    } else if (cleanCode === "LAUNCH50") {
      setAppliedVoucher({ code: cleanCode, discount: 50000, type: 'fixed' });
      setVoucherSuccess("Voucher berhasil! Potongan Rp 50.000 diterapkan.");
    } else if (cleanCode === "MERDEKA") {
      setAppliedVoucher({ code: cleanCode, discount: 15, type: 'percent' });
      setVoucherSuccess("Voucher promo berhasil! Diskon 15% diterapkan.");
    } else {
      setVoucherError("Kode voucher tidak valid. Coba gunakan HEMAT20 atau LAUNCH50.");
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    
    if (isTrial) {
      setProcessingStep("Mengaktifkan akses Free Trial 24 Jam...");
      setTimeout(() => {
        setProcessingStep("Menyiapkan dashboard akun Anda...");
        setTimeout(() => {
          activateUserPlan('free_trial', 'Free Trial (Rp 0)', 0, invoiceId);
          setIsProcessing(false);
          setIsSuccess(true);
        }, 600);
      }, 500);
      return;
    }

    setProcessingStep("Mengecek status pembayaran ke Duitku Gateway...");
    
    try {
      const currentOrderId = duitkuInvoice?.merchantOrderId || invoiceId;
      const res = await fetch(`/api/payment/duitku/check-status/${currentOrderId}`);
      const data = await res.json();
      
      if (data.success && data.isPaid) {
        setProcessingStep("Pelunasan terverifikasi! Mengaktifkan paket secara otomatis...");
        setTimeout(() => {
          let methodLabel = duitkuInvoice?.paymentMethodName || "Duitku Payment Gateway";
          if (paymentMethod === 'qris') {
            methodLabel = "Duitku QRIS Instan";
          } else if (paymentMethod?.startsWith('va_')) {
            methodLabel = `Duitku Virtual Account ${paymentMethod.replace('va_', '').toUpperCase()}`;
          } else if (paymentMethod === 'ewallet') {
            methodLabel = `Duitku E-Wallet (${ewalletProvider.toUpperCase()})`;
          }
          activateUserPlan(selectedPlan.id, methodLabel, finalTotal, currentOrderId);
          setIsProcessing(false);
          setIsSuccess(true);
        }, 600);
      } else {
        setIsProcessing(false);
        alert("Pembayaran belum lunas/diterima oleh Portal Uang. Silakan selesaikan pembayaran terlebih dahulu (atau tunggu beberapa menit jika sudah bayar).");
      }
    } catch (err) {
      setIsProcessing(false);
      alert("Terjadi kesalahan saat mengecek status pembayaran ke server.");
    }
  };

  // Virtual Account Numbers fallback
  const vaNumbers: Record<string, { bank: string; number: string }> = {
    va_bca: { bank: 'BCA', number: '82710812' + invoiceId.replace(/\D/g, '').slice(-6) },
    va_mandiri: { bank: 'Bank Mandiri', number: '88708' + invoiceId.replace(/\D/g, '').slice(-8) },
    va_bri: { bank: 'BRI (BRIVA)', number: '12800' + invoiceId.replace(/\D/g, '').slice(-8) },
    va_bni: { bank: 'BNI', number: '98800' + invoiceId.replace(/\D/g, '').slice(-8) },
    va_cimb: { bank: 'CIMB Niaga', number: '1149' + invoiceId.replace(/\D/g, '').slice(-8) },
    va_permata: { bank: 'Permata', number: '8856' + invoiceId.replace(/\D/g, '').slice(-8) },
    va_atmbersama: { bank: 'ATM Bersama', number: '014' + invoiceId.replace(/\D/g, '').slice(-8) }
  };
  
  // Dynamic fallback for any unknown VA
  const getVaInfo = (key: string) => {
    if (vaNumbers[key]) return vaNumbers[key];
    const name = key.replace('va_', '').toUpperCase();
    return { bank: name, number: '8880' + invoiceId.replace(/\D/g, '').slice(-8) };
  };

  const calculatedExpiry = calculateSubscriptionExpiration(selectedPlan.id);
  const formattedExpiryDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(calculatedExpiry.expiresAt);

  return (
    <LandingLayout>
      <div className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        
        {/* Header Breadcrumb & Title */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-amber-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
            </Link>

            {userHasUsedTrial && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-stone-400 text-xs">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Free Trial 1x sudah terpakai untuk akun ini</span>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Lock className="w-3.5 h-3.5" /> Checkout & Aktivasi Otomatis
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                {isTrial ? "Aktivasi Free Trial 24 Jam" : (isRenewMode ? "Perpanjang & Upgrade Paket" : "Pembayaran & Aktivasi Otomatis")}
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-2">
                {isTrial 
                  ? "Nikmati akses gratis seluruh 10 fitur Portal Uang selama 24 jam."
                  : "Selesaikan pembayaran sesuai paket terpilih. Paket akan aktif otomatis secara instan setelah status lunas."}
              </p>

              {/* User Identity Banner */}
              <div className="mt-6 flex items-center gap-4 bg-stone-900/60 border border-stone-800 p-3.5 rounded-2xl inline-flex shadow-inner">
                <div className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 font-black text-lg">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="pr-2">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Checkout untuk Akun:</div>
                  <div className="text-sm font-bold text-white leading-tight">{userProfile.name}</div>
                  <div className="text-xs text-stone-500">{userProfile.email}</div>
                </div>
              </div>
            </div>

            {/* 24-HOUR COUNTDOWN TIMER BADGE */}
            {!isTrial && (
              <div className="bg-stone-900 border border-stone-800 px-4 py-3 rounded-2xl flex items-center gap-3 shrink-0 self-start lg:self-auto shadow-lg">
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                    <span>Batas Pembayaran</span>
                    <span className="text-amber-400/80 font-mono">(24 Jam)</span>
                  </div>
                  <div className="text-xl font-black text-amber-400 font-mono tracking-wider">
                    {formatTimer(timeLeft)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4-STEP FLOW PROGRESS TRACKER */}
          <div className="mt-6 bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Alur Pembayaran & Aktivasi Otomatis:</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Step 1 */}
              <div className="bg-stone-950 p-3 rounded-xl border border-amber-500/50 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-stone-950 font-black flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div>
                  <div className="font-bold text-amber-400">Pilih Paket</div>
                  <div className="text-[10px] text-stone-400">{selectedPlan.name} ({selectedPlan.durationShort})</div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${!isTrial ? 'bg-stone-950 border-amber-500/50' : 'bg-stone-950/60 border-stone-800'}`}>
                <div className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${!isTrial ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-400'}`}>
                  2
                </div>
                <div>
                  <div className={`font-bold ${!isTrial ? 'text-amber-400' : 'text-stone-300'}`}>Bayar Sesuai Paket</div>
                  <div className="text-[10px] text-stone-400">Rp {finalTotal.toLocaleString('id-ID')}</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-stone-800 text-stone-300 font-black flex items-center justify-center text-xs shrink-0">
                  3
                </div>
                <div>
                  <div className="font-bold text-stone-300">Bayar (QRIS / VA / E-Wallet)</div>
                  <div className="text-[10px] text-stone-400">Berlaku 24 jam</div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black flex items-center justify-center text-xs shrink-0">
                  4
                </div>
                <div>
                  <div className="font-bold text-emerald-400">Lunas ➔ Aktif Otomatis</div>
                  <div className="text-[10px] text-stone-400">Instan tanpa konfirmasi manual</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: LOCKED PLAN CARD & ORDER SUMMARY (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Locked Plan Banner Card */}
            <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              
              {/* Lock Ribbon Indicator */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Paket Terkunci Sesuai Pilihan</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {selectedPlan.durationShort}
                </span>
              </div>

              {/* Status Langganan Lama */}
              {isRenewMode && userProfile.subscription && userProfile.subscription.planId !== 'free_trial' && (
                <div className="mb-4 bg-sky-950/40 border border-sky-900/50 p-3 rounded-xl flex items-start gap-3">
                  <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-sky-400 font-bold mb-1">Status Saat Ini</div>
                    <div className="text-[11px] text-stone-300 leading-relaxed space-y-1">
                      <p>Masa aktif Anda saat ini berakhir pada <span className="font-bold text-white">{new Date(userProfile.subscription.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>.</p>
                      <p>Pembelian <span className="font-bold text-amber-400">{selectedPlan.name}</span> akan menambah masa aktif selama <span className="font-bold text-amber-400">{selectedPlan.durationDays} Hari</span> dari tanggal tersebut.</p>
                      <div className="mt-1.5 pt-1.5 border-t border-sky-900/50 text-sky-300 font-medium">
                        Total Estimasi Berakhir: <span className="font-bold text-sky-200">
                          {(() => {
                            const currentExpiry = new Date(userProfile.subscription.expiresAt);
                            const now = new Date();
                            const baseDate = currentExpiry > now ? currentExpiry : now;
                            const newExpiry = new Date(baseDate.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
                            return newExpiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Plan Switcher for Paid Plans */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Pilihan Perpanjangan:
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
                  {RENEWAL_PLANS.map((p) => {
                    const isCur = selectedPlanId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`py-2 px-1 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
                          isCur 
                            ? 'bg-amber-500 text-stone-950 font-black shadow-md' 
                            : 'text-stone-400 hover:text-white hover:bg-stone-900'
                        }`}
                      >
                        <span className="text-[10px] uppercase">{p.durationShort}</span>
                        <span className="text-[11px] font-bold leading-none mt-0.5">
                          {p.id === 'monthly' ? '29rb' : p.id === 'semi_annual' ? '149rb' : '249rb'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedPlanId === 'annual' && (
                  <div className="mt-2.5 flex items-start gap-2 bg-gradient-to-r from-amber-500/10 to-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-200/90 leading-tight">
                      <strong className="text-amber-400">Pilihan Terbaik!</strong> Upgrade ke Paket Tahunan untuk fitur terlengkap, bebas biaya bulanan, dan penghematan tertinggi.
                    </div>
                  </div>
                )}
                {selectedPlanId === 'semi_annual' && (
                  <div className="mt-2.5 flex items-start gap-2 bg-gradient-to-r from-stone-800 to-stone-800/50 p-2 rounded-lg border border-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-stone-300 leading-tight">
                      Paket 6 Bulan adalah pilihan pas untuk komitmen jangka menengah. Lebih hemat dari paket bulanan.
                    </div>
                  </div>
                )}
              </div>

              {/* Plan Name & Tagline */}
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-white">{selectedPlan.name}</h2>
                  {selectedPlan.popular && (
                    <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  {selectedPlan.tagline}
                </p>
              </div>

              {/* Duration Box */}
              <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800 mb-5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-stone-300 font-medium">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Masa Aktif Akun:</span>
                </div>
                <div className="font-bold text-amber-400">
                  {selectedPlan.durationLabel}
                </div>
              </div>

              {/* Features breakdown */}
              <div className="space-y-2 mb-6">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Termasuk Fitur Unggulan:</div>
                {selectedPlan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Customer summary */}
              <div className="pt-4 border-t border-stone-800 text-xs space-y-2 bg-stone-950/40 p-3 rounded-xl">
                {proratedDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 bg-emerald-950/30 -mx-3 px-3 py-2 mb-2 border-b border-emerald-900/50">
                    <span className="font-medium">Diskon Sisa Hari Paket Lama:</span>
                    <span className="font-bold tracking-wider">-Rp {proratedDiscount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-400">
                  <span>Nama Akun:</span>
                  <span className="text-white font-semibold">{userProfile.name}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Email Akun:</span>
                  <span className="text-white font-semibold">{userProfile.email}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>No. Invoice:</span>
                  <span className="text-amber-300 font-mono">{invoiceId}</span>
                </div>
              </div>

            </div>

            {/* Voucher / Kupon Promo Input */}
            {!isTrial && (
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-200 uppercase tracking-wider mb-3">
                  <Tag className="w-4 h-4 text-amber-400" />
                  <span>Punya Kode Voucher Diskon?</span>
                </div>
                
                <form onSubmit={handleApplyVoucher} className="flex gap-2">
                  <input 
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Contoh: HEMAT20, LAUNCH50"
                    className="flex-1 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white uppercase tracking-wider outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold rounded-xl text-xs border border-stone-700 transition-colors"
                  >
                    Gunakan
                  </button>
                </form>

                {voucherSuccess && (
                  <div className="mt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-950/30 p-2 rounded-xl border border-emerald-800/40">
                    <Check className="w-3.5 h-3.5" />
                    <span>{voucherSuccess}</span>
                  </div>
                )}
                {voucherError && (
                  <div className="mt-2 text-xs text-rose-400 font-semibold flex items-center gap-1.5 bg-rose-950/30 p-2 rounded-xl border border-rose-800/40">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{voucherError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Price Calculation Summary */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-stone-800">
                Rincian Pembayaran
              </h3>

              <div className="flex justify-between text-xs text-stone-400">
                <span>Harga Normal Paket</span>
                <span className="font-semibold text-stone-200">
                  {originalPrice === 0 ? "Rp 0" : `Rp ${originalPrice.toLocaleString('id-ID')}`}
                </span>
              </div>

              {baseDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-medium">
                  <span>Diskon Paket ({selectedPlan.badge || 'Hemat'})</span>
                  <span>- Rp {baseDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}

              {extraVoucherDiscount > 0 && (
                <div className="flex justify-between text-xs text-amber-400 font-semibold">
                  <span>Kupon Promo ({appliedVoucher?.code})</span>
                  <span>- Rp {extraVoucherDiscount.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-stone-400">
                <span>Biaya Transaksi & Layanan</span>
                <span className="text-emerald-400 font-bold">Gratis (Rp 0)</span>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-between items-baseline">
                <div>
                  <span className="text-xs text-stone-400 block font-medium">Total Tagihan</span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    {isTrial ? "Uji Coba 24 Jam" : "Aktivasi Instan"}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {finalTotal === 0 ? (
                    <span className="text-emerald-400">Rp 0 (Gratis)</span>
                  ) : (
                    <span>Rp {finalTotal.toLocaleString('id-ID')}</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: PAYMENT GATEWAY & METHOD SELECTION (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* If Free Trial (0 Rupiah Flow) */}
            {isTrial ? (
              <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    Uji Coba 24 Jam Siap Diaktifkan
                  </h3>
                  <p className="text-sm text-stone-300 mt-2 max-w-md mx-auto">
                    Anda memilih paket <strong>Free Trial</strong>. Tidak ada biaya yang dikenakan (Rp 0) dan Anda dapat langsung menikmati semua 10 fitur Portal Uang.
                  </p>
                </div>

                <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-3 text-xs">
                  <div className="flex items-center gap-3 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Tanpa Kartu Kredit & Tanpa Pembayaran Awal</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Akses Penuh Seluruh 10 Modul Keuangan & Bot Telegram</span>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Dapat diupgrade ke paket Bulanan / Tahunan kapan saja</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.01]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{processingStep || "Mengaktifkan Akun..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Aktifkan Free Trial 24 Jam & Buka Dashboard</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* PAID PLANS PAYMENT GATEWAY METHODS (NO CREDIT CARD - CLEAN 3 TABS) */
              <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="border-b border-stone-800 pb-4">
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    Pilih Metode Pembayaran
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    Pilih salah satu metode pembayaran instan otomatis di bawah ini (Berlaku 24 Jam):
                  </p>
                </div>

                
  {/* Check active channels from Duitku if available */}
  {(() => {
    const hasDynamic = duitkuMethods && duitkuMethods.length > 0;
    const hasQris = hasDynamic ? duitkuMethods.some(m => m.paymentMethod === 'NQ') : true;
    const activeVA = hasDynamic 
       ? duitkuMethods.filter(m => ['BC', 'M2', 'BR', 'B1', 'NC', 'VA', 'A1', 'I1', 'B8'].includes(m.paymentMethod)) 
       : null;
    const hasVA = hasDynamic ? activeVA.length > 0 : true;
    
    const activeEwallet = hasDynamic
       ? duitkuMethods.filter(m => ['GP', 'SP', 'OV', 'DA', 'LA', 'SA'].includes(m.paymentMethod))
       : null;
    const hasEwallet = hasDynamic ? activeEwallet.length > 0 : true;

    // Reset default selected tab if current tab is suddenly disabled by Duitku
    // (This is a simplified approach, usually done in useEffect, but safe here if we just visually hide disabled tabs)

    // Helper to map Duitku code to our VA keys
    const getVaKey = (code) => {
      switch(code) {
        case 'BC': return 'va_bca';
        case 'M2': return 'va_mandiri';
        case 'BR': return 'va_bri';
        case 'B1': return 'va_bni';
        case 'NC': return 'va_cimb';
        case 'VA': return 'va_permata';
        default: return 'va_'+code.toLowerCase();
      }
    };
    
    const getEwalletKey = (code) => {
      switch(code) {
        case 'GP': return 'gopay';
        case 'SP': return 'shopeepay';
        case 'OV': return 'ovo';
        case 'DA': return 'dana';
        case 'LA': return 'linkaja';
        case 'SA': return 'shopeepay'; // Sometimes code varies
        default: return code.toLowerCase();
      }
    };

    const renderedVaList = activeVA ? activeVA.map(m => getVaKey(m.paymentMethod)) : ['va_bca', 'va_mandiri', 'va_bri', 'va_bni'];
    const renderedEwalletList = activeEwallet ? activeEwallet.map(m => getEwalletKey(m.paymentMethod)) : ['gopay', 'ovo', 'dana', 'shopeepay'];

    return (
      <>
  
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')} style={{ display: hasQris ? 'flex' : 'none' }}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'qris'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md ring-1 ring-amber-500/40'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <QrCode className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">QRIS Instan</span>
                    <span className="text-[10px] text-emerald-400 font-medium">Semua App / Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod((renderedVaList[0] as any) || 'va_bca')} style={{ display: hasVA ? 'flex' : 'none' }}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod?.startsWith('va_')
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md ring-1 ring-amber-500/40'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">Virtual Account</span>
                    <span className="text-[10px] text-stone-400 font-medium">BCA, Mandiri, BRI, BNI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ewallet')} style={{ display: hasEwallet ? 'flex' : 'none' }}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                      paymentMethod === 'ewallet'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md ring-1 ring-amber-500/40'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">E-Wallet</span>
                    <span className="text-[10px] text-stone-400 font-medium">GoPay, OVO, DANA</span>
                  </button>
                </div>

                {/* TAB 1: QRIS DETAILS */}
                {paymentMethod === 'qris' && (
                  <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 text-center space-y-4 animate-fadeIn">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                      <Zap className="w-3.5 h-3.5" /> Duitku QRIS Realtime Instant Settlement &bull; Berlaku 24 Jam
                    </div>

                    {/* QR Code Card */}
                    <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl max-w-[240px] mx-auto border border-stone-300">
                      <div className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-2">
                        QRIS Standar Pembayaran Nasional
                      </div>
                      
                      {qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt="Duitku QRIS Code" 
                          className="w-48 h-48 mx-auto rounded-lg object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-stone-100 rounded-lg">
                          <Loader2 className="w-8 h-8 text-stone-500 animate-spin" />
                        </div>
                      )}

                      <div className="text-[9px] font-bold text-slate-600 mt-2">
                        NMID: ID102026889219 &bull; Duitku PG
                      </div>
                    </div>

                    <div className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                      Scan QRIS resmi Duitku di atas menggunakan <strong className="text-stone-200">GoPay, OVO, DANA, BCA Mobile, Livin' Mandiri, BRImo, ShopeePay</strong>, atau m-Banking Anda.
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs text-stone-300 font-mono bg-stone-900 p-3 rounded-xl border border-stone-800 max-w-sm mx-auto">
                      <span>Nominal Transfer:</span>
                      <strong className="text-amber-400 text-sm">Rp {finalTotal.toLocaleString('id-ID')}</strong>
                      <button 
                        onClick={() => copyToClipboard(String(finalTotal), 'amount')}
                        className="ml-2 p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 rounded-md transition-colors"
                        title="Salin Nominal"
                      >
                        {copiedField === 'amount' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: VIRTUAL ACCOUNT DETAILS */}
                {paymentMethod?.startsWith('va_') && (
                  <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 space-y-4 animate-fadeIn">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      Pilih Bank Virtual Account Duitku:
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(renderedVaList as any[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaymentMethod(key)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                            paymentMethod === key
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          {getVaInfo(key).bank}
                        </button>
                      ))}
                    </div>

                    {/* VA Box Display */}
                    {paymentMethod?.startsWith("va_") && (
                      <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                        <div className="text-xs text-stone-400 flex justify-between">
                          <span>Nomor Virtual Account {getVaInfo(paymentMethod as string).bank}:</span>
                          <span className="text-emerald-400 text-[10px] font-bold">Duitku Direct VA (24 Jam)</span>
                        </div>
                        <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
                          <span className="font-mono text-lg font-bold text-amber-400 tracking-wider">
                            {duitkuInvoice?.vaNumber || getVaInfo(paymentMethod as string).number}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(duitkuInvoice?.vaNumber || getVaInfo(paymentMethod as string).number, 'va')}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedField === 'va' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin No. VA</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-stone-400 leading-relaxed pt-1">
                          Petunjuk: Buka aplikasi m-Banking Anda, pilih menu Transfer / Pembayaran &gt; Virtual Account, lalu masukkan nomor VA di atas.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: E-WALLET DETAILS */}
                {paymentMethod === 'ewallet' && (
                  <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 space-y-4 animate-fadeIn">
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      Pilih Dompet Digital:
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(renderedEwalletList as any[]).map((prov) => (
                        <button
                          key={prov}
                          type="button"
                          onClick={() => setEwalletProvider(prov)}
                          className={`p-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${
                            ewalletProvider === prov
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                          }`}
                        >
                          {prov}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                        Nomor Handphone Terdaftar di {ewalletProvider.toUpperCase()}
                      </label>
                      <input 
                        type="tel"
                        value={ewalletPhone}
                        onChange={(e) => setEwalletPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                      />
                      <div className="text-[11px] text-stone-500 mt-1">
                        Notifikasi persetujuan pembayaran akan otomatis dikirimkan ke aplikasi {ewalletProvider.toUpperCase()} Anda.
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancel Anytime Trust Badge */}
                {!isTrial && (
                  <div className="flex justify-center items-center gap-1.5 mb-4 text-[11px] text-stone-400 bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/80">
                    <Shield className="w-3.5 h-3.5 text-stone-500" />
                    <span>Langganan dapat dibatalkan kapan saja melalui Pengaturan. Tidak ada biaya tersembunyi.</span>
                  </div>
                )}

                
      </>
    );
  })()}
  {/* Action Confirmation Button */}
                <button
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/20 hover:scale-[1.01]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{processingStep || "Memverifikasi Pembayaran..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Konfirmasi Pembayaran & Verifikasi Pelunasan</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Security Guarantee Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-stone-400 text-center">
                  <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Enkripsi SSL 256-bit</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Aktivasi Otomatis Instan</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>Garansi Duitku PG Resmi</span>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* SUCCESS ACTIVATION MODAL */}
      {isSuccess && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-stone-900 border-2 border-emerald-500/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-8 text-center space-y-5 relative">
            
            {/* Animated Celebration Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto shadow-xl">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Status: LUNAS & Paket Aktif Otomatis
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Pembayaran Lunas & Akun Aktif!
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-sm mx-auto">
                Paket <strong>{selectedPlan.name}</strong> telah berhasil diaktifkan secara otomatis untuk akun <strong>{userProfile.email}</strong>.
              </p>
            </div>

            {/* Receipt Box */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-xs space-y-2.5 text-left">
              <div className="flex justify-between text-stone-400">
                <span>Status Transaksi:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                  LUNAS / TERVERIFIKASI
                </span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>No. Invoice:</span>
                <span className="text-amber-300 font-mono font-bold">{invoiceId}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Paket Langganan:</span>
                <span className="text-white font-bold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Durasi Masa Aktif:</span>
                <span className="text-amber-400 font-bold">{selectedPlan.durationLabel}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Berlaku Hingga:</span>
                <span className="text-emerald-400 font-bold">{formattedExpiryDate}</span>
              </div>
              <div className="flex justify-between text-stone-400 pt-2 border-t border-stone-800/80">
                <span>Total Pembayaran:</span>
                <span className="text-white font-black text-sm">
                  {finalTotal === 0 ? "Rp 0 (Free Trial)" : `Rp ${finalTotal.toLocaleString('id-ID')}`}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate('/app/dashboard')}
                className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
              >
                <span>Buka Dashboard Portal Uang</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('/app/profile')}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
              >
                Lihat Detail Profil & Invois
              </button>
            </div>

          </div>
        </div>
      )}

    </LandingLayout>
  );
}
