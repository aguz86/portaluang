import React, { useState } from 'react';
import { X, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { hashPin } from '../utils/crypto';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  mode: 'setup' | 'verify';
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess, mode }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError('PIN minimal 4 digit.');
      return;
    }

    if (mode === 'setup') {
      if (pin !== confirmPin) {
        setError('PIN konfirmasi tidak cocok.');
        return;
      }
      localStorage.setItem('portal_uang_pin_hash', hashPin(pin));
      onSuccess(pin);
    } else {
      const storedHash = localStorage.getItem('portal_uang_pin_hash');
      if (storedHash === hashPin(pin)) {
        onSuccess(pin);
      } else {
        setError('PIN salah. Silakan coba lagi.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <h2 className="text-lg font-bold text-stone-200 flex items-center gap-2">
            {mode === 'setup' ? <ShieldCheck className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5 text-amber-500" />}
            {mode === 'setup' ? 'Buat PIN Keamanan' : 'Masukkan PIN'}
          </h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-stone-400">
            {mode === 'setup' 
              ? 'Buat PIN untuk mengenkripsi dan memproteksi file backup Anda.' 
              : 'Masukkan PIN Anda untuk mendekripsi atau mengekspor file.'}
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 block">PIN (Min. 4 Digit)</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-amber-500 text-center tracking-[0.5em] text-lg font-mono"
                placeholder="••••"
                autoFocus
                maxLength={8}
              />
            </div>

            {mode === 'setup' && (
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 block">Konfirmasi PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-stone-200 focus:outline-none focus:border-amber-500 text-center tracking-[0.5em] text-lg font-mono"
                  placeholder="••••"
                  maxLength={8}
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-stone-400 bg-stone-800 hover:text-stone-200 hover:bg-stone-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 transition-colors"
            >
              Lanjut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
