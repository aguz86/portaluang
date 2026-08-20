
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { Link } from "react-router-dom";
import { LandingLayout } from "../components/LandingLayout";
import { 
  ArrowRight, 
  BarChart3, 
  Wallet, 
  Zap, 
  TrendingUp, 
  Bot, 
  Calendar, 
  FileSpreadsheet, 
  Smartphone, 
  ShieldCheck,
  Target,
  Calculator,
  Flame,
  PiggyBank,
  CheckCircle2,
  PieChart,
  ChevronRight,
  Star,
  Check,
  X,
  Sparkles
} from "lucide-react";


const TypewriterHeadline = ({ appName }: { appName: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fullText1 = "Tinggalkan Spreadsheet Rumit.";
  const prefix2 = "Kuasai Uang Anda dengan ";
  const fullText2 = `${prefix2}${appName}.`;
  const fullText = `${fullText1}\n${fullText2}`;
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isDeleting) {
      if (displayedText === "") {
        setIsDeleting(false);
        timer = setTimeout(() => {}, 500);
      } else {
        timer = setTimeout(() => {
          setDisplayedText(prev => prev.slice(0, -1));
        }, 20);
      }
    } else {
      if (displayedText === fullText) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 3000);
      } else {
        timer = setTimeout(() => {
          setDisplayedText(fullText.slice(0, displayedText.length + 1));
        }, 50);
      }
    }
    
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, fullText]);

  const lines = displayedText.split('\n');

  const renderLine2 = (text: string) => {
    if (text.length <= prefix2.length) {
      return <span>{text}</span>;
    } else {
      const remaining = text.slice(prefix2.length);
      return (
        <>
          <span>{prefix2}</span>
          <span className="text-amber-400 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            {remaining}
          </span>
        </>
      );
    }
  };

  return (
    <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mb-4 leading-tight min-h-[90px] sm:min-h-[130px] md:min-h-[170px]">
      <span className="inline-block">{lines[0]}</span>
      {lines.length > 1 && (
        <>
          <br />
          {renderLine2(lines[1])}
        </>
      )}
      <span className="inline-block w-[3px] h-[0.9em] bg-amber-400 animate-pulse ml-1 align-middle"></span>
    </h1>
  );
};

export default function Home() {
  const { settings } = useGlobalSettings();
  const [activeCategory, setActiveCategory] = useState<'all' | 'budget' | 'convenience' | 'analytics'>('all');
  const [userCount, setUserCount] = useState<number>(10000);

  useEffect(() => {
    fetch('/api/stats/user-count')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.count !== undefined) {
          // Add base users plus dynamic live users
          setUserCount(10000 + data.count);
        }
      })
      .catch(() => {});
  }, []);

  // Custom Income State for prospective users
  const [monthlyIncome, setMonthlyIncome] = useState<number>(10000000); // Rp 10 Juta default
  const [inputIncomeText, setInputIncomeText] = useState<string>("10.000.000");

  const handleCustomIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) {
      setInputIncomeText("");
      setMonthlyIncome(0);
      return;
    }
    const numValue = Math.min(Math.max(parseInt(rawValue, 10), 0), 1000000000);
    setMonthlyIncome(numValue);
    setInputIncomeText(numValue.toLocaleString('id-ID'));
  };

  const handlePresetIncome = (amount: number) => {
    setMonthlyIncome(amount);
    setInputIncomeText(amount.toLocaleString('id-ID'));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setMonthlyIncome(val);
    setInputIncomeText(val.toLocaleString('id-ID'));
  };

  // Estimated savings
  const estimatedSavingsMonth = Math.round(monthlyIncome * 0.18);
  const estimatedSavingsYear = estimatedSavingsMonth * 12;

  // Payday Planner 50/30/20
  const needsAmount = Math.round(monthlyIncome * 0.50);
  const wantsAmount = Math.round(monthlyIncome * 0.30);
  const savingsAmount = Math.round(monthlyIncome * 0.20);

  const comparisonRows = [
    {
      category: 'budget',
      feature: 'Metode Penganggaran (ZBB)',
      aura: 'Zero-Based Budgeting: Setiap rupiah dialokasikan sebelum dibelanjakan',
      sheets: 'Harus rumus manual, rawan formula error #REF!',
      others: 'Hanya mencatat pengeluaran pasif tanpa kontrol anggaran',
    },
    {
      category: 'convenience',
      feature: 'Kecepatan Input di Smartphone',
      aura: '3 Detik via Telegram Bot & Web App kilat',
      sheets: 'Buka spreadsheet lambat, zoom cell rumit di HP',
      others: 'Banyak klik form kaku, disela pop-up iklan',
    },
    {
      category: 'convenience',
      feature: 'Pengingat Tagihan & Kalender',
      aura: 'Kalender visual + Notifikasi Telegram (Bebas Denda)',
      sheets: 'Tidak ada pengingat otomatis (harus cek manual)',
      others: 'Notifikasi sering tertelan power saver sistem',
    },
    {
      category: 'analytics',
      feature: 'AI Financial Advisor & Kekayaan',
      aura: 'Analisis AI deteksi bocor halus + Portofolio Net Worth',
      sheets: 'Hanya angka mentah, rumus API sering timeout',
      others: 'Fitur aset & hutang dikunci paket mahal',
    },
  ];

  const coreFeatures = [
    {
      icon: Target,
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      title: "Zero-Based Budgeting",
      desc: "Kunci batas belanja tiap pos sebelum bulan berjalan agar tidak overbudget."
    },
    {
      icon: Smartphone,
      color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
      title: "Bot Telegram 3 Detik",
      desc: "Catat pengeluaran & pemasukan secepat kirim pesan chat."
    },
    {
      icon: Calendar,
      color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
      title: "Kalender Tagihan",
      desc: "Visualisasi jatuh tempo listrik, cicilan, & langganan bebas denda."
    },
    {
      icon: PieChart,
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      title: "Payday Planner 50/30/20",
      desc: "Bagi gaji otomatis ke pos Kebutuhan, Keinginan, dan Tabungan."
    },
    {
      icon: TrendingUp,
      color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
      title: "Portofolio & Net Worth",
      desc: "Pantau aset saham, emas, reksadana, dan strategi pelunasan hutang."
    },
    {
      icon: Bot,
      color: "text-pink-400 bg-pink-500/15 border-pink-500/30",
      title: "AI Financial Advisor",
      desc: "Konsultasi 24/7 bersama Gemini AI untuk rekomendasi penghematan cerdas."
    }
  ];

  return (
    <LandingLayout>
      {/* 1. HERO SECTION (COMPACT & HIGH IMPACT) */}
      <section className="relative overflow-hidden pt-8 pb-12 md:pt-14 md:pb-16 border-b border-stone-800">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 md:w-[600px] h-96 md:h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Rating Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold mb-4 border border-amber-500/30">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-stone-300">|</span>
            <span className="text-white font-bold">4.9/5</span>
            <span className="text-stone-300 hidden sm:inline">Dipercaya {userCount.toLocaleString('id-ID')} Pengguna di Indonesia</span>
          </div>

          {/* Headline */}
          <TypewriterHeadline appName={settings.appName} />

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-stone-300 mb-7 max-w-2xl mx-auto leading-relaxed">
            Hentikan "bocor halus" seketika dengan sistem <strong className="text-amber-300">Zero-Based Budgeting</strong>, integrasi <strong className="text-cyan-300">Telegram Bot 3 Detik</strong>, dan wawasan <strong className="text-emerald-300">AI Cerdas</strong>.
          </p>

          {/* Action Triggers */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-4">
            <Link 
              to="/register" 
              className="w-full sm:w-auto flex-1 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-base flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <Zap className="w-4 h-4 fill-stone-950" />
              <span>Mulai Trial 24 Jam</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a 
              href="#calculator" 
              className="w-full sm:w-auto px-5 py-3.5 bg-stone-900 hover:bg-stone-850 border border-stone-700 hover:border-amber-500/50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Simulasi Penghematan</span>
            </a>
          </div>

          <p className="text-xs text-stone-400 font-medium mb-8">
            ⚡ Setup 60 detik &bull; Free Trial 24 Jam &bull; Tanpa Kartu Kredit
          </p>

          {/* 4 Compact Value Pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">100% Bebas Iklan</div>
                <div className="text-[10px] text-stone-400 truncate">Privasi Terenkripsi</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Bot Telegram Kilat</div>
                <div className="text-[10px] text-stone-400 truncate">Input dalam 3 detik</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">Zero-Based Budget</div>
                <div className="text-[10px] text-stone-400 truncate">Alokasi terencana</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/15 text-pink-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">AI Financial Advisor</div>
                <div className="text-[10px] text-stone-400 truncate">Deteksi kebocoran</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. COMPACT SIDE-BY-SIDE SIMULATOR (HIGH INTENT & FAST CONVERSION) */}
      <section id="calculator" className="py-10 md:py-14 bg-stone-900/40 border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-5 sm:p-8 rounded-3xl bg-stone-900 border-2 border-amber-500/30 shadow-2xl relative overflow-hidden">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-stone-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1.5 border border-amber-500/30">
                  <Calculator className="w-3.5 h-3.5" /> Simulator Finansial Interaktif
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Hitung Potensi Penghematan & Alokasi Gaji Anda
                </h2>
              </div>
              <Link 
                to="/register" 
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm self-start md:self-center shrink-0 transition-all shadow-md"
              >
                <span>Mulai Atur Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 2-Column Split: Controls on Left, Results on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Inputs (5 Cols) */}
              <div className="lg:col-span-5 bg-stone-950 p-4 sm:p-5 rounded-2xl border border-stone-800 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    Pemasukan Bulanan Anda:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-bold text-sm sm:text-base">
                      Rp
                    </div>
                    <input
                      type="text"
                      value={inputIncomeText}
                      onChange={handleCustomIncomeChange}
                      placeholder="Contoh: 10.000.000"
                      className="w-full pl-10 pr-3 py-2.5 bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl text-base sm:text-lg font-black text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Preset Chips */}
                <div>
                  <span className="text-[11px] text-stone-400 font-medium block mb-1.5">Pilihan Cepat:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "5 Jt", val: 5000000 },
                      { label: "10 Jt", val: 10000000 },
                      { label: "15 Jt", val: 15000000 },
                      { label: "25 Jt", val: 25000000 },
                      { label: "50 Jt", val: 50000000 },
                      { label: "100 Jt", val: 100000000 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => handlePresetIncome(preset.val)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center transition-all ${
                          monthlyIncome === preset.val
                            ? "bg-amber-500 text-stone-950 shadow-sm"
                            : "bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800"
                        }`}
                      >
                        Rp {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Range Slider */}
                <div>
                  <div className="flex justify-between items-center text-[11px] text-stone-400 mb-1">
                    <span>Slider Cepat</span>
                    <span className="text-amber-400 font-semibold">Maks Rp 100 Jt</span>
                  </div>
                  <input 
                    type="range" 
                    min={1000000} 
                    max={100000000} 
                    step={500000}
                    value={Math.min(monthlyIncome, 100000000)}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-stone-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Right Column: Dynamic Breakdown & Savings Output (7 Cols) */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Savings Highlights (2 Cards) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800">
                    <div className="text-[11px] text-stone-400 font-medium">Potensi Hemat/Bln (~18%)</div>
                    <div className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                      + Rp {estimatedSavingsMonth.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="text-[11px] text-amber-300 font-medium">Tabungan Ekstra / Tahun</div>
                    <div className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
                      + Rp {estimatedSavingsYear.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Payday 50/30/20 Breakdown */}
                <div className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="text-xs font-bold text-stone-200 mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                      Simulasi Alokasi Gajian (Metode 50/30/20)
                    </span>
                    <span className="text-[11px] text-stone-400">Total: Rp {monthlyIncome.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-left">
                    <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                      <div className="text-[11px] text-stone-400 font-medium">50% Pokok</div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        Rp {needsAmount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800">
                      <div className="text-[11px] text-stone-400 font-medium">30% Keinginan</div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        Rp {wantsAmount.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30">
                      <div className="text-[11px] text-emerald-300 font-semibold">20% Tabungan</div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                        Rp {savingsAmount.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 3. CORE 6 SUPERPOWERS (BENTO GRID - CONCISE & NO SCROLL BLOAT) */}
      <section id="features" className="py-10 md:py-16 bg-stone-950 border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/20">
                Fitur Unggulan
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Solusi Lengkap Finansial Anda
              </h2>
            </div>
            <Link 
              to="/features" 
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-400 hover:text-amber-300 self-start sm:self-auto"
            >
              <span>Lihat Detail Semua Fitur</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Compact 3x2 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {coreFeatures.map((feat, index) => {
              const IconComp = feat.icon;
              return (
                <div 
                  key={index} 
                  className="p-4 sm:p-5 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${feat.color}`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-stone-400 text-xs leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 4. COMPACT COMPARISON HIGHLIGHTS (BEFORE/AFTER & HEAD-TO-HEAD) */}
      <section id="comparison" className="py-10 md:py-16 bg-stone-900/30 border-b border-stone-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-500/20">
              Perbandingan Transparan
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Mengapa Berpindah ke {settings.appName}?
            </h2>
          </div>

          {/* Compact Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-800 bg-stone-900/90 shadow-xl mb-6">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-950 text-xs">
                  <th className="py-3 px-4 font-bold text-stone-400 w-1/4">Aspek</th>
                  <th className="py-3 px-4 font-extrabold text-amber-300 bg-amber-500/15 border-x border-amber-500/40 w-1/3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{settings.appName}</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-stone-300 w-1/4">Google Sheets / Excel</th>
                  <th className="py-3 px-4 font-bold text-stone-300 w-1/4">Aplikasi Lain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 text-xs">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{row.feature}</td>
                    <td className="py-3 px-4 bg-amber-500/10 border-x border-amber-500/30 text-stone-100 font-medium">
                      <div className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{row.aura}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-400">{row.sheets}</td>
                    <td className="py-3 px-4 text-stone-400">{row.others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick CTA */}
          <div className="text-center">
            <Link 
              to="/register" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-sm transition-all hover:scale-105 shadow-md shadow-amber-500/15"
            >
              <span>Coba Gratis Sekarang (Free Trial 24 Jam)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* 5. STREAMLINED FINAL CTA */}
      <section className="py-12 md:py-16 bg-stone-950 text-center relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Siap Mengambil Kendali Keuangan Anda?
          </h2>
          <p className="text-stone-300 text-sm sm:text-base mb-6 max-w-xl mx-auto">
            Daftar dalam 60 detik dan nikmati pengelolaan anggaran yang rapi, otomatis, dan bebas stres.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-6">
            <Link 
              to="/register" 
              className="w-full sm:w-auto flex-1 px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-base flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-xl shadow-amber-500/25"
            >
              <Flame className="w-4 h-4 fill-stone-950 text-stone-950" />
              <span>Mulai Trial 24 Jam</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-stone-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Free Trial 24 Jam
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Tanpa Kartu Kredit
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ekspor Data Kapan Saja
            </span>
          </div>
        </div>
      </section>

      {/* 6. STICKY FLOATING CTA */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-40 max-w-sm pointer-events-auto">
        <div className="p-3 rounded-2xl bg-stone-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 shadow-amber-500/10">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate">
              Kuasai Finansial Anda
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Trial 24 Jam &bull; Setup 60 Detik
            </div>
          </div>
          <Link
            to="/register"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shrink-0 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1"
          >
            <span>Daftar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </LandingLayout>
  );
}



