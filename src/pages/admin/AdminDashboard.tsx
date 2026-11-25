import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  TrendingDown,
  ReceiptText,
  Activity,
  CheckCircle2,
  RefreshCw,
  Database,
  CreditCard,
  Mail,
  Bot,
  Send,
  Megaphone,
  Loader2,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { PluConnectedBadge } from '../../components/PluConnectedBadge';

interface IntegrationItem {
  key: string;
  name: string;
  configured: boolean;
  connected: boolean;
  detail: string;
}

const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  database: <Database className="w-4 h-4 text-emerald-400" />,
  duitku: <CreditCard className="w-4 h-4 text-amber-400" />,
  email: <Mail className="w-4 h-4 text-cyan-400" />,
  telegram: <Send className="w-4 h-4 text-sky-400" />,
  ai: <Bot className="w-4 h-4 text-purple-400" />,
  meta: <Megaphone className="w-4 h-4 text-rose-400" />,
  payloadCms: <Layers className="w-4 h-4 text-amber-400" />,
};

export const AdminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [txCountToday, setTxCountToday] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);
  const [totalIntegrations, setTotalIntegrations] = useState(6);
  const [checkingIntegrations, setCheckingIntegrations] = useState(true);

  const fetchIntegrationsStatus = useCallback(async (forceRefresh = false) => {
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
    if (!adminToken) return;
    setCheckingIntegrations(true);
    try {
      const res = await fetch(`/api/admin/integrations-status${forceRefresh ? '?refresh=1' : ''}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
          setConnectedCount(Number(data.connectedCount || 0));
          setTotalIntegrations(Number(data.totalCount || 6));
        }
      }
    } catch (err) {
      console.error('Error checking integrations status:', err);
    } finally {
      setCheckingIntegrations(false);
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
        if (!adminToken) return;

        const [usersRes, txRes] = await Promise.all([
          fetch('/api/admin/users', {
            headers: { Authorization: `Bearer ${adminToken}` },
          }),
          fetch('/api/admin/duitku/transactions', {
            headers: { Authorization: `Bearer ${adminToken}` },
          }),
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          if (data.success && data.users) {
            setUsers(data.users);
            setUserCount(data.users.length);
          }
        }

        if (txRes.ok) {
          const txData = await txRes.json();
          if (txData.success && Array.isArray(txData.transactions)) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const todays = txData.transactions.filter((t: any) =>
              String(t.createdAt || '').startsWith(todayStr)
            );
            setTxCountToday(todays.length);
            const paidTotal = txData.transactions
              .filter((t: any) => t.status === 'SUCCESS')
              .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
            setTotalRevenue(paidTotal);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    fetchIntegrationsStatus(false);
  }, [fetchIntegrationsStatus]);

  const stats = [
    {
      label: 'Total Users',
      value: loading ? '...' : userCount.toString(),
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Paid Revenue',
      value: loading ? '...' : `Rp ${totalRevenue.toLocaleString('id-ID')}`,
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      label: 'Integrasi Konek',
      value: checkingIntegrations ? '...' : `${connectedCount}/${totalIntegrations}`,
      icon: <TrendingDown className="w-5 h-5" />,
    },
    {
      label: "Today's TX",
      value: loading ? '...' : txCountToday.toString(),
      icon: <ReceiptText className="w-5 h-5" />,
    },
  ];

  const disconnectedIssues = integrations.filter((i) => i.configured && !i.connected);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Overview</h1>
          <p className="text-sm text-stone-400 mt-1">Key metrics and system status.</p>
        </div>

        <button
          type="button"
          onClick={() => fetchIntegrationsStatus(true)}
          disabled={checkingIntegrations}
          className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 w-fit"
        >
          {checkingIntegrations ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Cek Koneksi ENV</span>
        </button>
      </div>

      {/* ENV INTEGRATION STATUS CARDS */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-bold text-stone-100">Status Integrasi Environment (ENV)</h2>
          <p className="text-xs text-stone-400 mt-1">
            Setiap integrasi yang kredensial ENV-nya valid dan berhasil terhubung menampilkan indikator LED hijau <span className="text-emerald-400 font-bold">CONNECTED</span>.
          </p>
        </div>

        {checkingIntegrations && integrations.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-20 rounded-xl bg-stone-950 border border-stone-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {integrations.map((item) => (
              <div
                key={item.key}
                className="p-4 rounded-xl border bg-stone-950 border-stone-800"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 shrink-0">
                      {INTEGRATION_ICONS[item.key] || <Activity className="w-4 h-4 text-stone-400" />}
                    </div>
                    <span className="text-sm font-bold text-stone-100 truncate">{item.name}</span>
                  </div>
                  <PluConnectedBadge
                    connected={item.connected}
                    configured={item.configured}
                    size="sm"
                    labelConnected="CONNECTED"
                    labelDisconnected="DISCONNECTED"
                    labelUnconfigured="BELUM DISET"
                  />
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-stone-400">{stat.label}</p>
                <p className="text-2xl font-bold text-stone-100 mt-2">{stat.value}</p>
              </div>
              <div className="p-2 bg-stone-800 rounded-xl text-stone-400">{stat.icon}</div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400">
              <Activity className="w-3 h-3 mr-1" />
              Real-time Tracker
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-4">Recent Registrations</h3>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-stone-500 text-center py-4">Memuat data...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-4">Belum ada pengguna terdaftar.</p>
            ) : (
              users.slice(0, 5).map((user: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between pb-4 border-b border-stone-800 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400 uppercase">
                      {user.id ? user.id.substring(0, 1) : 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-200">{user.id || 'Unknown User'}</p>
                      <p className="text-xs text-stone-500">{user.subscription?.planName || 'Free Plan'}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-stone-800 text-stone-300">
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-4">System Alerts</h3>
          <div className="space-y-3">
            {disconnectedIssues.length > 0 ? (
              disconnectedIssues.map((issue) => (
                <div
                  key={issue.key}
                  className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20"
                >
                  <div className="mt-0.5 text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-rose-300">{issue.name} Terputus</p>
                    <p className="text-xs text-stone-400 mt-1">{issue.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="mt-0.5 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-400">Semua Sistem Normal</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Tidak ada peringatan atau error di server saat ini.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
