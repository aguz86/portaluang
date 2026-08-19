import React, { useState } from 'react';
import { Account, Bill, formatRupiah } from '../types';
import { formatRpInput, parseRpInput } from '../utils/format';
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  Zap,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface BillsViewProps {
  bills: Bill[];
  accounts: Account[];
  onTogglePaid: (billId: string) => void;
  onRefundPaid: (billId: string) => void;
  onAddBill: (bill: Omit<Bill, 'id'>) => void;
  onDeleteBill: (billId: string) => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  accounts,
  onTogglePaid,
  onRefundPaid,
  onAddBill,
  onDeleteBill,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('250.000');
  const [dueDate, setDueDate] = useState('15');
  const [category, setCategory] = useState('Listrik, Air & Internet');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [autoPay, setAutoPay] = useState(true);

  const totalBillAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaidAmount = bills.filter((b) => b.isPaid).reduce((sum, b) => sum + b.amount, 0);
  const percentPaid = totalBillAmount > 0 ? Math.round((totalPaidAmount / totalBillAmount) * 100) : 0;

  // Sorted by due date
  const sortedBills = [...bills].sort((a, b) => a.dueDate - b.dueDate);

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddBill({
      name: name.trim(),
      amount: parseRpInput(amount) || 0,
      dueDate: parseInt(dueDate, 10) || 1,
      category,
      accountId: accountId || accounts[0]?.id || 'acc-1',
      isPaid: false,
      autoPay,
      recurringFrequency: 'monthly',
    });
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Progress Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-stone-100">Kalender & Pelacak Tagihan Bulanan</h2>
            </div>
            <p className="text-xs text-stone-400">
              Jangan pernah terlambat membayar tagihan rutin. Menandai tagihan sebagai lunas akan otomatis mencatat transaksi ke rekening pilihan Anda.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Tambah Tagihan</span>
          </button>
        </div>

        {/* Bill Payment Progress Bar */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-stone-300 font-semibold">
              Terbayar {formatRupiah(totalPaidAmount)} dari {formatRupiah(totalBillAmount)}
            </span>
            <span className="text-amber-400 font-bold">{percentPaid}% Lunas</span>
          </div>
          <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${percentPaid}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Add Bill Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleCreateBill} className="bg-stone-900 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-stone-100 text-lg">Tambah Tagihan Rutin</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nama Tagihan</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Indihome, BPJS Kesehatan, PLN"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nominal (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(formatRpInput(e.target.value))}
                  placeholder="250.000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Tanggal Jatuh Tempo (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Sumber Rekening</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPay}
                  onChange={(e) => setAutoPay(e.target.checked)}
                  className="rounded border-stone-800 text-amber-500 focus:ring-0"
                />
                <span>Debet Otomatis (Auto-Debet)</span>
              </label>

              <div className="flex gap-3">
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
                  Simpan Tagihan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Bill Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedBills.map((bill) => {
          const accName = accounts.find((a) => a.id === bill.accountId)?.name || 'BCA Tabungan Utama';
          
          const today = new Date();
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dueMidnight = new Date(today.getFullYear(), today.getMonth(), bill.dueDate);
          const diffTime = dueMidnight.getTime() - todayMidnight.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          const isOverdue = !bill.isPaid && diffDays < 0;
          const lateDays = Math.abs(diffDays);
          const isDueToday = !bill.isPaid && diffDays === 0;

          return (
            <div
              key={bill.id}
              className={`p-5 rounded-2xl border transition-all space-y-3 relative shadow-sm ${
                bill.isPaid
                  ? 'bg-stone-900/60 border-stone-800 opacity-80'
                  : isOverdue
                  ? 'bg-stone-900 border-rose-500/40 hover:border-rose-500/60 shadow-rose-950/20'
                  : isDueToday
                  ? 'bg-stone-900 border-amber-500/50 hover:border-amber-500/70'
                  : 'bg-stone-900 border-stone-800 hover:border-amber-500/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 font-bold border border-stone-700">
                      Tgl {bill.dueDate}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/90 px-2 py-0.5 rounded-full border border-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> Telat {lateDays} hari
                      </span>
                    )}
                    {isDueToday && (
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/90 px-2 py-0.5 rounded-full border border-amber-800 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400" /> Hari Ini
                      </span>
                    )}
                    {bill.autoPay && (
                      <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded-full border border-blue-800 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> AutoDebet
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-stone-100 text-base mt-2">{bill.name}</h3>
                  <p className="text-xs text-stone-400">{bill.category} • {accName}</p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-extrabold font-mono text-stone-100">
                    {formatRupiah(bill.amount)}
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-stone-800/80">
                {bill.isPaid ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Lunas & Selesai</span>
                      </div>
                      <button
                        onClick={() => onDeleteBill(bill.id)}
                        className="p-2 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-xl transition-colors shrink-0"
                        title="Hapus Tagihan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Tombol Batalkan (Refund) di bawah Lunas dan Selesai */}
                    <button
                      type="button"
                      onClick={() => onRefundPaid(bill.id)}
                      className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all active:scale-[0.98]"
                      title="Batalkan pelunasan tagihan dan kembalikan dana ke rekening sumber"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Batalkan (Refund & Kembalikan Saldo)</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onTogglePaid(bill.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        isOverdue
                          ? 'bg-rose-500 hover:bg-rose-400 text-stone-950 shadow-sm'
                          : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-sm'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Tandai Lunas (Catat Transaksi)</span>
                    </button>

                    <button
                      onClick={() => onDeleteBill(bill.id)}
                      className="p-2 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-xl transition-colors shrink-0"
                      title="Hapus Tagihan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

