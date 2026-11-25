import React, { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, Gift, CreditCard } from 'lucide-react';
import { formatRupiah } from '../../types';

interface ServerTransaction {
  merchantOrderId: string;
  reference: string;
  planName: string;
  amount: number;
  paymentMethodName?: string;
  paymentMethod?: string;
  email: string;
  customerName?: string;
  status: string;
  createdAt: string;
  env?: string;
  isCompensation?: boolean;
  bonusDays?: number;
}

export const AdminTransactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DUITKU' | 'COMPENSATION'>('ALL');
  const [transactions, setTransactions] = useState<ServerTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/duitku/transactions', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch global transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDownloadPdf = async (merchantOrderId: string) => {
    try {
      const res = await fetch(`/api/user/invoice-pdf/${encodeURIComponent(merchantOrderId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Gagal mengunduh PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${merchantOrderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh invoice PDF.');
    }
  };

  const filtered = transactions.filter((tx) => {
    const isComp = Boolean(tx.isCompensation || tx.env === 'compensation');
    if (typeFilter === 'COMPENSATION' && !isComp) return false;
    if (typeFilter === 'DUITKU' && isComp) return false;
    const q = searchTerm.toLowerCase();
    return (
      tx.merchantOrderId.toLowerCase().includes(q) ||
      (tx.email || '').toLowerCase().includes(q) ||
      (tx.planName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Global Transactions & Invoices</h1>
          <p className="text-sm text-stone-400 mt-1">Riwayat seluruh pembayaran langganan dan invoice kompensasi resmi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-stone-800 rounded-xl bg-stone-900 text-stone-200 text-sm font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Semua Jenis</option>
            <option value="DUITKU">Pembayaran Duitku</option>
            <option value="COMPENSATION">Invoice Kompensasi</option>
          </select>
          <button
            type="button"
            onClick={fetchTransactions}
            className="p-2 border border-stone-800 rounded-xl bg-stone-900 text-stone-300 hover:bg-stone-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-stone-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-stone-800 rounded-xl leading-5 bg-stone-900 text-stone-300 placeholder-stone-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 sm:text-sm transition-colors"
              placeholder="Cari Invoice ID atau Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-800">
            <thead className="bg-stone-950/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Invoice ID / Tanggal</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Kategori / Paket</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Nominal</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wider">Invoice PDF</th>
              </tr>
            </thead>
            <tbody className="bg-stone-900 divide-y divide-stone-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-stone-500">
                    {loading ? 'Memuat transaksi...' : 'Belum ada data transaksi atau invoice kompensasi.'}
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isComp = Boolean(tx.isCompensation || tx.env === 'compensation');
                  return (
                    <tr key={tx.merchantOrderId} className="hover:bg-stone-850/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-semibold text-stone-200">{tx.merchantOrderId}</div>
                        <div className="text-xs text-stone-500">
                          {new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-300">
                        {tx.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${
                          isComp
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-stone-800 text-stone-200 border-stone-700'
                        }`}>
                          {isComp ? <Gift className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                          {tx.planName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${isComp ? 'text-cyan-300' : 'text-emerald-400'}`}>
                          {isComp ? 'Rp 0 (Kompensasi)' : formatRupiah(tx.amount || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(tx.merchantOrderId)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-stone-800 border border-stone-700 rounded-lg transition-colors"
                          title="Unduh Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
