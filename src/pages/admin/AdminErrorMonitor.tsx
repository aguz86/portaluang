import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Mail,
  Activity,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Trash2,
  Check,
  RotateCcw,
  Loader2,
  Eye,
  History,
  Save,
  Search
} from 'lucide-react';

interface SystemErrorLog {
  id: string;
  fingerprint: string;
  integration: string;
  severity: 'critical' | 'error' | 'warning';
  action: string;
  message: string;
  details?: string;
  stack?: string;
  status: 'open' | 'resolved';
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
  lastRealtimeNotifiedAt?: string;
  notifyCount: number;
}

interface ErrorMonitorConfig {
  enabled: boolean;
  developerEmail: string;
  realtimeEnabled: boolean;
  realtimeCooldownMinutes: number;
  scheduledEnabled: boolean;
  scheduledIntervalMinutes: number;
  autoResolveOnRecovery: boolean;
  lastDigestSentAt?: string;
  updatedAt?: string;
}

interface ErrorReportHistoryItem {
  id: string;
  mode: 'realtime' | 'scheduled' | 'manual' | 'test';
  sentAt: string;
  to: string[];
  subject: string;
  errorCount: number;
  success: boolean;
  provider?: string;
  errorMessage?: string;
}

interface HealthCheckResult {
  integration: string;
  label: string;
  ok: boolean;
  detail: string;
}

export const AdminErrorMonitor: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ErrorMonitorConfig>({
    enabled: true,
    developerEmail: '',
    realtimeEnabled: true,
    realtimeCooldownMinutes: 5,
    scheduledEnabled: true,
    scheduledIntervalMinutes: 60,
    autoResolveOnRecovery: true,
  });
  const [logs, setLogs] = useState<SystemErrorLog[]>([]);
  const [history, setHistory] = useState<ErrorReportHistoryItem[]>([]);
  const [integrationsMeta, setIntegrationsMeta] = useState<Record<string, { label: string; category: string }>>({});
  const [healthResults, setHealthResults] = useState<HealthCheckResult[] | null>(null);

  const [activeTab, setActiveTab] = useState<'logs' | 'preview' | 'history'>('logs');
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [integrationFilter, setIntegrationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [savingConfig, setSavingConfig] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getToken = () => localStorage.getItem('admin_token') || '';

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/error-monitor', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        if (data.config) setConfig(data.config);
        if (Array.isArray(data.logs)) setLogs(data.logs);
        if (Array.isArray(data.history)) setHistory(data.history);
        if (data.integrationsMeta) setIntegrationsMeta(data.integrationsMeta);
      }
    } catch (err) {
      console.error('Failed loading error monitor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedback(null);
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/error-monitor/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) setConfig(data.config);
        setFeedback({ type: 'success', text: 'Pengaturan email developer & mode pelaporan berhasil disimpan ke Supabase!' });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Koneksi ke server gagal.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunHealthCheck = async () => {
    setFeedback(null);
    setCheckingHealth(true);
    try {
      const res = await fetch('/api/admin/error-monitor/health-check', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHealthResults(data.results || []);
        await fetchData();
        const failed = (data.results || []).filter((r: HealthCheckResult) => !r.ok).length;
        setFeedback({
          type: failed > 0 ? 'error' : 'success',
          text: failed > 0
            ? `Pemeriksaan selesai: ditemukan ${failed} integrasi bermasalah.`
            : 'Semua integrasi utama (Database, Email, Duitku, Telegram, AI) terpantau sehat!',
        });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Gagal menjalankan pemeriksaan kesehatan integrasi.' });
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleSendTestRealtime = async () => {
    setFeedback(null);
    setSendingTest(true);
    try {
      // Save current config first so latest developerEmail is used
      const saveRes = await fetch('/api/admin/error-monitor/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(config),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        setFeedback({ type: 'error', text: saveData.error || 'Gagal menyimpan email developer.' });
        return;
      }

      const res = await fetch('/api/admin/error-monitor/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: data.message });
        await fetchData();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Gagal mengirim simulasi error realtime.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Gagal terhubung ke server saat uji simulasi error.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendDigestNow = async () => {
    setFeedback(null);
    setSendingDigest(true);
    try {
      await fetch('/api/admin/error-monitor/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(config),
      });

      const res = await fetch('/api/admin/error-monitor/send-digest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: data.message });
        await fetchData();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Gagal mengirim laporan tabel.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setSendingDigest(false);
    }
  };

  const handleResolveToggle = async (id: string, nextStatus: 'open' | 'resolved') => {
    try {
      const res = await fetch('/api/admin/error-monitor/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) await fetchData();
    } catch {}
  };

  const handleResolveAll = async () => {
    try {
      const res = await fetch('/api/admin/error-monitor/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ resolveAll: true }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Semua error aktif ditandai selesai (Resolved).' });
        await fetchData();
      }
    } catch {}
  };

  const handleClearResolved = async (clearAll = false) => {
    try {
      const res = await fetch('/api/admin/error-monitor/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ clearAll }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: clearAll ? 'Semua riwayat log error dibersihkan.' : 'Log yang sudah selesai dibersihkan.' });
        await fetchData();
      }
    } catch {}
  };

  const openLogs = useMemo(() => logs.filter((l) => l.status === 'open'), [logs]);
  const resolvedLogs = useMemo(() => logs.filter((l) => l.status === 'resolved'), [logs]);
  const totalOccurrences = useMemo(() => openLogs.reduce((sum, l) => sum + (l.occurrences || 1), 0), [openLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (integrationFilter !== 'all' && item.integration !== integrationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.message.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          item.integration.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, statusFilter, integrationFilter, searchQuery]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
        <span className="text-sm">Memuat Monitor Error & Pengaturan Laporan Developer...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            Auto-Detect Log Error & Lapor Developer
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Mendeteksi error otomatis di seluruh integrasi (Supabase, SMTP/Email, Duitku, Telegram, AI, Market Data, Auth) dan mengirim laporan tabel rapi ke email developer.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRunHealthCheck}
            disabled={checkingHealth}
            className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-bold flex items-center gap-1.5 border border-stone-700 disabled:opacity-50"
          >
            {checkingHealth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Cek Kesehatan Integrasi</span>
          </button>
          <button
            type="button"
            onClick={handleSendTestRealtime}
            disabled={sendingTest}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>Uji Mode Realtime</span>
          </button>
          <button
            type="button"
            onClick={handleSendDigestNow}
            disabled={sendingDigest}
            className="px-3.5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-stone-950 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
          >
            {sendingDigest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Kirim Laporan Tabel Sekarang</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* HEALTH CHECK STRIP */}
      {healthResults && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
            Hasil Pemeriksaan Langsung Semua Integrasi
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {healthResults.map((hr) => (
              <div
                key={hr.integration}
                className={`p-3 rounded-xl border text-xs ${
                  hr.ok
                    ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-bold">
                  <span className="truncate">{hr.label}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${hr.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {hr.ok ? 'OK' : 'ERROR'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 mt-1 line-clamp-2">{hr.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs font-semibold text-stone-400">Error Masih Terdeteksi</div>
          <div className={`text-2xl font-black mt-1 ${openLogs.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {openLogs.length}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Siap masuk laporan terjadwal</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs font-semibold text-stone-400">Total Kejadian Aktif</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{totalOccurrences}x</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Akumulasi error belum teratasi</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs font-semibold text-stone-400">Sudah Teratasi (Resolved)</div>
          <div className="text-2xl font-black text-stone-200 mt-1">{resolvedLogs.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Manual atau auto-recovery</div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs font-semibold text-stone-400">Email Laporan Terkirim</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {history.filter((h) => h.success).length}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {config.lastDigestSentAt
              ? `Terjadwal terakhir: ${new Date(config.lastDigestSentAt).toLocaleTimeString('id-ID')}`
              : 'Belum ada digest terkirim'}
          </div>
        </div>
      </div>

      {/* CONFIGURATION CARD: EMAIL DEVELOPER & 2 REPORTING MODES */}
      <form onSubmit={handleSaveConfig} className="bg-stone-900 border border-rose-500/30 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Mail className="w-5 h-5 text-rose-400" />
              Konfigurasi Email Developer & Mode Pelaporan
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Anda dapat mengaktifkan Mode Realtime, Mode Terjadwal, atau keduanya secara bersamaan.
            </p>
          </div>
          <label className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer text-xs font-bold text-stone-200 self-start">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-4 h-4 rounded accent-rose-500"
            />
            <span>Monitor Error Aktif</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
              Email Developer Tujuan (Bisa Lebih dari 1, Pisahkan Koma)
            </label>
            <input
              type="text"
              value={config.developerEmail}
              onChange={(e) => setConfig({ ...config, developerEmail: e.target.value })}
              placeholder="developer@domainanda.com, techlead@domainanda.com"
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 focus:border-rose-500 rounded-xl text-sm font-mono text-stone-100 outline-none"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Dapat diubah kapan saja oleh Admin dan tersimpan aman di Supabase.
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-stone-950 border border-stone-800 cursor-pointer w-full">
              <input
                type="checkbox"
                checked={config.autoResolveOnRecovery}
                onChange={(e) => setConfig({ ...config, autoResolveOnRecovery: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded accent-emerald-500 shrink-0"
              />
              <div>
                <div className="text-xs font-bold text-stone-200">Auto-Resolve Saat Integrasi Pulih</div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Jika SMTP/Duitku/Telegram/Database kembali sukses, error terbuka pada integrasi tersebut otomatis ditandai selesai agar tidak menumpuk di laporan terjadwal.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* 2 REPORTING MODES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MODE 1: REALTIME */}
          <div className={`p-4 rounded-xl border transition-colors ${config.realtimeEnabled ? 'bg-amber-500/5 border-amber-500/35' : 'bg-stone-950/60 border-stone-800'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-stone-100">
                <input
                  type="checkbox"
                  checked={config.realtimeEnabled}
                  onChange={(e) => setConfig({ ...config, realtimeEnabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-amber-500"
                />
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Mode 1: Realtime Saat Ada Error</span>
              </label>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Mengirim email tabel otomatis seketika saat error baru terdeteksi pada integrasi mana pun.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Jeda Cooldown Error Sama (Anti-Spam Inbox)
              </label>
              <select
                value={config.realtimeCooldownMinutes}
                onChange={(e) => setConfig({ ...config, realtimeCooldownMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200"
              >
                <option value={0}>0 Menit (Kirim setiap kali terjadi)</option>
                <option value={1}>1 Menit per error unik</option>
                <option value={5}>5 Menit per error unik (Rekomendasi)</option>
                <option value={15}>15 Menit per error unik</option>
                <option value={60}>60 Menit per error unik</option>
              </select>
            </div>
          </div>

          {/* MODE 2: SCHEDULED */}
          <div className={`p-4 rounded-xl border transition-colors ${config.scheduledEnabled ? 'bg-cyan-500/5 border-cyan-500/35' : 'bg-stone-950/60 border-stone-800'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2.5 cursor-pointer font-bold text-sm text-stone-100">
                <input
                  type="checkbox"
                  checked={config.scheduledEnabled}
                  onChange={(e) => setConfig({ ...config, scheduledEnabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-500"
                />
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Mode 2: Terjadwal Jika Error Masih Terdeteksi</span>
              </label>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Cron otomatis memeriksa daftar error; email rekap tabel <strong>hanya dikirim jika masih ada error berstatus Open</strong>.
            </p>
            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Jadwal Interval Pengiriman Rekap
              </label>
              <select
                value={config.scheduledIntervalMinutes}
                onChange={(e) => setConfig({ ...config, scheduledIntervalMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200"
              >
                <option value={15}>Setiap 15 Menit</option>
                <option value={30}>Setiap 30 Menit</option>
                <option value={60}>Setiap 1 Jam (Rekomendasi)</option>
                <option value={360}>Setiap 6 Jam</option>
                <option value={720}>Setiap 12 Jam</option>
                <option value={1440}>Setiap 24 Jam (Harian)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-800/80">
          <button
            type="submit"
            disabled={savingConfig}
            className="px-5 py-2.5 bg-stone-100 hover:bg-white text-stone-950 font-bold rounded-xl text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Pengaturan Monitor</span>
          </button>
        </div>
      </form>

      {/* TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex bg-stone-900 border border-stone-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'logs' ? 'bg-rose-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Daftar Log Error ({logs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'preview' ? 'bg-rose-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Tabel Email</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'history' ? 'bg-rose-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Terkirim ({history.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-xs font-semibold text-stone-300 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* TAB 1: ERROR LOGS TABLE */}
      {activeTab === 'logs' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-stone-800 flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(['open', 'resolved', 'all'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    statusFilter === st
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {st === 'open' ? `Masih Terdeteksi (${openLogs.length})` : st === 'resolved' ? `Sudah Selesai (${resolvedLogs.length})` : `Semua (${logs.length})`}
                </button>
              ))}

              <select
                value={integrationFilter}
                onChange={(e) => setIntegrationFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-300"
              >
                <option value="all">Semua Integrasi</option>
                {Object.entries(integrationsMeta).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pesan / endpoint..."
                  className="pl-8 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 w-48"
                />
              </div>

              {openLogs.length > 0 && (
                <button
                  type="button"
                  onClick={handleResolveAll}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tandai Semua Selesai</span>
                </button>
              )}

              {resolvedLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearResolved(false)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Selesai</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-800">
              <thead className="bg-stone-950/70">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Integrasi</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Aksi & Pesan Error</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-stone-400 uppercase">Hits</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Terakhir</th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-stone-400 uppercase">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs text-stone-500">
                      {statusFilter === 'open'
                        ? 'Tidak ada error aktif yang terdeteksi. Semua integrasi berjalan normal.'
                        : 'Tidak ada log error yang sesuai filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => {
                    const isExpanded = expandedId === item.id;
                    const intLabel = integrationsMeta[item.integration]?.label || item.integration;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="hover:bg-stone-850/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.status === 'open'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {item.status === 'open' ? 'Open' : 'Resolved'}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  item.severity === 'critical'
                                    ? 'text-rose-400'
                                    : item.severity === 'error'
                                    ? 'text-amber-400'
                                    : 'text-yellow-300'
                                }`}
                              >
                                {item.severity}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-bold text-stone-200 whitespace-nowrap">
                            {intLabel}
                          </td>
                          <td className="px-4 py-3.5 text-xs max-w-md">
                            <div className="font-mono text-[11px] text-cyan-300 truncate">{item.action}</div>
                            <div className="text-stone-200 font-medium mt-0.5 line-clamp-2">{item.message}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-bold text-stone-200 whitespace-nowrap">
                            {item.occurrences}x
                          </td>
                          <td className="px-4 py-3.5 text-[11px] text-stone-400 whitespace-nowrap">
                            {new Date(item.lastSeenAt).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {item.status === 'open' ? (
                              <button
                                type="button"
                                onClick={() => handleResolveToggle(item.id, 'resolved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold border border-emerald-500/30"
                              >
                                Selesai
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleResolveToggle(item.id, 'open')}
                                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Buka</span>
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-stone-950/90">
                            <td colSpan={6} className="px-5 py-4 text-xs space-y-2">
                              <div className="flex flex-wrap gap-4 text-[11px] text-stone-400">
                                <span>ID: <code className="text-stone-200">{item.id}</code></span>
                                <span>Pertama Terdeteksi: <strong className="text-stone-200">{new Date(item.firstSeenAt).toLocaleString('id-ID')}</strong></span>
                                <span>Terkirim Realtime: <strong className="text-stone-200">{item.notifyCount || 0}x</strong></span>
                              </div>
                              {item.details && (
                                <div className="text-stone-300">
                                  <span className="font-bold text-stone-400">Detail Konteks:</span> {item.details}
                                </div>
                              )}
                              {item.stack && (
                                <pre className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-300 overflow-x-auto whitespace-pre-wrap">
                                  {item.stack}
                                </pre>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL EMAIL TABLE FORMAT PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <div className="text-xs text-stone-400">
            Contoh tampilan email HTML bertabel rapi yang diterima oleh <strong className="text-stone-200">{config.developerEmail || 'email developer'}</strong> (kompatibel dengan Gmail, Outlook, & Apple Mail):
          </div>

          <div className="bg-white text-zinc-900 rounded-xl border border-zinc-300 overflow-hidden shadow-xl max-w-3xl mx-auto">
            <div className="bg-slate-900 text-white p-5 border-b-4 border-rose-600">
              <span className="inline-block px-2.5 py-1 rounded bg-rose-600 text-[10px] font-extrabold uppercase tracking-wider">
                {openLogs.length > 0 ? 'LAPORAN TERJADWAL • ERROR AKTIF' : 'CONTOH FORMAT LAPORAN TABEL'}
              </span>
              <h3 className="text-lg font-extrabold mt-2">
                Rekap Error Integrasi ({openLogs.length} Masalah Masih Terdeteksi)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Dikirim otomatis ke {config.developerEmail || 'developer@domainanda.com'}
              </p>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-2">1. Ringkasan Kesehatan Semua Integrasi</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="p-2 border border-slate-700 text-left">Integrasi</th>
                        <th className="p-2 border border-slate-700 text-center">Status</th>
                        <th className="p-2 border border-slate-700 text-center">Total Hits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['database', 'email', 'duitku', 'telegram', 'ai', 'market_data'].map((key, i) => {
                        const matched = openLogs.filter((l) => l.integration === key);
                        const hits = matched.reduce((s, l) => s + l.occurrences, 0);
                        return (
                          <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-2 border border-slate-300 font-bold text-slate-900">
                              {integrationsMeta[key]?.label || key}
                            </td>
                            <td className="p-2 border border-slate-300 text-center">
                              {matched.length > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                                  BERMASALAH ({matched.length})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  NORMAL
                                </span>
                              )}
                            </td>
                            <td className="p-2 border border-slate-300 text-center font-bold">{hits}x</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-2">2. Daftar Error yang Masih Terdeteksi</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="p-2 border border-slate-700">No</th>
                        <th className="p-2 border border-slate-700 text-left">Integrasi</th>
                        <th className="p-2 border border-slate-700">Level</th>
                        <th className="p-2 border border-slate-700 text-left">Endpoint / Aksi</th>
                        <th className="p-2 border border-slate-700 text-left">Pesan Error</th>
                        <th className="p-2 border border-slate-700">Hits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(openLogs.length > 0 ? openLogs.slice(0, 5) : [
                        {
                          id: 'sample',
                          integration: 'duitku',
                          severity: 'critical',
                          action: 'POST /api/payment/duitku/create-invoice',
                          message: 'Contoh: Koneksi ke Duitku Production API timeout setelah 10000ms',
                          occurrences: 2,
                        } as SystemErrorLog,
                      ]).map((row, idx) => (
                        <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-bold">{integrationsMeta[row.integration]?.label || row.integration}</td>
                          <td className="p-2 border border-slate-300 text-center uppercase font-bold text-[10px] text-red-700">{row.severity}</td>
                          <td className="p-2 border border-slate-300 font-mono text-[11px]">{row.action}</td>
                          <td className="p-2 border border-slate-300">{row.message}</td>
                          <td className="p-2 border border-slate-300 text-center font-bold">{row.occurrences}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPORT DISPATCH HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-800">
              <thead className="bg-stone-950/70">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Waktu</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Email Tujuan</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Subjek</th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold text-stone-400 uppercase">Error</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-stone-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-xs text-stone-500">
                      Belum ada riwayat email laporan error yang dikirim ke developer.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-stone-850/40">
                      <td className="px-4 py-3.5 text-xs text-stone-400 whitespace-nowrap">
                        {new Date(h.sentAt).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            h.mode === 'realtime'
                              ? 'bg-amber-500/15 text-amber-300'
                              : h.mode === 'scheduled'
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {h.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-stone-300">{(h.to || []).join(', ')}</td>
                      <td className="px-4 py-3.5 text-xs text-stone-200 max-w-xs truncate">{h.subject}</td>
                      <td className="px-4 py-3.5 text-center text-xs font-bold text-stone-200">{h.errorCount}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {h.success ? (
                          <span className="text-emerald-400 font-bold">
                            Terkirim ({h.provider?.toUpperCase() || 'OK'})
                          </span>
                        ) : (
                          <span className="text-rose-400" title={h.errorMessage}>
                            Gagal: {h.errorMessage || 'Error'}
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
      )}
    </div>
  );
};
