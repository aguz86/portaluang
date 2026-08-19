import React, { useState } from 'react';
import { PaydayConfig, formatRupiah } from '../types';
import { formatRpInput, parseRpInput } from '../utils/format';
import { 
  DollarSign, 
  Play, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';

interface IncomePaydayViewProps {
  paydayConfig: PaydayConfig;
  onUpdatePaydayConfig: (config: PaydayConfig) => void;
  onExecutePayday: (totalIncome: number) => void;
}

export const IncomePaydayView: React.FC<IncomePaydayViewProps> = ({
  paydayConfig,
  onUpdatePaydayConfig,
  onExecutePayday,
}) => {
  const [expectedIncome, setExpectedIncome] = useState<number>(paydayConfig.expectedIncome);
  const [nextDate, setNextDate] = useState<string>(paydayConfig.nextDate);
  const [frequency, setFrequency] = useState(paydayConfig.frequency);
  const [executedSuccess, setExecutedSuccess] = useState(false);

  const handleSaveConfig = () => {
    onUpdatePaydayConfig({
      ...paydayConfig,
      expectedIncome,
      nextDate,
      frequency,
    });
  };

  const handleRunDistribution = () => {
    onExecutePayday(expectedIncome);
    setExecutedSuccess(true);
    setTimeout(() => setExecutedSuccess(false), 4000);
  };

  // Distribution calculations
  const totalAllocatedFromRules = paydayConfig.rules.reduce((sum, r) => {
    if (r.type === 'fixed') return sum + r.value;
    return sum + (expectedIncome * (r.value / 100));
  }, 0);

  const unassignedPaydayCash = expectedIncome - totalAllocatedFromRules;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-stone-100">Perencana & Alokasi Otomatis Gaji (Payday Protocol)</h2>
            </div>
            <p className="text-xs text-stone-400 max-w-2xl">
              Otomatiskan rutinitas gajian Anda. Saat gaji cair, eksekusi alokasi terencana Anda untuk membagi dana ke tagihan, pos sinking fund, dan tabungan hanya dalam 5 detik.
            </p>
          </div>

          <button
            onClick={handleRunDistribution}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-stone-950 text-xs font-extrabold flex items-center gap-2 transition-all shadow-md"
          >
            <Play className="w-4 h-4 fill-current stroke-none" />
            <span>Eksekusi Alokasi Gajian ({formatRupiah(expectedIncome)})</span>
          </button>
        </div>

        {executedSuccess && (
          <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Transaksi gajian berhasil dicatat ke dalam buku catatan dan rekening Anda!</span>
          </div>
        )}
      </div>

      {/* Payday Schedule Configuration */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4 shadow-sm">
        <h3 className="font-bold text-stone-100 text-base">Aturan & Jawdal Gajian</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-stone-400 block mb-1">Frekuensi Penerimaan Gaji</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="weekly">Mingguan</option>
              <option value="biweekly">Dwi-Mingguan (Setiap 2 Minggu)</option>
              <option value="semimonthly">Dua Kali Sebulan (Tgl 25 & 10)</option>
              <option value="monthly">Bulanan</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Estimasi Gaji Bersih (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={formatRpInput(expectedIncome)}
              onChange={(e) => setExpectedIncome(parseRpInput(e.target.value))}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs text-stone-400 block mb-1">Tanggal Gajian Berikutnya</label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveConfig}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors"
          >
            Simpan Jadwal
          </button>
        </div>
      </div>

      {/* Rules Allocation Matrix */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div>
            <h3 className="font-bold text-stone-100 text-base">Aturan Pembagian Dana Gajian</h3>
            <p className="text-xs text-stone-400">Pembagian otomatis yang diterapkan saat tombol eksekusi gajian diklik</p>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-stone-400">Dialokasikan: </span>
            <span className="font-bold text-amber-400">{formatRupiah(totalAllocatedFromRules)}</span>
            <span className="text-stone-500 mx-1">•</span>
            <span className="text-stone-400">Sisa Bebas: </span>
            <span className="font-bold text-emerald-400">{formatRupiah(unassignedPaydayCash)}</span>
          </div>
        </div>

        <div className="divide-y divide-stone-800/60">
          {paydayConfig.rules.map((rule, idx) => {
            const ruleAmount = rule.type === 'fixed' ? rule.value : expectedIncome * (rule.value / 100);

            return (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-stone-200">{rule.categoryName}</span>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span className="text-stone-400">
                    {rule.type === 'fixed' ? formatRupiah(rule.value) : `${rule.value}%`}
                  </span>
                  <span className="font-bold text-emerald-400">{formatRupiah(ruleAmount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

