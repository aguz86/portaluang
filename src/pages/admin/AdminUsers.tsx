import React, { useState, useEffect } from 'react';
import { Search, CalendarPlus, X, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  city: string;
  planId: string;
  planName: string;
  isPro: boolean;
  status: 'active' | 'expired';
  expiresAt?: string;
  joined: string;
  lastLogin: string;
  lastLoginTs: number;
}

export const AdminUsers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick "+ Hari" modal state
  const [extendTarget, setExtendTarget] = useState<AdminUserItem | null>(null);
  const [extendDays, setExtendDays] = useState<number>(3);
  const [extendReason, setExtendReason] = useState('Kompensasi Maintenance Sistem');
  const [extendCreateInvoice, setExtendCreateInvoice] = useState(true);
  const [extendSendEmail, setExtendSendEmail] = useState(true);
  const [extending, setExtending] = useState(false);
  const [extendFeedback, setExtendFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  const fetchUsers = () => {
    setLoading(true);
    fetch('/api/admin/users', {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.users) {
          const now = Date.now();
          const formattedUsers: AdminUserItem[] = data.users.map((u: any) => {
            const expMs = u.subscription?.expiresAt ? new Date(u.subscription.expiresAt).getTime() : 0;
            const isActive = u.subscription?.status === 'active' && (!expMs || expMs > now);
            return {
              id: u.id,
              name: u.name || 'Unknown',
              email: u.email || u.id,
              city: u.city || '-',
              planId: u.subscription?.planId || 'free_trial',
              planName: u.subscription?.planName || (u.subscription?.planId === 'free_trial' ? 'Free Trial' : 'Pro'),
              isPro: Boolean(u.subscription?.planId && u.subscription.planId !== 'free_trial'),
              status: isActive ? 'active' : 'expired',
              expiresAt: u.subscription?.expiresAt,
              joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-',
              lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : '-',
              lastLoginTs: u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0,
            };
          });
          formattedUsers.sort((a, b) => b.lastLoginTs - a.lastLoginTs);
          setUsers(formattedUsers);
        }
      })
      .catch((e) => console.error('Error fetching users', e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleQuickExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendTarget) return;
    setExtending(true);
    setExtendFeedback(null);
    try {
      const res = await fetch('/api/admin/subscriptions/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          days: Number(extendDays),
          targetMode: 'selected',
          selectedEmails: [extendTarget.email],
          reason: extendReason,
          createInvoice: extendCreateInvoice,
          sendEmailNotification: extendSendEmail,
          sendTelegramNotification: true,
          enableCompensationBanner: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const inv = data.results?.[0]?.invoiceId;
        setExtendFeedback({
          type: 'success',
          text: `Berhasil menambah +${extendDays} hari untuk ${extendTarget.email}${inv ? ` (Invoice: ${inv})` : ''}.`,
        });
        fetchUsers();
      } else {
        setExtendFeedback({ type: 'error', text: data.error || 'Gagal memperpanjang durasi langganan.' });
      }
    } catch (err: any) {
      setExtendFeedback({ type: 'error', text: err.message || 'Gagal menghubungi server.' });
    } finally {
      setExtending(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.planName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExpiryBadge = (expiresAt?: string) => {
    if (!expiresAt) return <span className="text-xs text-stone-500">-</span>;
    const expMs = new Date(expiresAt).getTime();
    const diffDays = Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24));
    const dateStr = new Date(expiresAt).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return (
      <div>
        <div className="text-xs font-medium text-stone-200">{dateStr}</div>
        <div className={`text-[10px] font-bold ${diffDays > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {diffDays > 0 ? `${diffDays} hari lagi` : 'Kadaluarsa'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">User Management</h1>
          <p className="text-sm text-stone-400 mt-1">Kelola akun, masa aktif langganan, dan penambahan durasi kompensasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/maintenance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Kompensasi Massal
          </Link>
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800"
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
              placeholder="Cari nama, email, paket..."
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Paket</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Berakhir Pada</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Last Login</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-stone-900 divide-y divide-stone-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-stone-500">
                    {loading ? 'Memuat daftar pengguna...' : 'Tidak ada pengguna yang cocok dengan pencarian.'}
                  </td>
                </tr>
              ) : null}
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-stone-850/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-stone-800 rounded-full flex items-center justify-center font-bold text-stone-300">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-stone-200">{user.name}</div>
                        <div className="text-xs text-stone-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isPro ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-stone-800 text-stone-400 border border-stone-700'}`}>
                      {user.planName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getExpiryBadge(user.expiresAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                      {user.status === 'active' ? 'Aktif' : 'Kadaluarsa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-amber-400/90 font-medium">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => {
                        setExtendTarget(user);
                        setExtendDays(3);
                        setExtendReason('Kompensasi Maintenance Sistem');
                        setExtendFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors"
                      title="Tambah Durasi Langganan (Hari)"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      + Hari
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Quick Extend Subscription Modal */}
      {extendTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleQuickExtend}
            className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <CalendarPlus className="w-4 h-4 text-emerald-400" />
                  Tambah Masa Langganan
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">{extendTarget.name} ({extendTarget.email})</p>
              </div>
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="p-1 text-stone-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {extendFeedback && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                extendFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                {extendFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{extendFeedback.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Tambahan Hari</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={extendDays}
                  onChange={(e) => setExtendDays(Math.max(1, Number(e.target.value) || 1))}
                  className="w-28 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-xs text-stone-400">Hari</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExtendDays(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      extendDays === d
                        ? 'bg-emerald-500 text-stone-950 border-emerald-500'
                        : 'bg-stone-950 text-stone-300 border-stone-800'
                    }`}
                  >
                    +{d} Hari
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1.5">Keterangan Invoice</label>
              <input
                type="text"
                required
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 text-xs text-stone-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extendCreateInvoice}
                  onChange={(e) => setExtendCreateInvoice(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>Buat Invoice Kompensasi (Rp 0 / Lunas) di riwayat user</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extendSendEmail}
                  onChange={(e) => setExtendSendEmail(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>Kirim notifikasi email + lampiran Invoice PDF</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setExtendTarget(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={extending}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 text-xs font-black"
              >
                {extending ? 'Memproses...' : `Tambah +${extendDays} Hari`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
