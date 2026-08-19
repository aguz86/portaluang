
import React from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";
import { Wallet, PieChart, Bell, BrainCircuit } from "lucide-react";

export default function Features() {
  const { settings } = useGlobalSettings();
  return (
    <LandingLayout>
      <div className="py-20 max-w-7xl mx-auto px-4 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Fitur Lengkap {settings.appName}</h1>
          <p className="text-xl text-stone-400 max-w-2xl mx-auto">Satu aplikasi untuk mengatur, melacak, dan menumbuhkan keuangan Anda.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
              <Wallet className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Expense Tracker & Zero-Based Budget</h3>
            <p className="text-stone-400">Setiap rupiah punya tugas. Alokasikan pendapatan Anda ke pos-pos pengeluaran, tabungan, dan investasi sampai tersisa nol.</p>
          </div>
          
          <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">AI Financial Advisor</h3>
            <p className="text-stone-400">Terintegrasi dengan Gemini AI untuk memberikan analisis skor kesehatan keuangan Anda dan rekomendasi alokasi yang cerdas.</p>
          </div>
          
          <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
              <PieChart className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Laporan & Visualisasi</h3>
            <p className="text-stone-400">Pantau pertumbuhan Net Worth, arus kas bulanan, dan progres Sinking Fund dengan grafik interaktif yang mudah dipahami.</p>
          </div>
          
          <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Notifikasi Telegram</h3>
            <p className="text-stone-400">Jangan pernah telat bayar tagihan. Hubungkan bot Telegram kami untuk menerima pengingat harian atau mingguan.</p>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
