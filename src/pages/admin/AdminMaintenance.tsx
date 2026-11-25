import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Gift,
  CalendarPlus,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  Send,
  Mail,
  FileText,
  Save,
  RefreshCw,
  Clock,
  Download,
  Sparkles,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  subscription: {
    planId?: string;
    planName?: string;
    status?: string;
    expiresAt?: string;
    durationDays?: number;
  } | null;
  createdAt?: string | null;
}

interface CompensationLog {
  id: string;
  createdAt: string;
  bonusDays: number;
  targetMode: string;
  reason: string;
  affectedCount: number;
  invoicesCreated: number;
  emailsSent: number;
  telegramSent: number;
  sampleInvoices?: Array<{
    email: string;
    name: string;
    invoiceId: string | null;
    newExpiresAt: string;
  }>;
}

export const AdminMaintenance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingMaint, setSavingMaint] = useState(false);
  const [extending, setExtending] = useState(false);

  // Maintenance & Compensation Notification Config
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('Sistem Sedang Dalam Pemeliharaan');
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Kami sedang melakukan pemeliharaan dan peningkatan server agar layanan semakin cepat & stabil. Data keuangan Anda tetap aman.'
  );
  const [maintenanceEstimatedEnd, setMaintenanceEstimatedEnd] = useState('');
  const [compensationBannerEnabled, setCompensationBannerEnabled] = useState(false);
  const [compensationBannerText, setCompensationBannerText] = useState(
    'Sebagai bentuk apresiasi atas kesabaran Anda selama maintenance, seluruh pengguna aktif berhak menerima kompensasi tambahan masa langganan.'
  );

  // Extend Subscription State
  const [targetMode, setTargetMode] = useState<'active_paid' | 'active_all' | 'all_users' | 'selected'>('active_paid');
  const [bonusDays, setBonusDays] = useState<number>(1);
  const [reason, setReason] = useState('Kompensasi Maintenance Server');
  const [createInvoice, setCreateInvoice] = useState(true);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [sendTelegramNotification, setSendTelegramNotification] = useState(true);
  const [enableCompensationBanner, setEnableCompensationBanner] = useState(true);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [logs, setLogs] = useState<CompensationLog[]>([]);

  const [maintToast, setMaintToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [extendResult, setExtendResult] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: any;
  } | null>(null);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance-compensation', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        if (data.config) {
          setMaintenance(Boolean(data.config.maintenance));
          setMaintenanceTitle(data.config.maintenanceTitle || 'Sistem Sedang Dalam Pemeliharaan');
          setMaintenanceMessage(data.config.maintenanceMessage || '');
          setMaintenanceEstimatedEnd(data.config.maintenanceEstimatedEnd || '');
          setCompensationBannerEnabled(Boolean(data.config.compensationBannerEnabled));
          setCompensationBannerText(data.config.compensationBannerText || '');
        }
        setUsers(data.users || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load maintenance overview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSaveMaintenance = async (overrideMaintenance?: boolean) => {
    setSavingMaint(true);
    setMaintToast(null);
    const nextMaint = overrideMaintenance !== undefined ? overrideMaintenance : maintenance;
    if (overrideMaintenance !== undefined) setMaintenance(overrideMaintenance);

    try {
      const res = await fetch('/api/admin/maintenance-compensation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          maintenance: nextMaint,
          maintenanceTitle,
          maintenanceMessage,
          maintenanceEstimatedEnd,
          compensationBannerEnabled,
          compensationBannerText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMaintToast({
          type: 'success',
          text: nextMaint
            ? 'Mode Maintenance DIAKTIFKAN. Halaman publik & aplikasi user menampilkan layar pemeliharaan.'
            : 'Pengaturan Maintenance & Notif Kompensasi berhasil disimpan!',
        });
      } else {
        setMaintToast({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan.' });
      }
    } catch (err: any) {
      setMaintToast({ type: 'error', text: err.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setSavingMaint(false);
    }
  };

  const handleToggleUser = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.subscription?.planName || '').toLowerCase().includes(q)
    );
  });

  const handleSelectAllFiltered = () => {
    const filteredEmails = filteredUsers.map((u) => u.email);
    const merged = Array.from(new Set([...selectedEmails, ...filteredEmails]));
    setSelectedEmails(merged);
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtendResult(null);

    if (targetMode === 'selected' && selectedEmails.length === 0) {
      setExtendResult({ type: 'error', text: 'Pilih minimal 1 user pada daftar untuk ditambah masa aktifnya.' });
      return;
    }

    setExtending(true);
    try {
      const res = await fetch('/api/admin/subscriptions/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          days: Number(bonusDays),
          targetMode,
          selectedEmails,
          reason,
          createInvoice,
          sendEmailNotification,
          sendTelegramNotification,
          enableCompensationBanner,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExtendResult({
          type: 'success',
          text: `Berhasil menambah +${bonusDays} hari untuk ${data.affectedCount} user (${data.invoicesCreated} invoice dibuat, ${data.emailsSent} email, ${data.telegramSent} Telegram).`,
          details: data,
        });
        await fetchOverview();
      } else {
        setExtendResult({ type: 'error', text: data.error || 'Gagal memperpanjang langganan.' });
      }
    } catch (err: any) {
      setExtendResult({ type: 'error', text: err.message || 'Gagal menghubungi server.' });
    } finally {
      setExtending(false);
    }
  };

  const handleDownloadAdminInvoicePdf = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/user/invoice-pdf/${encodeURIComponent(invoiceId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Gagal mengunduh PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh file invoice PDF.');
    }
  };

  const getTargetCountPreview = () => {
    const now = Date.now();
    if (targetMode === 'selected') return selectedEmails.length;
    if (targetMode === 'all_users') return users.length;
    if (targetMode === 'active_all') {
      return users.filter(
        (u) => u.subscription?.status === 'active' && u.subscription?.expiresAt && new Date(u.subscription.expiresAt).getTime() > now
      ).length;
    }
    return users.filter(
      (u) =>
        u.subscription?.status === 'active' &&
        u.subscription?.planId !== 'free_trial' &&
        u.subscription?.expiresAt &&
        new Date(u.subscription.expiresAt).getTime() > now
    ).length;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-500" />
            Maintenance, Kompensasi & Tambah Durasi
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Atur Mode Maintenance, banner notifikasi kompensasi user, serta tambah durasi langganan per satuan hari lengkap dengan invoice PDF otomatis.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-sm font-semibold rounded-xl transition-colors self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* PANEL 1: MODE MAINTENANCE & NOTIF KOMPENSASI */}
      <div className={`rounded-2xl border p-6 space-y-6 transition-colors ${maintenance ? 'bg-rose-950/15 border-rose-500/40' : 'bg-stone-900 border-stone-800'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border ${maintenance ? 'bg-rose-500/15 border-rose-500/40 text-rose-400' : 'bg-stone-800 border-stone-700 text-amber-400'}`}>
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-stone-100">Mode Maintenance & Notifikasi Kompensasi</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${
                  maintenance
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {maintenance ? 'MAINTENANCE AKTIF' : 'ONLINE NORMAL'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Saat aktif, seluruh halaman publik & dashboard user menampilkan halaman maintenance. Panel Admin (/admin/*) tetap dapat diakses normal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSaveMaintenance(!maintenance)}
            disabled={savingMaint}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors shrink-0 ${
              maintenance
                ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                : 'bg-rose-500 hover:bg-rose-400 text-stone-950'
            }`}
          >
            {maintenance ? 'Matikan Maintenance (Go Live)' : 'Aktifkan Mode Maintenance'}
          </button>
        </div>

        {maintToast && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm ${
            maintToast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {maintToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{maintToast.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Judul Layar Maintenance</label>
              <input
                type="text"
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Pesan Untuk Pengguna</label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">Estimasi Selesai (Opsional)</label>
              <input
                type="text"
                placeholder="Contoh: 26 Nov 2026 pukul 06:00 WIB"
                value={maintenanceEstimatedEnd}
                onChange={(e) => setMaintenanceEstimatedEnd(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-4 bg-stone-950/70 border border-stone-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-stone-100">Banner Notifikasi Kompensasi</span>
              </div>
              <label className="inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={compensationBannerEnabled}
                  onChange={(e) => setCompensationBannerEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span className="text-xs font-semibold text-stone-300">
                  {compensationBannerEnabled ? 'Tampilkan' : 'Nonaktif'}
                </span>
              </label>
            </div>
            <p className="text-xs text-stone-400">
              Ditampilkan di layar Maintenance serta sebagai banner informasi di dalam Dashboard App user setelah sistem kembali normal.
            </p>
            <textarea
              rows={4}
              value={compensationBannerText}
              onChange={(e) => setCompensationBannerText(e.target.value)}
              placeholder="Contoh: Atas maintenance selama 1 hari, seluruh pelanggan aktif mendapatkan kompensasi tambahan masa aktif +2 hari."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveMaintenance()}
                disabled={savingMaint}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                {savingMaint ? 'Menyimpan...' : 'Simpan Pengaturan Maintenance'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL 2: TAMBAH DURASI LANGGANAN (SATUAN HARI) & INVOICE KOMPENSASI */}
      <form onSubmit={handleExtendSubmit} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-100">Tambah Durasi Langganan (Per Satuan Hari)</h2>
              <p className="text-xs text-stone-400 mt-1">
                Perpanjang masa aktif user tertentu atau massal. Jika paket masih aktif, durasi ditambahkan akumulatif dari tanggal berakhir saat ini.
              </p>
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs font-semibold text-stone-300 flex items-center gap-2 self-start">
            <Users className="w-4 h-4 text-amber-400" />
            Target Saat Ini: <strong className="text-white">{getTargetCountPreview()}</strong> User
          </div>
        </div>

        {extendResult && (
          <div className={`p-4 rounded-xl border space-y-2 text-sm ${
            extendResult.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {extendResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{extendResult.text}</span>
            </div>
            {extendResult.details?.results?.length > 0 && (
              <div className="text-xs text-stone-300 pt-1 flex flex-wrap gap-2">
                {extendResult.details.results.slice(0, 6).map((r: any) => (
                  <span key={r.email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950/80 border border-stone-800">
                    <span>{r.email}</span>
                    {r.invoiceId && (
                      <button
                        type="button"
                        onClick={() => handleDownloadAdminInvoicePdf(r.invoiceId)}
                        className="text-amber-400 hover:underline font-mono inline-flex items-center gap-1"
                      >
                        {r.invoiceId} <Download className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Target Audience Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">Pilih Target Penerima</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'active_paid', title: 'User Paket Berbayar Aktif', desc: 'Semua subscriber Pro aktif (tanpa Trial)' },
              { id: 'active_all', title: 'Semua User Aktif', desc: 'Termasuk akun Free Trial yang masih aktif' },
              { id: 'all_users', title: 'Semua User Terdaftar', desc: 'Seluruh akun (aktif maupun kadaluarsa)' },
              { id: 'selected', title: 'Pilih User Spesifik', desc: 'Centang manual akun yang diinginkan' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTargetMode(opt.id as any)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  targetMode === opt.id
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <div className="text-xs font-bold text-stone-100">{opt.title}</div>
                <div className="text-[11px] text-stone-400 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Specific User Checklist */}
        {targetMode === 'selected' && (
          <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama, email, atau paket..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold"
                >
                  Pilih Semua ({filteredUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmails([])}
                  className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400"
                >
                  Reset ({selectedEmails.length})
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-stone-800/70 border border-stone-800/70 rounded-xl">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500">Tidak ada user yang ditemukan.</div>
              ) : (
                filteredUsers.map((u) => {
                  const checked = selectedEmails.includes(u.email);
                  const expText = u.subscription?.expiresAt
                    ? new Date(u.subscription.expiresAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-';
                  return (
                    <label
                      key={u.email}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer hover:bg-stone-900/70 ${
                        checked ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleUser(u.email)}
                          className="w-4 h-4 accent-emerald-500 rounded shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-stone-200 truncate">{u.name}</div>
                          <div className="text-[11px] text-stone-400 truncate">{u.email}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-semibold text-amber-400">
                          {u.subscription?.planName || 'Belum Berlangganan'}
                        </div>
                        <div className="text-[10px] text-stone-500">Berakhir: {expText}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Days & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
              Jumlah Tambahan Durasi (Satuan Hari)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={3650}
                value={bonusDays}
                onChange={(e) => setBonusDays(Math.max(1, Number(e.target.value) || 1))}
                className="w-32 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-base font-black text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-sm font-semibold text-stone-300">Hari</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 7, 14, 30].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBonusDays(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    bonusDays === preset
                      ? 'bg-emerald-500 text-stone-950 border-emerald-500'
                      : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  +{preset} Hari
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
              Keterangan / Alasan Penambahan (Tercatat di Invoice)
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Kompensasi Maintenance 1 Hari (25 Nov 2026)"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-stone-500">
              Alasan ini akan dicetak resmi di PDF Invoice Kompensasi, riwayat pembayaran user, email, dan notifikasi Telegram.
            </p>
          </div>
        </div>

        {/* Automation Checkboxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
            <input
              type="checkbox"
              checked={createInvoice}
              onChange={(e) => setCreateInvoice(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Buat Invoice Resmi
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Generate INV-COMP (Rp 0 / Lunas) di riwayat user & Admin</div>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmailNotification}
              onChange={(e) => setSendEmailNotification(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" /> Kirim Email + PDF
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Kirim notif kompensasi beserta lampiran PDF invoice</div>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
            <input
              type="checkbox"
              checked={sendTelegramNotification}
              onChange={(e) => setSendTelegramNotification(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-400" /> Push Telegram Bot
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Kirim pesan langsung ke user yang terhubung Telegram</div>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer">
            <input
              type="checkbox"
              checked={enableCompensationBanner}
              onChange={(e) => setEnableCompensationBanner(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Aktifkan Banner App
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Tampilkan banner notif kompensasi di dalam Dashboard User</div>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-800">
          <button
            type="submit"
            disabled={extending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-stone-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            <CalendarPlus className="w-4 h-4" />
            {extending
              ? 'Memproses Penambahan Durasi...'
              : `Proses Tambah +${bonusDays} Hari & Buat Invoice (${getTargetCountPreview()} User)`}
          </button>
        </div>
      </form>

      {/* PANEL 3: RIWAYAT KOMPENSASI & AUDIT LOG */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Riwayat Kompensasi & Perpanjangan Admin
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Log penambahan masa aktif, invoice kompensasi, dan pengiriman notifikasi.</p>
          </div>
          <span className="text-xs font-semibold text-stone-500">{logs.length} Catatan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-800">
            <thead className="bg-stone-950/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Tambahan</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Alasan & Target</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Statistik</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-stone-400 uppercase tracking-wider">Sampel Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 bg-stone-900">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-stone-500">
                    Belum ada riwayat kompensasi atau penambahan durasi manual.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-850/40">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-300">
                      {new Date(log.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
                        +{log.bonusDays} Hari
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-stone-100">{log.reason}</div>
                      <div className="text-xs text-stone-500 mt-0.5">Filter: {log.targetMode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-300 space-y-0.5">
                      <div>User: <strong className="text-white">{log.affectedCount}</strong> • Invoice: <strong className="text-amber-300">{log.invoicesCreated}</strong></div>
                      <div className="text-stone-400">Email: {log.emailsSent} • Telegram: {log.telegramSent}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {(log.sampleInvoices || []).slice(0, 3).map((inv) =>
                          inv.invoiceId ? (
                            <button
                              key={inv.invoiceId}
                              type="button"
                              onClick={() => handleDownloadAdminInvoicePdf(inv.invoiceId!)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-950 border border-stone-800 hover:border-amber-500/50 text-amber-300 font-mono text-[11px]"
                              title={`Unduh Invoice PDF untuk ${inv.email}`}
                            >
                              {inv.invoiceId}
                              <Download className="w-3 h-3" />
                            </button>
                          ) : null
                        )}
                      </div>
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
