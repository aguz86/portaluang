import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Database,
  CreditCard,
  Mail,
  Send,
  Bot,
  Megaphone,
  Layers,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Radio,
  Terminal,
  Server,
} from 'lucide-react';
import { PluConnectedBadge } from '../../components/PluConnectedBadge';

interface ConnectionItem {
  key: string;
  name: string;
  envVars: string;
  configured: boolean;
  connected: boolean;
  detail: string;
  latencyMs: number;
}

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
  notifyCount: number;
}

interface RealtimeErrorEvent {
  id: string;
  timestamp: string;
  integration: string;
  severity: 'critical' | 'error' | 'warning';
  action: string;
  message: string;
  details?: string;
}

interface RuntimeInfo {
  envFileFound: boolean;
  cwd: string;
  nodeVersion: string;
  uptimeSeconds: number;
  appUrl: string;
}

const CONNECTION_ICONS: Record<string, React.ReactNode> = {
  database: <Database className="w-4 h-4 text-emerald-400" />,
  duitku: <CreditCard className="w-4 h-4 text-amber-400" />,
  email: <Mail className="w-4 h-4 text-cyan-400" />,
  telegram: <Send className="w-4 h-4 text-sky-400" />,
  ai: <Bot className="w-4 h-4 text-purple-400" />,
  meta: <Megaphone className="w-4 h-4 text-rose-400" />,
  payloadCms: <Layers className="w-4 h-4 text-amber-300" />,
  market_data: <TrendingUp className="w-4 h-4 text-emerald-300" />,
};

function formatWib(iso?: string): string {
  if (!iso) return '-';
  try {
    return (
      new Date(iso).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return iso;
  }
}

function formatUptime(secs?: number): string {
  const total = Math.max(0, Number(secs || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}j ${m}m ${s}d`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
}

export const AdminConnectionMonitor: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string>('');
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [errorLogs, setErrorLogs] = useState<SystemErrorLog[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeErrorEvent[]>([]);
  const [integrationsMeta, setIntegrationsMeta] = useState<Record<string, { label: string; category: string }>>({});
  const [apiError, setApiError] = useState('');

  const [logTab, setLogTab] = useState<'logs' | 'stream'>('logs');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [integrationFilter, setIntegrationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  const fetchMonitorData = useCallback(async (isManual = false) => {
    const token = getToken();
    if (!token) return;
    if (isManual) setRefreshing(true);
    setApiError('');
    try {
      const res = await fetch(`/api/admin/connection-monitor${isManual ? '?refresh=1' : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login?expired=1';
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setConnections(Array.isArray(data.connections) ? data.connections : []);
        setErrorLogs(Array.isArray(data.errorLogs) ? data.errorLogs : []);
        setRealtimeEvents(Array.isArray(data.realtimeEvents) ? data.realtimeEvents : []);
        setRuntime(data.runtime || null);
        setCheckedAt(data.checkedAt || '');
        if (data.integrationsMeta) setIntegrationsMeta(data.integrationsMeta);
      } else {
        setApiError(data.error || 'Gagal memuat data monitoring koneksi.');
      }
    } catch {
      setApiError('Gagal menghubungi server untuk memperbarui monitoring koneksi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitorData(false);
  }, [fetchMonitorData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchMonitorData(false);
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchMonitorData]);

  const handleResolveToggle = async (id: string, nextStatus: 'open' | 'resolved') => {
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/error-monitor/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) {
        await fetchMonitorData(false);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleResolveAll = async () => {
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/error-monitor/resolve-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        await fetchMonitorData(false);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const connectedCount = connections.filter((c) => c.connected).length;
  const disconnectedCount = connections.filter((c) => c.configured && !c.connected).length;
  const openErrorCount = errorLogs.filter((l) => l.status === 'open').length;

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return errorLogs.filter((log) => {
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (integrationFilter !== 'all' && log.integration !== integrationFilter) return false;
      if (q) {
        const hay = `${log.integration} ${log.action} ${log.message} ${log.details || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [errorLogs, statusFilter, integrationFilter, searchQuery]);

  const filteredStream = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return realtimeEvents.filter((ev) => {
      if (integrationFilter !== 'all' && ev.integration !== integrationFilter) return false;
      if (q) {
        const hay = `${ev.integration} ${ev.action} ${ev.message} ${ev.details || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [realtimeEvents, integrationFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-400" />
            Monitoring Koneksi &amp; Log Error Realtime
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Pantau status seluruh koneksi layanan server, ENV, latensi, serta riwayat log error secara realtime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors ${
              autoRefresh
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-stone-900 border-stone-700 text-stone-400'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>Auto-Refresh 10d: {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchMonitorData(true)}
            disabled={refreshing}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Uji Semua Koneksi Sekarang</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Runtime & Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-400 font-medium">Layanan Terhubung</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {loading ? '...' : `${connectedCount}/${connections.length}`}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {disconnectedCount > 0 ? `${disconnectedCount} koneksi bermasalah` : 'Semua ENV aktif sehat'}
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-400 font-medium">Error Aktif (Open)</div>
          <div className={`text-2xl font-bold mt-1 ${openErrorCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {loading ? '...' : openErrorCount}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">
            {realtimeEvents.length} event di stream sesi ini
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-400 font-medium flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-stone-400" /> File .env &amp; Runtime
          </div>
          <div className={`text-sm font-bold mt-2 ${runtime?.envFileFound ? 'text-emerald-400' : 'text-amber-400'}`}>
            {runtime ? (runtime.envFileFound ? '.env TERDETEKSI' : '.env TIDAK DITEMUKAN') : '...'}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 truncate">
            {runtime ? `${runtime.nodeVersion} • Uptime ${formatUptime(runtime.uptimeSeconds)}` : 'Memuat...'}
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
          <div className="text-xs text-stone-400 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" /> Pembaruan Terakhir
          </div>
          <div className="text-sm font-bold text-stone-200 mt-2">
            {checkedAt ? formatWib(checkedAt) : '...'}
          </div>
          <div className="text-[11px] text-stone-500 mt-1 truncate">
            {runtime?.appUrl || 'Portal Uang Server'}
          </div>
        </div>
      </div>

      {/* Section 1: All Connection Statuses */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-100">Status Semua Koneksi Layanan</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Pengecekan langsung ke masing-masing layanan eksternal beserta latensi dan alasan jika terputus.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-24 rounded-xl bg-stone-950 border border-stone-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {connections.map((conn) => (
              <div
                key={conn.key}
                className={`p-4 rounded-xl border bg-stone-950 transition-colors ${
                  conn.configured && !conn.connected
                    ? 'border-rose-500/40'
                    : conn.connected
                    ? 'border-emerald-500/25'
                    : 'border-stone-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-stone-900 border border-stone-800 shrink-0">
                      {CONNECTION_ICONS[conn.key] || <Activity className="w-4 h-4 text-stone-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-100 truncate">{conn.name}</div>
                      <div className="text-[11px] font-mono text-stone-500 truncate">{conn.envVars}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <PluConnectedBadge
                      connected={conn.connected}
                      configured={conn.configured}
                      size="sm"
                      labelConnected="CONNECTED"
                      labelDisconnected="DISCONNECTED"
                      labelUnconfigured="BELUM DISET"
                    />
                    <span className="text-[10px] font-mono text-stone-500">{conn.latencyMs} ms</span>
                  </div>
                </div>

                <p
                  className={`text-xs mt-3 leading-relaxed ${
                    conn.configured && !conn.connected ? 'text-rose-300' : 'text-stone-400'
                  }`}
                >
                  {conn.detail}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Realtime Error Logs & Event Stream */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-rose-400" />
              Riwayat Log Error Realtime
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Seluruh error API, pembayaran Duitku, pengiriman email, database, dan runtime server tercatat otomatis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLogTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                logTab === 'logs'
                  ? 'bg-rose-500 text-stone-950'
                  : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
              }`}
            >
              Log Error ({errorLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setLogTab('stream')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                logTab === 'stream'
                  ? 'bg-rose-500 text-stone-950'
                  : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
              }`}
            >
              Live Stream ({realtimeEvents.length})
            </button>
            {openErrorCount > 0 && (
              <button
                type="button"
                onClick={handleResolveAll}
                disabled={actionBusy}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-50"
              >
                Tandai Semua Selesai
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pesan error, endpoint, atau integrasi..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <select
            value={integrationFilter}
            onChange={(e) => setIntegrationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
          >
            <option value="all">Semua Integrasi</option>
            {Object.entries(integrationsMeta).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>

          {logTab === 'logs' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
            >
              <option value="open">Status: Open</option>
              <option value="resolved">Status: Resolved</option>
              <option value="all">Semua Status</option>
            </select>
          )}
        </div>

        {/* Content */}
        {logTab === 'logs' ? (
          filteredLogs.length === 0 ? (
            <div className="p-8 rounded-xl bg-stone-950 border border-stone-800 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-stone-200">Tidak ada log error sesuai filter</div>
              <div className="text-xs text-stone-500">
                Sistem berjalan normal atau belum ada insiden yang tercatat.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border bg-stone-950 p-4 transition-colors ${
                      log.status === 'open' ? 'border-rose-500/30' : 'border-stone-800 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : log.severity === 'warning'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            }`}
                          >
                            {log.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] font-bold text-stone-300">
                            {integrationsMeta[log.integration]?.label || log.integration}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.status === 'open'
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-[11px] font-mono text-stone-500">
                            {log.occurrences}x • Terakhir: {formatWib(log.lastSeenAt)}
                          </span>
                        </div>

                        <div className="text-xs font-mono text-amber-300/90 break-all">{log.action}</div>
                        <div className="text-xs text-stone-200 break-words">{log.message}</div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] text-stone-300 flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          Detail
                        </button>
                        {log.status === 'open' ? (
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => handleResolveToggle(log.id, 'resolved')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Selesai
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => handleResolveToggle(log.id, 'open')}
                            className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[11px] text-stone-400 flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Buka
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-stone-800 space-y-2 text-[11px] text-stone-400">
                        <div>Pertama kali terjadi: {formatWib(log.firstSeenAt)}</div>
                        {log.details && (
                          <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 font-mono text-stone-300 break-all">
                            {log.details}
                          </div>
                        )}
                        {log.stack && (
                          <pre className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 font-mono text-[10px] text-rose-300/90 overflow-x-auto whitespace-pre-wrap">
                            {log.stack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : filteredStream.length === 0 ? (
          <div className="p-8 rounded-xl bg-stone-950 border border-stone-800 text-center text-xs text-stone-500">
            Belum ada event error realtime sejak server terakhir menyala.
          </div>
        ) : (
          <div className="bg-stone-950 border border-stone-800 rounded-xl divide-y divide-stone-800/80 max-h-[480px] overflow-y-auto">
            {filteredStream.map((ev) => (
              <div key={ev.id} className="p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-stone-500">{formatWib(ev.timestamp)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-[10px] font-bold text-stone-300">
                      {integrationsMeta[ev.integration]?.label || ev.integration}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300">{ev.action}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-rose-400">{ev.severity}</span>
                </div>
                <div className="text-stone-200 break-words">{ev.message}</div>
                {ev.details && <div className="text-[11px] font-mono text-stone-500 break-all">{ev.details}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
