
import React from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";

export default function Contact() {
  const { settings } = useGlobalSettings();
  return (
    <LandingLayout>
      <div className="py-20 max-w-4xl mx-auto px-4 w-full grid md:grid-cols-2 gap-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-6">Hubungi Kami</h1>
          <p className="text-stone-400 mb-8">Punya pertanyaan, kritik, atau saran? Kami ingin mendengar dari Anda!</p>
          <div className="space-y-4 text-stone-300">
            <p><strong>Email:</strong> support@auraledger.com</p>
            <p><strong>Twitter:</strong>@{settings.appName}</p>
            <p><strong>Alamat:</strong> Jakarta, Indonesia</p>
          </div>
        </div>
        
        <div className="bg-stone-900 p-6 rounded-2xl border border-stone-800">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-300 mb-1">Nama</label>
              <input type="text" className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-300 mb-1">Email</label>
              <input type="email" className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-300 mb-1">Pesan</label>
              <textarea rows={4} className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none"></textarea>
            </div>
            <button className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors">Kirim Pesan</button>
          </form>
        </div>
      </div>
    </LandingLayout>
  );
}
