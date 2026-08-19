import React, { useState, useEffect } from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { Link } from "react-router-dom";
import { CheckCircle2, Shield, Zap, Lock, Timer, AlertCircle, PlusCircle } from "lucide-react";

export default function ProLanding() {
  const { settings } = useGlobalSettings();
  const [headline, setHeadline] = useState('Otomatiskan Keuangan Anda Sepenuhnya');
  const [subHeadline, setSubHeadline] = useState('Dapatkan akses tak terbatas ke semua fitur premium, sinkronisasi cloud, dan wawasan AI.');
  const [scarcityEnabled, setScarcityEnabled] = useState(false);
  const [scarcityText, setScarcityText] = useState('');
  const [countdownMinutes, setCountdownMinutes] = useState(15);
  
  const [bumpEnabled, setBumpEnabled] = useState(false);
  const [bumpTitle, setBumpTitle] = useState('');
  const [bumpDescription, setBumpDescription] = useState('');
  const [bumpPrice, setBumpPrice] = useState(0);

  const [bumpSelected, setBumpSelected] = useState(false);

  const [timeLeft, setTimeLeft] = useState(15 * 60);


  const [basePrice, setBasePrice] = useState(29000);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/public-marketing');
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          if (d.headline) setHeadline(d.headline);
          if (d.subHeadline) setSubHeadline(d.subHeadline);
          if (d.scarcityEnabled) {
            setScarcityEnabled(true);
            setScarcityText(d.scarcityText);
            setCountdownMinutes(d.countdownMinutes || 15);
            setTimeLeft((d.countdownMinutes || 15) * 60);
          }
          if (d.bumpEnabled) {
            setBumpEnabled(true);
            setBumpTitle(d.bumpTitle);
            setBumpDescription(d.bumpDescription);
            setBumpPrice(d.bumpPrice);
          }
        }
      } catch (err) {
        console.error('Failed to fetch marketing settings', err);
      }
    };
    
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/subscriptions');
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const proPlan = data.data.find((p: any) => p.name.toLowerCase().includes('pro'));
          if (proPlan) {
            setBasePrice(proPlan.price);
          }
        }
      } catch (err) {
        console.error('Failed to fetch plans', err);
      }
    };
    
    fetchSettings();
    fetchPlans();
  }, []);


  useEffect(() => {
    if (!scarcityEnabled) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [scarcityEnabled]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };


  const total = basePrice + (bumpSelected ? bumpPrice : 0);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <nav className="p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-lg">PU</div>
            <span className="font-extrabold text-xl tracking-tight text-white">{settings.appName}</span>
          </Link>
          <Link to="/" className="text-stone-400 hover:text-white text-sm">Kembali</Link>
        </div>
      </nav>
      
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Value Proposition */}
        <div>
          <div className="inline-block bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6">Upgrade ke Pro</div>
          <h1 className="text-4xl font-extrabold text-white mb-6 leading-tight">{headline}</h1>
          <p className="text-stone-400 text-lg mb-8">{subHeadline}</p>
          
          <ul className="space-y-4">
            <li className="flex gap-3"><CheckCircle2 className="w-6 h-6 text-amber-500 shrink-0"/><span className="text-stone-300">Akun Tak Terbatas & Sinkronisasi Cloud</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-6 h-6 text-amber-500 shrink-0"/><span className="text-stone-300">Wawasan AI (Gemini Flash 3.6)</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-6 h-6 text-amber-500 shrink-0"/><span className="text-stone-300">Notifikasi Tagihan via Telegram</span></li>
            <li className="flex gap-3"><CheckCircle2 className="w-6 h-6 text-amber-500 shrink-0"/><span className="text-stone-300">Laporan Komprehensif (PDF/Excel)</span></li>
          </ul>
        </div>
        
        {/* Checkout Card */}
        <div>
          {scarcityEnabled && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl mb-6 flex flex-col items-center justify-center text-center shadow-lg shadow-rose-500/5">
              <div className="flex items-center gap-2 mb-2 font-bold text-rose-500">
                <Timer className="w-5 h-5 animate-pulse" />
                <span>{scarcityText}</span>
              </div>
              <div className="text-3xl font-extrabold font-mono tracking-wider">{formatTime(timeLeft)}</div>
            </div>
          )}

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xl font-bold">{settings.appName} Pro</span>
              <span className="text-3xl font-extrabold">Rp {Math.floor(basePrice/1000)}k<span className="text-base text-stone-400 font-normal">/bln</span></span>
            </div>

            {bumpEnabled && (
              <div 
                className={`mb-6 p-4 rounded-xl border-2 cursor-pointer transition-all ${bumpSelected ? 'bg-emerald-500/10 border-emerald-500' : 'bg-stone-950 border-stone-800 hover:border-stone-700'}`}
                onClick={() => setBumpSelected(!bumpSelected)}
              >
                <div className="flex gap-3 items-start">
                  <div className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${bumpSelected ? 'bg-emerald-500 border-emerald-500 text-stone-950' : 'border-stone-600 bg-stone-900'}`}>
                    {bumpSelected && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-100 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      {bumpTitle}
                    </h4>
                    <p className="text-sm text-stone-400 mt-1">{bumpDescription}</p>
                    <p className="text-sm font-bold text-emerald-400 mt-2">+ Rp {bumpPrice.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-stone-950 p-4 rounded-xl mb-6">
              <h4 className="text-sm font-bold text-stone-400 mb-3 uppercase tracking-wider">Ringkasan Order</h4>
              <div className="flex justify-between mb-2 text-stone-300">
                <span>Langganan Pro (1 Bulan)</span>
                <span>Rp {basePrice.toLocaleString('id-ID')}</span>
              </div>
              {bumpSelected && (
                <div className="flex justify-between mb-2 text-stone-300">
                  <span>Konsultasi 1-on-1</span>
                  <span>Rp {bumpPrice.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="border-t border-stone-800 my-3 pt-3 flex justify-between font-bold text-white text-lg">
                <span>Total</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
            
            <button onClick={() => window.location.href = "/register"} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-lg flex items-center justify-center gap-2 mb-4 transition-transform active:scale-95 shadow-lg shadow-amber-500/20">
              <Lock className="w-5 h-5"/> Lanjut Pembayaran
            </button>
            <p className="text-center text-xs text-stone-500 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3"/> Pembayaran Aman & Terenkripsi
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
