import React, { useState } from 'react';
import { Account, AccountCategory, AccountType, formatRupiah } from '../types';
import { formatRpInput, parseRpInput } from '../utils/format';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Flame, 
  Snowflake,
  Share2,
  Trophy,
  Calculator,
  PartyPopper
} from 'lucide-react';

interface AccountsAndDebtViewProps {
  accounts: Account[];
  onAddAccount: (acc: Omit<Account, 'id' | 'updatedAt'>) => void;
  onUpdateAccountBalance: (id: string, newBalance: number) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountsAndDebtView: React.FC<AccountsAndDebtViewProps> = ({
  accounts,
  onAddAccount,
  onUpdateAccountBalance,
  onDeleteAccount,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [payoffStrategy, setPayoffStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraPayment, setExtraPayment] = useState<number>(1000000);
  
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [editBalanceValue, setEditBalanceValue] = useState<string>('');

  const handleOpenEditBalance = (acc: Account) => {
    setEditingBalanceId(acc.id);
    setEditBalanceValue(acc.balance.toString());
  };

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBalanceId) {
      onUpdateAccountBalance(editingBalanceId, parseRpInput(editBalanceValue) || 0);
      setEditingBalanceId(null);
    }
  };

  // New Account state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccountCategory>('asset');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('5.000.000');
  const [apr, setApr] = useState('0');
  const [minPayment, setMinPayment] = useState('0');

  const assets = accounts.filter((a) => a.category === 'asset');
  const debts = accounts.filter((a) => a.category === 'liability');

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalDebts = debts.reduce((sum, a) => sum + a.balance, 0);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddAccount({
      name: name.trim(),
      category,
      type,
      balance: parseFloat(balance) || 0,
      apr: parseFloat(apr) || undefined,
      minPayment: parseFloat(minPayment) || undefined,
    });

    setName('');
    setIsAdding(false);
  };

  // Debt Payoff Simulator Math
  const simulatePayoff = (strategy: 'avalanche' | 'snowball', initialDebts: typeof debts, extra: number) => {
    let currentDebts = initialDebts.map(d => ({
      ...d,
      balance: Math.abs(d.balance),
      apr: d.apr || 0,
      minPayment: d.minPayment || Math.max(Math.abs(d.balance) * 0.06, 50000) // Fallback: 6% or 50k
    }));

    // Fixed monthly commitment (Snowball/Avalanche rule: keep total payment same even when a debt drops off)
    const fixedTotalMonthlyPayment = currentDebts.reduce((sum, d) => sum + d.minPayment, 0) + extra;

    let totalInterestPaid = 0;
    let months = 0;
    const MAX_MONTHS = 360; // 30 years max to prevent infinite loops

    while (currentDebts.length > 0 && months < MAX_MONTHS) {
      months++;
      
      // Sort debts based on strategy target
      currentDebts.sort((a, b) => {
        if (strategy === 'avalanche') {
          return b.apr - a.apr; // Highest interest first
        } else {
          return a.balance - b.balance; // Lowest balance first
        }
      });

      // Distribute payments
      let availableCash = fixedTotalMonthlyPayment;

      // 1. Add monthly interest and pay minimums first
      for (let i = 0; i < currentDebts.length; i++) {
        const d = currentDebts[i];
        const monthlyInterest = d.balance * (d.apr / 100 / 12);
        d.balance += monthlyInterest;
        totalInterestPaid += monthlyInterest;

        // Pay minimum
        const payment = Math.min(d.minPayment, d.balance);
        d.balance -= payment;
        availableCash -= payment;
      }

      // 2. Roll over remaining cash (extra + freed minimums) to target debt
      for (let i = 0; i < currentDebts.length; i++) {
        if (availableCash <= 0) break;
        if (currentDebts[i].balance > 0) {
          const payment = Math.min(availableCash, currentDebts[i].balance);
          currentDebts[i].balance -= payment;
          availableCash -= payment;
        }
      }

      // Remove paid off debts
      currentDebts = currentDebts.filter(d => d.balance > 0.01);
    }
    
    return { months, totalInterest: totalInterestPaid };
  };

  const totalMinPayment = debts.reduce((sum, d) => sum + (d.minPayment || Math.max(Math.abs(d.balance) * 0.06, 50000)), 0);
  const totalMonthlyDebtPool = totalMinPayment + extraPayment;

  // Run simulations
  const currentSim = simulatePayoff(payoffStrategy, debts, extraPayment);
  const baselineSim = simulatePayoff(payoffStrategy, debts, 0); // No extra payment

  // Sort debts for display based on the selected payoff strategy
  const sortedDebts = [...debts].sort((a, b) => {
    if (payoffStrategy === 'avalanche') {
      return (b.apr || 0) - (a.apr || 0); // Highest interest first
    } else {
      return a.balance - b.balance; // Lowest balance first
    }
  });

  const monthsToPayoff = currentSim.months;
  const totalInterestEstimate = currentSim.totalInterest;
  
  const estimatedPayoffDate = new Date();
  estimatedPayoffDate.setMonth(estimatedPayoffDate.getMonth() + monthsToPayoff);

  const monthsSaved = Math.max(0, baselineSim.months - currentSim.months);
  const interestSaved = Math.max(0, baselineSim.totalInterest - currentSim.totalInterest);

  const handleSharePlan = () => {
    const text = `Rencana Bebas Utang Saya!\nDengan strategi ${payoffStrategy === 'avalanche' ? 'Avalanche 🔥' : 'Snowball ❄️'} dan tambahan dana Rp ${extraPayment.toLocaleString('id-ID')}/bln, saya akan lunas dalam ${monthsToPayoff} bulan (hemat ${monthsSaved} bulan)! 💸✨\nDibuat via Portal Uang.`;
    if (navigator.share) {
      navigator.share({ title: 'Rencana Bebas Utang', text }).catch(() => {});
    } else {
      alert("Bagikan rencana ini:\n\n" + text);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-stone-100">Lab Rekening & Simulator Pelunasan Utang</h2>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl">
            Pantau saldo aset simpanan dan percepat pelunasan utang/Cicilan menggunakan metode Snowball atau Avalanche.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setCategory('asset');
              setIsAdding(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Rekening</span>
          </button>
          <button
            onClick={() => {
              setCategory('liability');
              setIsAdding(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Hutang</span>
          </button>
        </div>
      </div>

      {/* Add Account Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleCreateAccount} className="bg-stone-900 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-stone-100 text-lg">
              {category === 'asset' ? 'Tambah Rekening Baru' : 'Tambah Hutang / Pinjaman Baru'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  {category === 'asset' ? 'Nama Rekening' : 'Nama Pinjaman/Hutang'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={category === 'asset' ? 'misal: BCA Utama' : 'misal: Kartu Kredit Mandiri'}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">Jenis</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AccountType)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  {category === 'asset' ? (
                    <>
                      <option value="checking">Rekening Giro / Utama</option>
                      <option value="savings">Tabungan / E-Wallet</option>
                      <option value="investment">Investasi (Reksadana/Saham)</option>
                      <option value="cash">Uang Tunai</option>
                    </>
                  ) : (
                    <>
                      <option value="credit_card">Kartu Kredit / Paylater</option>
                      <option value="student_loan">Pinjaman Pendidikan</option>
                      <option value="auto_loan">Kredit Kendaraan (KKB)</option>
                      <option value="mortgage">KPR / Pinjaman Rumah</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  {category === 'asset' ? 'Saldo (Rp)' : 'Sisa Hutang (Rp)'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={balance}
                  onChange={(e) => setBalance(formatRpInput(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {category === 'liability' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-400 block mb-1">Bunga p.a (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={apr}
                      onChange={(e) => setApr(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 block mb-1">Cicilan Min/bln (Rp)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minPayment}
                      onChange={(e) => setMinPayment(formatRpInput(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors shadow-sm"
              >
                Simpan {category === 'asset' ? 'Rekening' : 'Hutang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Debt Payoff Interactive Simulator */}
      {debts.length > 0 && (
        <div className="bg-gradient-to-br from-stone-900 to-stone-850 border border-amber-500/30 p-5 sm:p-6 rounded-2xl space-y-6 shadow-md relative overflow-hidden">
          {/* Background decorative blur */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 relative z-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-stone-100">Simulator Pelunasan Utang</h3>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-lg">
                Pilih strategi pelunasan dan lihat bagaimana tambahan dana ekstra setiap bulannya dapat membebaskan Anda dari utang lebih cepat dan menghemat biaya bunga.
              </p>
            </div>

            {/* Strategy Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
              {/* Avalanche Card */}
              <button
                onClick={() => setPayoffStrategy('avalanche')}
                className={`p-4 rounded-xl border flex items-center justify-start relative overflow-hidden transition-all ${
                  payoffStrategy === 'avalanche'
                    ? 'bg-rose-500/10 border-rose-500/50 ring-1 ring-rose-500/30'
                    : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className={`absolute top-0 right-0 text-[10px] font-bold px-2.5 py-1 rounded-bl-lg transition-colors ${payoffStrategy === 'avalanche' ? 'bg-rose-500 text-white' : 'bg-stone-800 text-stone-400'}`}>Paling Hemat</div>
                <div className="flex items-center gap-2">
                  <Flame className={`w-4 h-4 ${payoffStrategy === 'avalanche' ? 'text-rose-500 animate-pulse' : 'text-stone-500'}`} />
                  <span className={`font-medium text-sm ${payoffStrategy === 'avalanche' ? 'text-rose-400' : 'text-stone-300'}`}>Avalanche</span>
                </div>
              </button>

              {/* Snowball Card */}
              <button
                onClick={() => setPayoffStrategy('snowball')}
                className={`p-4 rounded-xl border flex items-center justify-start relative overflow-hidden transition-all ${
                  payoffStrategy === 'snowball'
                    ? 'bg-stone-800/20 border-stone-700 ring-1 ring-stone-700/50'
                    : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className={`absolute top-0 right-0 text-[10px] font-bold px-2.5 py-1 rounded-bl-lg transition-colors ${payoffStrategy === 'snowball' ? 'bg-stone-600 text-stone-200' : 'bg-stone-800 text-stone-400'}`}>Paling Memotivasi</div>
                <div className="flex items-center gap-2">
                  <Snowflake className={`w-4 h-4 ${payoffStrategy === 'snowball' ? 'text-stone-300' : 'text-stone-500'}`} />
                  <span className={`font-medium text-sm ${payoffStrategy === 'snowball' ? 'text-stone-300' : 'text-stone-300'}`}>Snowball</span>
                </div>
              </button>
            </div>
          </div>

          {/* Result Big Numbers */}
          <div className="text-center py-6 sm:py-8 relative z-10 border-y border-stone-800/50">
            <div className="text-5xl sm:text-7xl font-black text-stone-100 flex items-baseline justify-center gap-3">
              {monthsToPayoff} <span className="text-xl sm:text-2xl text-stone-500 font-bold uppercase tracking-wide">Bulan</span>
            </div>
            
            <div className="w-full max-w-xs h-1.5 bg-stone-800 rounded-full mx-auto mt-5 mb-4 overflow-hidden">
               <div className="h-full bg-amber-500 rounded-full" style={{ width: '60%' }}></div>
            </div>

            <div className="text-sm text-stone-400">Bebas <span className="text-amber-500 font-bold">{estimatedPayoffDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span></div>
            
            {monthsSaved > 0 && (
              <div className="mt-5 inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/50 px-4 py-2 rounded-full text-xs font-medium text-emerald-400 mx-auto">
                <PartyPopper className="w-4 h-4" />
                <span>Hemat {monthsSaved} bulan & {formatRupiah(interestSaved)}</span>
              </div>
            )}
          </div>

          {/* Controls & Metrics */}
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {/* Slider Section */}
              <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-stone-100">Dana Ekstra</span>
                  <span className="text-sm font-bold text-blue-400 font-mono">{formatRupiah(extraPayment)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000000"
                  step="100000"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer mb-2"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-stone-500 font-mono">Rp 0</span>
                  <span className="text-[10px] text-stone-500 font-mono">Rp 10.000.000</span>
                </div>
              </div>
              
              {/* Summary Section */}
              <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 flex flex-col justify-center space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-300">Cicilan Wajib:</span>
                  <span className="font-mono text-stone-300">{formatRupiah(totalMinPayment)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-blue-400">Dana Ekstra:</span>
                  <span className="font-mono text-blue-400">{formatRupiah(extraPayment)}</span>
                </div>
                <div className="border-t border-stone-800 pt-3 flex justify-between items-center text-sm font-bold">
                  <span className="text-stone-100">Total:</span>
                  <span className="font-mono text-stone-100">{formatRupiah(totalMonthlyDebtPool)}</span>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <button
              onClick={handleSharePlan}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4 stroke-[2.5]" />
              <span>BAGIKAN RENCANA LUNAS SAYA</span>
            </button>
          </div>
        </div>
      )}

      {/* Accounts & Liabilities Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Accounts */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="font-bold text-stone-100 text-base">Rekening Bank & Simpanan</h3>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {formatRupiah(totalAssets)}
            </span>
          </div>

          <div className="space-y-3">
            {assets.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-3 text-center">Belum ada rekening simpanan tercatat</p>
            ) : (
              assets.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 bg-stone-950/60 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-stone-700 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-200 text-sm truncate">{acc.name}</h4>
                    <p className="text-xs text-stone-400 capitalize mt-0.5 truncate">
                      {acc.type} {acc.institution ? `• ${acc.institution}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditBalance(acc)}
                      className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl px-3 py-1.5 hover:bg-stone-800 transition-all group"
                      title="Ubah Nominal Saldo"
                    >
                      <span className="text-stone-500 text-xs font-mono">Rp</span>
                      <span className="text-xs font-mono font-bold text-emerald-400 text-right group-hover:underline">
                        {formatRpInput(acc.balance)}
                      </span>
                    </button>

                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 rounded-xl transition-all border border-transparent hover:border-rose-500/20 shrink-0 flex items-center justify-center"
                      title="Hapus Rekening"
                      aria-label="Hapus Rekening"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Debt Liabilities */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <h3 className="font-bold text-stone-100 text-base">Hutang</h3>
            <span className="font-mono font-bold text-rose-400 text-sm">
              {formatRupiah(totalDebts)}
            </span>
          </div>

          <div className="space-y-3">
            {sortedDebts.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-3 text-center">Tidak ada hutang aktif tercatat</p>
            ) : (
              sortedDebts.map((acc, index) => (
                <div
                  key={acc.id}
                  className="p-4 pt-4.5 bg-stone-950/60 border border-stone-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative hover:border-stone-700 transition-all"
                >
                  <span className="absolute -top-2.5 left-3 text-[10px] uppercase font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded-md border border-stone-800 shadow-sm">
                    Target Pelunasan #{index + 1}
                  </span>

                  <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                    <h4 className="font-bold text-stone-200 text-sm truncate">{acc.name}</h4>
                    <p className="text-xs text-stone-400 font-mono mt-0.5 truncate">
                      {acc.apr ? `${acc.apr}% Bunga` : ''} {acc.minPayment ? `• Min ${formatRupiah(acc.minPayment)}/bln` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditBalance(acc)}
                      className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl px-3 py-1.5 hover:bg-stone-800 transition-all group"
                      title="Ubah Nominal Hutang"
                    >
                      <span className="text-stone-500 text-xs font-mono">Rp</span>
                      <span className="text-xs font-mono font-bold text-rose-400 text-right group-hover:underline">
                        {formatRpInput(acc.balance)}
                      </span>
                    </button>

                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 active:bg-rose-500/20 rounded-xl transition-all border border-transparent hover:border-rose-500/20 shrink-0 flex items-center justify-center"
                      title="Hapus Hutang"
                      aria-label="Hapus Hutang"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Balance Modal */}
      {editingBalanceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-stone-800 flex justify-between items-center">
              <h3 className="font-bold text-stone-100">Ubah Nominal</h3>
              <button 
                onClick={() => setEditingBalanceId(null)}
                className="text-stone-400 hover:text-stone-200"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSaveBalance} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  Nominal Baru (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editBalanceValue}
                  onChange={(e) => setEditBalanceValue(formatRpInput(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBalanceId(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-colors shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

