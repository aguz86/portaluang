import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Save,
  Database,
  Webhook,
  Code2,
  BookOpen,
  FileText,
  FileEdit,
  KeyRound,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PluConnectedBadge } from '../../components/PluConnectedBadge';

interface CmsOverview {
  settings: {
    syncMode: 'hybrid' | 'payload_priority' | 'local';
    autoSyncOnWebhook: boolean;
    postsCollection: string;
    pagesCollection: string;
    guidesCollection: string;
  };
  payloadStatus: {
    configured: boolean;
    connected: boolean;
    urlMasked: string;
    detail: string;
    collectionsDetected: string[];
    hasApiKey: boolean;
    hasWebhookSecret: boolean;
  };
  cache: {
    lastSyncedAt: string;
    stats: {
      postsCount: number;
      pagesCount: number;
      guidesCount: number;
    };
  } | null;
  blueprint: string;
}

export const AdminPayloadCMS: React.FC = () => {
  const [overview, setOverview] = useState<CmsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [syncMode, setSyncMode] = useState<'hybrid' | 'payload_priority' | 'local'>('hybrid');
  const [autoSyncOnWebhook, setAutoSyncOnWebhook] = useState(true);
  const [postsCollection, setPostsCollection] = useState('posts');
  const [pagesCollection, setPagesCollection] = useState('pages');
  const [guidesCollection, setGuidesCollection] = useState('guides');

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/overview', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setOverview(data);
        if (data.settings) {
          setSyncMode(data.settings.syncMode || 'hybrid');
          setAutoSyncOnWebhook(Boolean(data.settings.autoSyncOnWebhook));
          setPostsCollection(data.settings.postsCollection || 'posts');
          setPagesCollection(data.settings.pagesCollection || 'pages');
          setGuidesCollection(data.settings.guidesCollection || 'guides');
        }
      }
    } catch (err) {
      console.error('Failed to fetch CMS overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/cms/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          syncMode,
          autoSyncOnWebhook,
          postsCollection,
          pagesCollection,
          guidesCollection,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Pengaturan integrasi Payload CMS berhasil disimpan.' });
        fetchOverview();
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan pengaturan CMS.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/cms/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Sinkronisasi Payload CMS sukses! Tersinkron: ${data.stats?.postsCount || 0} Artikel, ${data.stats?.pagesCount || 0} Halaman, ${data.stats?.guidesCount || 0} Panduan Panjang.`,
        });
        fetchOverview();
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal melakukan sinkronisasi Payload CMS.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghubungi server saat sinkronisasi.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/payload`;
  const ps = overview?.payloadStatus;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            Payload CMS Integration & Studio
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Hubungkan Headless Payload CMS untuk penulisan artikel & panduan panjang yang stabil, lengkap dengan sinkronisasi otomatis ke Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-xs font-bold rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Cek Status
          </button>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || !ps?.configured}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-xs font-black rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Menyinkronkan...' : 'Sync dari Payload CMS'}
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-stone-950 border border-stone-800 text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-100">Status Koneksi Payload CMS (ENV)</h2>
                <p className="text-xs text-stone-400">
                  {ps?.urlMasked ? `Endpoint: ${ps.urlMasked}` : 'Menggunakan CMS Internal Supabase sampai PAYLOAD_CMS_URL diset'}
                </p>
              </div>
            </div>
            <PluConnectedBadge
              connected={Boolean(ps?.connected)}
              configured={Boolean(ps?.configured)}
              labelConnected="CONNECTED"
              labelDisconnected="DISCONNECTED"
              labelUnconfigured="MODE LOKAL"
            />
          </div>

          <p className="text-xs text-stone-300 bg-stone-950 border border-stone-800/80 rounded-xl px-4 py-3">
            {ps?.detail || 'Memeriksa status koneksi Payload CMS...'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3">
              <div className="text-stone-500 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> PAYLOAD_CMS_URL
              </div>
              <div className={`mt-1 font-bold ${ps?.configured ? 'text-emerald-400' : 'text-stone-400'}`}>
                {ps?.configured ? 'Terkonfigurasi' : 'Belum Diset'}
              </div>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3">
              <div className="text-stone-500 font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> PAYLOAD_CMS_API_KEY
              </div>
              <div className={`mt-1 font-bold ${ps?.hasApiKey ? 'text-emerald-400' : 'text-stone-400'}`}>
                {ps?.hasApiKey ? 'Aktif (Private ENV)' : 'Opsional (Public Read)'}
              </div>
            </div>
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-3">
              <div className="text-stone-500 font-semibold flex items-center gap-1.5">
                <Webhook className="w-3.5 h-3.5" /> PAYLOAD_WEBHOOK_SECRET
              </div>
              <div className={`mt-1 font-bold ${ps?.hasWebhookSecret ? 'text-emerald-400' : 'text-stone-400'}`}>
                {ps?.hasWebhookSecret ? 'Terproteksi' : 'Belum Diset'}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Cache Stats + Quick Studio Links */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" /> Cache Supabase Sync
            </h3>
            <p className="text-[11px] text-stone-400 mt-1">
              {overview?.cache?.lastSyncedAt
                ? `Sinkron terakhir: ${new Date(overview.cache.lastSyncedAt).toLocaleString('id-ID')}`
                : 'Belum pernah sinkronisasi dari Payload CMS eksternal.'}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5">
                <div className="text-lg font-black text-white">{overview?.cache?.stats?.postsCount ?? 0}</div>
                <div className="text-[10px] text-stone-500 uppercase font-bold">Artikel</div>
              </div>
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5">
                <div className="text-lg font-black text-white">{overview?.cache?.stats?.pagesCount ?? 0}</div>
                <div className="text-[10px] text-stone-500 uppercase font-bold">Halaman</div>
              </div>
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5">
                <div className="text-lg font-black text-white">{overview?.cache?.stats?.guidesCount ?? 0}</div>
                <div className="text-[10px] text-stone-500 uppercase font-bold">Panduan</div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-800 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Editor Studio Internal</div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/admin/posts"
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200"
              >
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-amber-400" /> Blog</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500" />
              </Link>
              <Link
                to="/admin/content"
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-xs font-semibold text-stone-200"
              >
                <span className="flex items-center gap-1.5"><FileEdit className="w-3.5 h-3.5 text-rose-400" /> Halaman & Panduan</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Mode & Collections Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" /> Mode Sumber Konten & Koleksi Payload
          </h3>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">Prioritas Sumber Konten</label>
            <select
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value as any)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
            >
              <option value="hybrid">Hybrid (Payload CMS + Fallback Studio Internal Supabase)</option>
              <option value="payload_priority">Prioritas Payload CMS (Jika cache Payload tersedia)</option>
              <option value="local">Studio Internal Supabase Saja (Tanpa Payload Eksternal)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Slug Posts</label>
              <input
                type="text"
                value={postsCollection}
                onChange={(e) => setPostsCollection(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Slug Pages</label>
              <input
                type="text"
                value={pagesCollection}
                onChange={(e) => setPagesCollection(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Slug Guides</label>
              <input
                type="text"
                value={guidesCollection}
                onChange={(e) => setGuidesCollection(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={autoSyncOnWebhook}
              onChange={(e) => setAutoSyncOnWebhook(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span>Otomatis sinkron ke Supabase saat Payload CMS mengirim webhook Publish/Update</span>
          </label>

          <div className="flex justify-end pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan CMS'}
            </button>
          </div>
        </div>

        {/* Webhook & Environment Setup */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Webhook className="w-4 h-4 text-cyan-400" /> Endpoint Webhook & Panduan ENV
          </h3>
          <p className="text-xs text-stone-400">
            Semua kredensial Payload CMS disimpan di Environment Variables server agar aman. Tambahkan hook `afterChange` di Payload CMS menuju URL berikut:
          </p>

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <code className="text-xs font-mono text-amber-300 truncate">{webhookUrl}</code>
            <button
              type="button"
              onClick={() => handleCopy('webhook', webhookUrl)}
              className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs text-stone-200 inline-flex items-center gap-1 shrink-0"
            >
              {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              Salin
            </button>
          </div>

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 text-xs font-mono text-stone-300 space-y-1">
            <div className="text-stone-500"># Tambahkan di ENV Server Portal Uang (Altare / VPS):</div>
            <div>PAYLOAD_CMS_URL=&quot;https://cms.portaluang.id&quot;</div>
            <div>PAYLOAD_CMS_API_KEY=&quot;api-key-dari-payload-admin&quot;</div>
            <div>PAYLOAD_WEBHOOK_SECRET=&quot;random-secret-32-karakter&quot;</div>
          </div>

          <div className="text-xs text-emerald-300/90 bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3">
            <strong>Tips Hemat Biaya:</strong> Payload CMS dapat memakai database PostgreSQL Supabase yang sama dengan Portal Uang cukup dengan mengatur <code className="text-white">schemaName: &apos;payload&apos;</code> sehingga Rp 0 biaya database tambahan.
          </div>
        </div>
      </div>

      {/* Copyable Payload CMS v3 Collection Blueprint */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" /> Blueprint Konfigurasi `payload.config.ts` (Siap Pakai)
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              Sudah mendukung Lexical Rich Text Editor, Koleksi Posts (Blog), Pages (Tentang Kami, Privasi, S&K), Guides (Panduan Panjang), dan Webhook Auto-Sync.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('blueprint', overview?.blueprint || '')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-stone-200 self-start"
          >
            {copiedKey === 'blueprint' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Salin Blueprint
          </button>
        </div>

        <pre className="bg-stone-950 border border-stone-800 rounded-xl p-4 overflow-x-auto text-xs font-mono text-stone-300 max-h-96 custom-scrollbar">
          {overview?.blueprint || '// Memuat blueprint...'}
        </pre>
      </div>
    </div>
  );
};
