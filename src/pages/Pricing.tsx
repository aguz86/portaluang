import React from "react";
import { Link } from "react-router-dom";
import { LandingLayout } from "../components/LandingLayout";
import { Check, Clock, Sparkles, Shield, ArrowRight, Star } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "../utils/subscription";

export default function Pricing() {
  return (
    <LandingLayout>
      <div className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Pilihan Paket Berlangganan
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Transparan, Fleksibel, & Tanpa Biaya Tersembunyi
          </h1>
          <p className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto">
            Pilih paket langganan yang paling tepat untuk Kamu. Pengguna baru wajib memilih paket saat pendaftaran dan dapat menguji coba fitur lengkap dengan Free Trial 24 jam.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isPopular = plan.popular;
            const isTrial = plan.id === 'free_trial';

            return (
              <div 
                key={plan.id} 
                className={`p-6 sm:p-7 rounded-3xl flex flex-col justify-between transition-all duration-200 relative ${
                  isPopular 
                    ? 'bg-gradient-to-b from-stone-850 to-stone-900 border-2 border-amber-500 shadow-2xl shadow-amber-500/15 lg:-translate-y-2' 
                    : 'bg-stone-900 border-2 border-stone-800 hover:border-stone-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-stone-950" /> Paling Populer
                  </div>
                )}

                {plan.discountText && !isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-stone-950 px-3.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
                    {plan.discountText}
                  </div>
                )}

                {isTrial && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-md">
                    Uji Coba 24 Jam
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase mb-2 mt-1">
                    <span>{plan.name}</span>
                    <span className="text-amber-400 font-mono">{plan.durationShort}</span>
                  </div>

                  <div className="mb-4">
                    {plan.originalPrice && (
                      <div className="text-xs text-stone-500 line-through">
                        Rp {plan.originalPrice.toLocaleString('id-ID')}
                      </div>
                    )}
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {plan.price === 0 ? (
                        <span className="text-emerald-400">Rp 0</span>
                      ) : (
                        <span>Rp {plan.price.toLocaleString('id-ID')}</span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{plan.durationLabel}</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 mb-6 leading-relaxed bg-stone-950/70 p-3 rounded-xl border border-stone-800">
                    {plan.tagline}
                  </p>

                  <div className="space-y-3 mb-8">
                    <div className="text-xs font-bold uppercase text-stone-400 tracking-wider">Fitur Utama:</div>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-300">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Link 
                    to={`/register?plan=${plan.id}`}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      isPopular
                        ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/20 hover:scale-[1.02]"
                        : isTrial
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                        : "bg-stone-800 hover:bg-stone-700 text-white border border-stone-700"
                    }`}
                  >
                    <span>
                      {isTrial ? "Mulai Free Trial 24 Jam" : `Pilih ${plan.name}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[11px] text-center text-stone-500 mt-2 font-medium">
                    {isTrial ? "Tanpa kartu kredit & tanpa risiko" : "Aktivasi instan setelah pendaftaran"}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

        {/* FAQ Preview in Pricing */}
        <div className="mt-20 max-w-3xl mx-auto bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center shadow-xl">
          <Shield className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Bagaimana Cara Kerja Masa Aktif Langganan?</h3>
          <p className="text-sm text-stone-300 leading-relaxed mb-6">
            Setiap paket memiliki durasi aktif yang dihitung secara presisi sejak waktu pendaftaran atau perpanjangan. Untuk paket <strong>Free Trial 24 Jam</strong>, Kamu memiliki waktu 24 jam penuh sejak pendaftaran untuk mencoba semua fitur sebelum memutuskan untuk upgrade ke paket <strong>Bulanan (30 Hari)</strong>, <strong>6 Bulan (180 Hari)</strong>, atau <strong>1 Tahun (365 Hari)</strong>.
          </p>
          <Link 
            to="/register" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-md"
          >
            Daftar Sekarang & Mulai <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </LandingLayout>
  );
}
