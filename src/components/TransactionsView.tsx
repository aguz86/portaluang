import { ExportDateRangeModal } from "./ExportDateRangeModal";
import { formatDateToDDMMYYYY_HHMM } from '../utils/format';
import React, { useState } from 'react';
import { Account, Transaction, formatRupiah } from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  Clock, 
  ArrowUpDown,
  FileSpreadsheet,
  Printer,
  X,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <>{text}</>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="bg-amber-500/30 text-amber-300 rounded px-0.5">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

interface TransactionsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onOpenQuickAdd: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  accounts,
  onAddTransaction,
  onDeleteTransaction,
  onToggleStatus,
  onOpenQuickAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });
  const [printDateRange, setPrintDateRange] = useState<{start: string, end: string} | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAccount, setSelectedAccount] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter categories extracted dynamically from transactions
  const categories = Array.from(new Set(transactions.map((t) => t.category))).sort();

  // Real-time filter logic across payee, category, and notes
  const filteredTransactions = transactions
    .filter((tx) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesDate = printDateRange ? (tx.date >= printDateRange.start && tx.date <= printDateRange.end) : true;
      const matchesSearch = 
        !term ||
        tx.payee.toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term) ||
        (tx.notes && tx.notes.toLowerCase().includes(term));

      const matchesCat = selectedCategory === 'ALL' || tx.category === selectedCategory;
      const matchesAcc = selectedAccount === 'ALL' || tx.accountId === selectedAccount;
      const matchesType = selectedType === 'ALL' || tx.type === selectedType;

      return matchesDate && matchesSearch && matchesCat && matchesAcc && matchesType;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  const handlePrint = () => { setExportModalConfig({ isOpen: true, type: "pdf" }); };
  const executePrint = (startDate: string, endDate: string) => {
    setPrintDateRange({ start: startDate, end: endDate });
    setTimeout(() => {

    import('../utils/pdfGenerator').then(({ generatePDF }) => {
      generatePDF('transactions-view', `Laporan_Transaksi_${formatDateToDDMMYYYY_HHMM()}.pdf`);
      setTimeout(() => setPrintDateRange(null), 500);
        });
    }, 300);
  };

  // Export CSV for Google Sheets
  const handleExportGoogleSheets = () => { setExportModalConfig({ isOpen: true, type: "csv" }); };
  const executeExportGoogleSheets = (startDate: string, endDate: string) => {
    const headers = ['Tanggal', 'Penerima/Merchant/Keterangan', 'Kategori', 'Rekening', 'Jumlah (IDR)', 'Jenis', 'Status', 'Catatan'];
    const rows = filteredTransactions.filter(t => t.date >= startDate && t.date <= endDate).map((t) => {
      const acc = accounts.find((a) => a.id === t.accountId)?.name || t.accountId;
      return [
        t.date,
        `"${t.payee.replace(/"/g, '""')}"`,
        `"${t.category}"`,
        `"${acc}"`,
        t.amount,
        t.type,
        t.status,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute("download", `Portal Uang_Ekspor_GoogleSheets_${formatDateToDDMMYYYY_HHMM()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <ExportDateRangeModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}
        transactions={transactions}
        exportType={exportModalConfig.type}
      />
      <div id="transactions-view" className="space-y-6">
      {/* Search & Filter Control Panel */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-100">Buku Catatan Transaksi</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Menampilkan {filteredTransactions.length} dari {transactions.length} entri transaksi
              {searchTerm && <span className="ml-1 text-amber-400 font-medium">(Pencarian: "{searchTerm}")</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportGoogleSheets}
              title="Ekspor data transaksi dalam format CSV untuk Google Sheets"
              className="px-3.5 py-2 rounded-xl bg-emerald-900/50 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-700/80 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Google Sheets</span>
            </button>

            <button
              onClick={handlePrint}
              title="Cetak atau Simpan sebagai Laporan PDF"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF</span>
            </button>

            <button
              onClick={onOpenQuickAdd}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 border border-stone-700 transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Transaksi</span>
            </button>
          </div>
        </div>

        {/* Real-time Search & Multi-field Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Real-time Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari penerima, catatan, kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-200 p-0.5 rounded-full hover:bg-stone-800 transition-colors"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Rekening/Bank</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Jenis Transaksi</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
              <option value="transfer">Transfer</option>
              <option value="sinking_fund">Sinking Fund</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-850/90 text-stone-400 uppercase font-semibold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 cursor-pointer" onClick={() => setSortAsc(!sortAsc)}>
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Penerima / Keterangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Rekening</th>
                <th className="py-3 px-4">Arus</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {filteredTransactions.map((tx) => {
                const accName = accounts.find((a) => a.id === tx.accountId)?.name || tx.accountId;
                const isIncome = tx.type === 'income';

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-stone-850/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-stone-400 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-100">
                      <div>
                        <HighlightText text={tx.payee} highlight={searchTerm} />
                      </div>
                      {tx.notes && (
                        <div className="text-[11px] text-stone-500 font-normal mt-0.5">
                          <HighlightText text={tx.notes} highlight={searchTerm} />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          isIncome
                            ? 'tx-cat-income bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : 'tx-cat-expense bg-rose-950/60 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        <HighlightText text={tx.category} highlight={searchTerm} />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-400">{accName}</td>
                    <td className="py-3 px-4">
                      {isIncome ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 shadow-sm">
                          <ArrowDownLeft className="w-3 h-3 stroke-[2.5]" />
                          IN
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 bg-rose-950/90 text-rose-400 border border-rose-800/80 shadow-sm">
                          <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                          OUT
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                        isIncome
                          ? 'tx-nominal-income text-emerald-400'
                          : 'tx-nominal-expense text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                        title="Hapus Transaksi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-stone-600 mb-1" />
                      <p className="font-semibold text-stone-300">Tidak ada transaksi yang ditemukan</p>
                      <p className="text-xs text-stone-500">
                        {searchTerm ? `Tidak ada data yang cocok dengan kata kunci "${searchTerm}".` : 'Belum ada transaksi pada filter ini.'}
                      </p>
                      {(searchTerm || selectedCategory !== 'ALL' || selectedAccount !== 'ALL' || selectedType !== 'ALL') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('ALL');
                            setSelectedAccount('ALL');
                            setSelectedType('ALL');
                          }}
                          className="mt-2 px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-semibold border border-stone-700 transition-colors"
                        >
                          Reset Pencarian & Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  );
};

