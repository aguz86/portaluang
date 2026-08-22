import React, { useState } from 'react';
import { SinkingFund, Account, formatRupiah } from '../types';
import { formatRpInput, parseRpInput } from '../utils/format';
import { 
  Target, 
  Plus, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar
} from 'lucide-react';

interface SinkingFundsViewProps {
  sinkingFunds: SinkingFund[];
  accounts: Account[];
  onAddSinkingFund: (fund: Omit<SinkingFund, 'id'>) => void;
  onDeposit: (id: string, amount: number, accountId: string) => void;
  onWithdraw: (id: string, amount: number, accountId: string) => void;
  onDeleteSinkingFund: (id: string) => void;
}

export const SinkingFundsView: React.FC<SinkingFundsViewProps> = ({
  sinkingFunds,
  accounts,
  onAddSinkingFund,
  onDeposit,
  onWithdraw,
  onDeleteSinkingFund,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedFundForAction, setSelectedFundForAction] = useState<{ id: string; mode: 'deposit' | 'withdraw' } | null>(null);
  const [actionAmount, setActionAmount] = useState('500000');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const assetAccounts = accounts.filter(a => a.category === 'asset');

  // New Fund state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('15000000');
  const [currentAmount, setCurrentAmount] = useState('3500000');
  const [targetDate, setTargetDate] = useState('2027-03-01');
  const [category, setCategory] = useState('Dana Tabungan Terencana');

  const totalSaved = sinkingFunds.reduce((sum, f) => sum + f.currentAmount, 0);
  const totalTarget = sinkingFunds.reduce((sum, f) => sum + f.targetAmount, 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleCreateFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tAmt = parseRpInput(targetAmount) || 1000000;
    const cAmt = parseRpInput(currentAmount) || 0;

    // Calculate months remaining to suggest monthly contrib
    const months = Math.max(1, Math.round((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
    const monthlyContrib = Math.round((tAmt - cAmt) / months);

    onAddSinkingFund({
      name: name.trim(),
      targetAmount: tAmt,
      currentAmount: cAmt,
      targetDate,
      category,
      monthlyContrib: Math.max(0, monthlyContrib),
    });

    setName('');
    setIsAdding(false);
  };

  const handleExecuteAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFundForAction || !selectedAccountId) return;
    const amt = parseRpInput(actionAmount) || 0;
    if (amt <= 0) return;

    let finalAmount = amt;
    const account = accounts.find(a => a.id === selectedAccountId);
    const fund = sinkingFunds.find(f => f.id === selectedFundForAction.id);

    if (selectedFundForAction.mode === 'deposit' && account) {
      if (finalAmount > account.balance) {
        finalAmount = account.balance;
      }
    } else if (selectedFundForAction.mode === 'withdraw' && fund) {
      if (finalAmount > fund.currentAmount) {
        finalAmount = fund.currentAmount;
      }
    }

    if (selectedFundForAction.mode === 'deposit') {
      onDeposit(selectedFundForAction.id, finalAmount, selectedAccountId);
    } else {
      onWithdraw(selectedFundForAction.id, finalAmount, selectedAccountId);
    }

    setSelectedFundForAction(null);
    setActionAmount('500000');
    setSelectedAccountId('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-stone-100">Manajer Pos Sinking Fund (Dana Terencana)</h2>
            </div>
            <p className="text-xs text-stone-400 max-w-2xl">
              Cegah lonjakan pengeluaran tahunan (Mudik Lebaran, Pajak Kendaraan, Kurban, Liburan) agar tidak merusak anggaran bulanan Kamu dengan mencicilnya secara teratur.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Buat Pos Sinking Fund</span>
          </button>
        </div>

        {/* Total Sinking Funds Progress */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 uppercase font-medium">Total Dana Terkumpul</span>
            <div className="text-xl font-extrabold text-amber-400 font-mono mt-1">
              {formatRupiah(totalSaved)}
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 uppercase font-medium">Total Target Pos</span>
            <div className="text-xl font-extrabold text-stone-100 font-mono mt-1">
              {formatRupiah(totalTarget)}
            </div>
          </div>

          <div className="bg-stone-950/80 border border-stone-800 p-4 rounded-xl">
            <span className="text-xs text-stone-400 uppercase font-medium">Persentase Capaian</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
              {overallPercent}% Terkumpul
            </div>
          </div>
        </div>
      </div>

      {/* Add Sinking Fund Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleCreateFund} className="bg-stone-900 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-stone-100 text-lg">Buat Target Pos Sinking Fund Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nama Target Pos</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Mudik Lebaran, Pajak Mobil"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Target Nominal (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(formatRpInput(e.target.value))}
                  placeholder="15.000.000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Saldo Terkumpul Saat Ini (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(formatRpInput(e.target.value))}
                  placeholder="3.500.000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Target Tanggal Terkumpul</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
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
                Simpan Target
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deposit/Withdraw Action Modal */}
      {selectedFundForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleExecuteAction} className="bg-stone-900 border border-emerald-500/40 p-6 rounded-2xl space-y-5 shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-stone-100 text-lg">
              {selectedFundForAction.mode === 'deposit' ? 'Setor Tabungan ke Pos Sinking Fund' : 'Tarik Dana dari Pos Sinking Fund'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  Pilih Rekening {selectedFundForAction.mode === 'deposit' ? 'Sumber' : 'Tujuan'}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="" disabled>Pilih Rekening Aset...</option>
                  {assetAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatRupiah(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nominal (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(formatRpInput(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-stone-500 mt-1">
                  *Nominal akan dibatasi otomatis sesuai saldo maksimal yang tersedia.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFundForAction(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-colors ${
                    selectedFundForAction.mode === 'deposit'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-sm'
                      : 'bg-rose-500 hover:bg-rose-400 text-stone-950 shadow-sm'
                  }`}
                >
                  Konfirmasi {selectedFundForAction.mode === 'deposit' ? 'Setoran' : 'Penarikan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sinkingFunds.map((fund) => {
          const percent = Math.min(Math.round((fund.currentAmount / fund.targetAmount) * 100), 100);

          return (
            <div key={fund.id} className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4 shadow-sm hover:border-stone-700 transition-all">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-2.5 py-0.5 rounded-full">
                    {fund.category}
                  </span>
                  <h3 className="text-lg font-bold text-stone-100 mt-2">{fund.name}</h3>
                  {fund.notes && <p className="text-xs text-stone-400 mt-0.5">{fund.notes}</p>}
                </div>

                <button
                  onClick={() => onDeleteSinkingFund(fund.id)}
                  className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                  title="Hapus Pos Target"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Numbers */}
              <div className="flex items-baseline justify-between font-mono">
                <div>
                  <span className="text-2xl font-extrabold text-stone-100">{formatRupiah(fund.currentAmount)}</span>
                  <span className="text-stone-400 text-xs ml-1.5">/ {formatRupiah(fund.targetAmount)}</span>
                </div>
                <div className="text-emerald-400 font-bold text-base">{percent}%</div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                ></div>
              </div>

              {/* Info Details */}
              <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3 flex items-center justify-between text-xs text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  <span>Target: {fund.targetDate}</span>
                </div>
                <div>
                  Setoran Bulanan: <span className="text-amber-400 font-mono font-bold">{formatRupiah(fund.monthlyContrib)}/bln</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setSelectedFundForAction({ id: fund.id, mode: 'deposit' })}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Setor</span>
                </button>

                <button
                  onClick={() => setSelectedFundForAction({ id: fund.id, mode: 'withdraw' })}
                  className="flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Tarik</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

