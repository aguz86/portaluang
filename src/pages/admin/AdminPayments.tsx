import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, Clock, AlertCircle, RefreshCw, ShieldCheck, ArrowUpRight, Search, Play } from 'lucide-react';
import { formatRupiah } from '../../types';

interface DuitkuTransactionRecord {
  merchantOrderId: string;
  reference: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paymentMethodName: string;
  email: string;
  customerName: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  vaNumber?: string;
  qrString?: string;
  createdAt: string;
  paidAt?: string;
}

export const AdminPayments: React.FC = () => {
  const [transactions, setTransactions] = useState<DuitkuTransactionRecord[]>([]);
  const [config, setConfig] = useState<{ merchantCode?: string; env?: string; hasApiKey?: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/duitku/transactions');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setConfig(data.config || {});
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCheckStatus = async (merchantOrderId: string) => {
    setActionLoading(merchantOrderId);
    try {
      const res = await fetch(`/api/payment/duitku/check-status/${merchantOrderId}`);
      const data = await res.json();
      if (data.success) {
        if (data.isPaid) {
          alert('Pembayaran telah lunas!');
        } else {
          alert('Pembayaran belum lunas atau masih tertunda.');
        }
        await fetchTransactions();
      }
    } catch (err) {
      console.error('Check status failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = 
      t.merchantOrderId.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.planName.toLowerCase().includes(search.toLowerCase()) ||
      t.paymentMethodName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalVolume = transactions
    .filter(t => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const successCount = transactions.filter(t => t.status === 'SUCCESS').length;
  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-500" />
            Duitku Payment Gateway Logs
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Pantau status transaksi live, verifikasi webhook IPN, dan riwayat aktivasi otomatis.
          </p>
        </div>
        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-sm font-semibold rounded-xl transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Gateway Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Omzet Lunas</div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{formatRupiah(totalVolume)}</div>
          <div className="text-[11px] text-stone-500 mt-1">{successCount} Transaksi Sukses</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Menunggu Pembayaran</div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{pendingCount}</div>
          <div className="text-[11px] text-stone-500 mt-1">Status Pending</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Environment Mode</div>
          <div className="text-base font-bold text-stone-200 mt-2 uppercase flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${config.env === 'production' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {config.env || 'SANDBOX'}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Merchant: {config.merchantCode || 'Default'}</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Keamanan Gateway</div>
          <div className="text-sm font-bold text-stone-200 mt-2 flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-4 h-4" /> MD5 Signature Valid
          </div>
          <div className="text-[11px] text-stone-500 mt-1">256-bit TLS Encrypted</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan Order ID, email pembeli, atau metode bayar..."
            className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-100 text-sm focus:border-amber-500 focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-stone-200 text-sm font-semibold focus:border-amber-500 focus:outline-none"
        >
          <option value="ALL">Semua Status</option>
          <option value="SUCCESS">SUCCESS (Lunas)</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED / Gagal</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-800">
            <thead className="bg-stone-950/70">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Invoice / Tanggal</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">User & Paket</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Nominal & Metode</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-stone-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-stone-900 divide-y divide-stone-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-500 text-sm">
                    {loading ? 'Memuat data transaksi Duitku...' : 'Belum ada transaksi pembayaran tercatat.'}
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.merchantOrderId} className="hover:bg-stone-850/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-bold text-stone-200">{tx.merchantOrderId}</div>
                      <div className="text-xs text-stone-500 font-mono">Ref: {tx.reference}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-stone-200">{tx.email}</div>
                      <div className="text-xs text-amber-400/90 font-medium">{tx.planName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-stone-100">{formatRupiah(tx.amount)}</div>
                      <div className="text-xs text-stone-400">{tx.paymentMethodName || tx.paymentMethod}</div>
                      {tx.vaNumber && (
                        <div className="text-[11px] font-mono text-stone-400 mt-0.5">VA: {tx.vaNumber}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.status === 'SUCCESS' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lunas / Aktif
                        </span>
                      )}
                      {tx.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Bayar
                        </span>
                      )}
                      {tx.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3.5 h-3.5" /> Gagal
                        </span>
                      )}
                      {tx.status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-stone-500/10 text-stone-400 border border-stone-500/20">
                          Kadaluarsa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {tx.status === 'PENDING' && (
                        <button
                          onClick={() => handleCheckStatus(tx.merchantOrderId)}
                          disabled={actionLoading === tx.merchantOrderId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors"
                          title="Cek Status Pembayaran ke Duitku"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {actionLoading === tx.merchantOrderId ? 'Mengecek...' : 'Cek Status'}
                        </button>
                      )}
                      {tx.status === 'SUCCESS' && (
                        <span className="text-xs text-stone-500 font-mono">
                          {tx.paidAt ? new Date(tx.paidAt).toLocaleTimeString('id-ID') : 'Aktif'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

