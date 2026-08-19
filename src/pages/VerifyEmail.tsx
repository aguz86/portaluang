
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LandingLayout } from "../components/LandingLayout";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    // Simulate verification
    const timer = setTimeout(() => {
      setStatus(token ? "success" : "error");
    }, 1500);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <LandingLayout>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
          
          {status === "loading" && (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Memverifikasi Email...</h2>
              <p className="text-stone-400 text-sm">Mohon tunggu sebentar.</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Email Terverifikasi!</h2>
              <p className="text-stone-400 text-sm mb-6">Akun Anda sekarang telah aktif dan siap digunakan.</p>
              <Link to="/login" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors">
                Lanjut ke Login
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center">
              <XCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Verifikasi Gagal</h2>
              <p className="text-stone-400 text-sm mb-6">Tautan tidak valid atau sudah kadaluarsa.</p>
              <Link to="/contact" className="text-amber-500 hover:text-amber-400 font-bold">Hubungi Bantuan</Link>
            </div>
          )}
          
        </div>
      </div>
    </LandingLayout>
  );
}
