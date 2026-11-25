import React, { useState } from "react";
import { Link } from "react-router-dom";
import { LandingLayout } from "../components/LandingLayout";
import { Mail, KeyRound, Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "verify" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "reset_password" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Gagal mengirim kode OTP. Pastikan layanan email sudah aktif.");
      } else {
        setInfo(data.message || "Kode OTP 6 digit telah dikirim ke email Anda.");
        setStep("verify");
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Gagal mereset kata sandi.");
      } else {
        setStep("done");
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LandingLayout>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lupa Password</h2>
            <p className="text-stone-400 text-sm">
              {step === "email" && "Masukkan email Anda untuk menerima kode OTP 6 digit."}
              {step === "verify" && "Masukkan kode OTP dari email dan kata sandi baru Anda."}
              {step === "done" && "Kata sandi Anda telah berhasil diperbarui."}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-xl text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {info && step === "verify" && (
            <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-xl text-xs">
              {info}
            </div>
          )}

          {step === "email" && (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  Email Terdaftar
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-black rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Kirim Kode OTP</span>
              </button>
            </form>
          )}

          {step === "verify" && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Kode OTP (6 Digit)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white font-mono text-center tracking-[0.4em] text-lg focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={16}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-white text-sm focus:border-amber-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-black rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Simpan Password Baru</span>
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Ganti email atau kirim ulang OTP
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-5 rounded-2xl text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium">
                Password Anda berhasil direset. Silakan masuk kembali menggunakan password baru Anda.
              </p>
              <Link
                to="/login"
                className="inline-block w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-xl text-sm transition-colors"
              >
                Masuk ke Login
              </Link>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-stone-400">
            Kembali ke <Link to="/login" className="text-amber-500 hover:text-amber-400 font-bold">Halaman Login</Link>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
}
