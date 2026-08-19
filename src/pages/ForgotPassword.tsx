
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LandingLayout } from "../components/LandingLayout";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  return (
    <LandingLayout>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Lupa Password</h2>
            <p className="text-stone-400 text-sm">Masukkan email Anda untuk menerima tautan reset password.</p>
          </div>
          
          {sent ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg text-center text-sm">
              Tautan reset password telah dikirim ke email Anda. Silakan periksa inbox atau folder spam.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <div>
                <label className="block text-sm font-bold text-stone-300 mb-1">Email</label>
                <input type="email" required className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white focus:border-amber-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors mt-6">
                Kirim Tautan Reset
              </button>
            </form>
          )}
          
          <div className="mt-6 text-center text-sm text-stone-400">
            Kembali ke <Link to="/login" className="text-amber-500 hover:text-amber-400 font-bold">Halaman Login</Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
