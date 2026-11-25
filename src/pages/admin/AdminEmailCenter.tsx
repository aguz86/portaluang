import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Users,
  CheckSquare,
  Square,
  Search,
  Sparkles,
  Rocket,
  Megaphone,
  Wrench,
  Save,
  RotateCcw,
  Eye,
  History,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  SlidersHorizontal
} from 'lucide-react';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { checkMaliciousContent } from '../../utils/security';

interface UserAccountItem {
  id: string;
  email: string;
  name: string;
  city: string;
  planId: string;
  planName: string;
  isPro: boolean;
  status: 'active' | 'expired';
  expiresAt?: string;
}

interface EmailTemplateItem {
  enabled: boolean;
  subject: string;
  title: string;
  body: string;
}

type TemplateKey = 'otp' | 'signup' | 'renewal' | 'expiry_reminder' | 'invoice' | 'change_pin';

const TEMPLATE_META: Record<TemplateKey, { label: string; desc: string; vars: string[] }> = {
  otp: {
    label: 'Kode OTP Verifikasi & Reset Password',
    desc: 'Dikirim otomatis saat pengguna mendaftar akun atau meminta reset password.',
    vars: ['{{name}}', '{{otp}}', '{{appName}}']
  },
  signup: {
    label: 'Selamat Datang Pendaftaran',
    desc: 'Dikirim otomatis setelah pengguna selesai verifikasi pendaftaran akun.',
    vars: ['{{name}}', '{{planName}}', '{{appName}}', '{{appUrl}}']
  },
  renewal: {
    label: 'Konfirmasi Perpanjangan / Aktivasi Pro',
    desc: 'Dikirim otomatis saat pembayaran perpanjangan / upgrade paket berhasil lunas.',
    vars: ['{{name}}', '{{planName}}', '{{amount}}', '{{expiresAt}}', '{{invoiceId}}', '{{appName}}']
  },
  expiry_reminder: {
    label: 'Pengingat Masa Aktif Habis (H-3 & H-1)',
    desc: 'Dikirim otomatis oleh cron server 3 hari dan 1 hari sebelum langganan berakhir.',
    vars: ['{{name}}', '{{planName}}', '{{daysLeft}}', '{{expiresAt}}', '{{appName}}']
  },
  invoice: {
    label: 'Pengantar Email Invoice PDF Lunas',
    desc: 'Dikirim bersama lampiran file PDF invoice resmi saat transaksi Duitku lunas.',
    vars: ['{{name}}', '{{planName}}', '{{amount}}', '{{invoiceId}}', '{{appName}}']
  },
  change_pin: {
    label: 'Peringatan Keamanan (Ubah Password / PIN)',
    desc: 'Dikirim otomatis ketika kata sandi atau PIN keamanan akun diperbarui.',
    vars: ['{{name}}', '{{appName}}']
  }
};

export const AdminEmailCenter: React.FC = () => {
  const { settings } = useGlobalSettings();
  const [activeTab, setActiveTab] = useState<'broadcast' | 'templates' | 'logs'>('broadcast');

  // Users checklist state
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegment, setFilterSegment] = useState<'all' | 'pro' | 'free' | 'expired'>('all');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Broadcast composer state
  const [presetCategory, setPresetCategory] = useState<'version_update' | 'promo' | 'maintenance' | 'custom'>('version_update');
  const [subject, setSubject] = useState(`🚀 Pembaruan ${settings.appName} v${settings.appVersion} Kini Tersedia!`);
  const [title, setTitle] = useState(`Rilis Terbaru ${settings.appName} v${settings.appVersion}`);
  const [body, setBody] = useState(
    `Halo {{name}},\n\nKami baru saja merilis pembaruan {{appName}} versi {{appVersion}} untuk pengalaman pengelolaan keuangan yang lebih cepat, stabil, dan cerdas.\n\nYang baru di update kali ini:\n- Peningkatan performa sinkronisasi & dashboard\n- AI Advisor OpenRouter lebih responsif\n- Pengiriman notifikasi & invoice lebih cepat\n\nTerima kasih sudah menggunakan {{appName}}!`
  );
  const [ctaText, setCtaText] = useState('Buka Aplikasi Sekarang');
  const [ctaUrl, setCtaUrl] = useState('/app/dashboard');
  const [showPreview, setShowPreview] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<Record<TemplateKey, EmailTemplateItem> | null>(null);
  const [defaultTemplates, setDefaultTemplates] = useState<Record<TemplateKey, EmailTemplateItem> | null>(null);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [templateFeedback, setTemplateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Broadcast history state
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  useEffect(() => {
    const fetchInitialData = async () => {
      const token = getToken();
      try {
        const [usersRes, tplRes, logsRes] = await Promise.all([
          fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/email/templates', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/email/broadcast-logs', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const usersData = await usersRes.json().catch(() => ({}));
        if (usersData.success && Array.isArray(usersData.users)) {
          const parsed: UserAccountItem[] = usersData.users
            .map((u: any) => {
              const email = String(u.email || u.id || '').trim().toLowerCase();
              const planId = u.subscription?.planId || 'free_trial';
              const isPro = planId !== 'free_trial' && planId !== 'free';
              const expiresAt = u.subscription?.expiresAt;
              const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : u.subscription?.status !== 'active';
              return {
                id: u.id || email,
                email,
                name: u.name || email.split('@')[0] || 'Pengguna',
                city: u.city || '-',
                planId,
                planName: u.subscription?.planName || (isPro ? 'Pro' : 'Free Trial'),
                isPro,
                status: (isExpired ? 'expired' : 'active') as 'active' | 'expired',
                expiresAt,
              };
            })
            .filter((u: UserAccountItem) => u.email.includes('@'));
          setUsers(parsed);
        }

        const tplData = await tplRes.json().catch(() => ({}));
        if (tplData.success && tplData.data) {
          setTemplates(tplData.data);
          setDefaultTemplates(tplData.defaults || tplData.data);
        }

        const logsData = await logsRes.json().catch(() => ({}));
        if (logsData.success && Array.isArray(logsData.data)) {
          setLogs(logsData.data);
        }
      } catch (err) {
        console.error('Error loading Email Center data:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchInitialData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterSegment === 'pro' && !(u.isPro && u.status === 'active')) return false;
      if (filterSegment === 'free' && u.isPro) return false;
      if (filterSegment === 'expired' && u.status !== 'expired') return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.city.toLowerCase().includes(q)
      );
    });
  }, [users, filterSegment, searchTerm]);

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      filteredUsers.forEach((u) => next.add(u.email));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
  };

  const applyPreset = (type: 'version_update' | 'promo' | 'maintenance' | 'custom') => {
    setPresetCategory(type);
    if (type === 'version_update') {
      setSubject(`🚀 Pembaruan {{appName}} v{{appVersion}} Kini Tersedia!`);
      setTitle(`Rilis Terbaru {{appName}} v{{appVersion}}`);
      setBody(
        `Halo {{name}},\n\nKami baru saja merilis pembaruan {{appName}} versi {{appVersion}} untuk pengalaman pengelolaan keuangan yang lebih cepat, stabil, dan cerdas.\n\nYang baru di versi ini:\n- Performa dashboard & laporan keuangan lebih cepat\n- Pembaruan sistem AI Advisor & sinkronisasi otomatis\n- Perbaikan bug dan peningkatan keamanan akun\n\nYuk coba pembaruannya sekarang!`
      );
      setCtaText('Lihat Pembaruan');
      setCtaUrl('/app/dashboard');
    } else if (type === 'promo') {
      setSubject(`🎁 Penawaran Spesial Perpanjangan {{appName}} untuk {{name}}`);
      setTitle(`Promo Khusus Akun {{planName}}`);
      setBody(
        `Halo {{name}},\n\nPaket Anda saat ini tercatat sebagai {{planName}}. Kami menyiapkan promo khusus agar Anda bisa terus menikmati fitur AI Advisor, Telegram Bot, dan pencadangan cloud tanpa batas.\n\nGunakan kode kupon promo yang tersedia di halaman checkout untuk mendapatkan potongan harga spesial.`
      );
      setCtaText('Perpanjang Paket Sekarang');
      setCtaUrl('/checkout?mode=renew');
    } else if (type === 'maintenance') {
      setSubject(`🛠️ Informasi Pemeliharaan Sistem {{appName}}`);
      setTitle(`Pemberitahuan Maintenance Terjadwal`);
      setBody(
        `Halo {{name}},\n\nKami akan melakukan pemeliharaan server terjadwal untuk meningkatkan kestabilan layanan {{appName}}.\n\nWaktu: Minggu, pukul 01:00 - 02:00 WIB\nDampak: Akses dashboard mungkin melambat beberapa menit.\n\nSeluruh data transaksi Anda tetap aman dan tersimpan.`
      );
      setCtaText('Buka Portal Uang');
      setCtaUrl('/app/dashboard');
    } else {
      setSubject(`Informasi Penting dari {{appName}}`);
      setTitle(`Pesan untuk {{name}}`);
      setBody(`Halo {{name}},\n\nTulis pesan custom Anda di sini...`);
      setCtaText('');
      setCtaUrl('');
    }
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + variable);
  };

  const previewSample = useMemo(() => {
    const firstSelected = users.find((u) => selectedEmails.has(u.email)) || users[0];
    const vars: Record<string, string> = {
      name: firstSelected?.name || 'Budi Santoso',
      email: firstSelected?.email || 'budi@gmail.com',
      planName: firstSelected?.planName || 'Pro Tahunan',
      expiresAt: firstSelected?.expiresAt
        ? new Date(firstSelected.expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '31 Desember 2026',
      appName: settings.appName || 'Portal Uang',
      appVersion: settings.appVersion || '1.0.0',
    };
    const replaceVars = (str: string) =>
      str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? '');

    return {
      subject: replaceVars(subject),
      title: replaceVars(title),
      body: replaceVars(body),
    };
  }, [users, selectedEmails, subject, title, body, settings]);

  const handleSendBroadcast = async () => {
    setBroadcastFeedback(null);
    if (selectedEmails.size === 0) {
      setBroadcastFeedback({ type: 'error', text: 'Centang minimal 1 akun penerima pada daftar checklist di samping.' });
      return;
    }
    const secCheck = checkMaliciousContent(`${subject} ${title} ${body} ${ctaText} ${ctaUrl}`);
    if (secCheck.isMalicious) {
      setBroadcastFeedback({ type: 'error', text: secCheck.reason || 'Konten ditolak sistem keamanan.' });
      return;
    }

    const recipients = users
      .filter((u) => selectedEmails.has(u.email))
      .map((u) => ({
        email: u.email,
        name: u.name,
        planName: u.planName,
        expiresAt: u.expiresAt,
      }));

    setSendingBroadcast(true);
    try {
      const res = await fetch('/api/admin/email/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          recipients,
          subject,
          title,
          body,
          ctaText,
          ctaUrl,
          category: presetCategory,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastFeedback({
          type: 'success',
          text: `Berhasil mengirim ${data.sentCount} dari ${data.totalTargets} email${data.failedCount ? ` (${data.failedCount} gagal)` : ''}!`,
        });
        // Refresh broadcast logs
        const logsRes = await fetch('/api/admin/email/broadcast-logs', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const logsData = await logsRes.json().catch(() => ({}));
        if (logsData.success && Array.isArray(logsData.data)) setLogs(logsData.data);
      } else {
        const extraErr = Array.isArray(data.errors) && data.errors.length > 0 ? ` Detail: ${data.errors[0]}` : '';
        setBroadcastFeedback({
          type: 'error',
          text: (data.error || 'Gagal mengirim email broadcast.') + extraErr,
        });
      }
    } catch (err) {
      setBroadcastFeedback({ type: 'error', text: 'Gagal terhubung ke server saat mengirim broadcast.' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleSaveTemplates = async () => {
    if (!templates) return;
    setTemplateFeedback(null);

    for (const key of Object.keys(templates) as TemplateKey[]) {
      const item = templates[key];
      const check = checkMaliciousContent(`${item.subject} ${item.title} ${item.body}`);
      if (check.isMalicious) {
        setTemplateFeedback({ type: 'error', text: `Template ${TEMPLATE_META[key].label} ditolak: ${check.reason}` });
        return;
      }
    }

    setSavingTemplates(true);
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(templates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplateFeedback({ type: 'success', text: 'Semua template pesan email otomatis berhasil disimpan!' });
      } else {
        setTemplateFeedback({ type: 'error', text: data.error || 'Gagal menyimpan template email.' });
      }
    } catch (err) {
      setTemplateFeedback({ type: 'error', text: 'Gagal terhubung ke server.' });
    } finally {
      setSavingTemplates(false);
    }
  };

  const resetTemplateToDefault = (key: TemplateKey) => {
    if (!defaultTemplates || !templates) return;
    setTemplates({
      ...templates,
      [key]: { ...defaultTemplates[key] },
    });
  };

  const refreshLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/email/broadcast-logs', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setLogs(data.data);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-cyan-400" />
            Notifikasi Email & Broadcast
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Checklist akun target untuk kirim notif update versi/promo, dan kustomisasi pesan email otomatis (OTP, pendaftaran, perpanjangan, invoice).
          </p>
        </div>

        <div className="flex bg-stone-900 border border-stone-800 p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('broadcast')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'broadcast' ? 'bg-cyan-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Broadcast & Checklist</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'templates' ? 'bg-cyan-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Template Otomatis</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('logs'); refreshLogs(); }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'logs' ? 'bg-cyan-500 text-stone-950' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BROADCAST & CHECKLIST AKUN */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CHECKLIST AKUN PENERIMA */}
          <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Checklist Akun Penerima
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                {selectedEmails.size} dipilih
              </span>
            </div>

            {/* Search & Segment Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama, email, atau kota..."
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'pro', label: 'Pro Aktif' },
                  { id: 'free', label: 'Free Trial' },
                  { id: 'expired', label: 'Expired' },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setFilterSegment(seg.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      filterSegment === seg.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Pilih Semua ({filteredUsers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-stone-400 hover:text-stone-200 font-medium flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Hapus Pilihan</span>
                </button>
              </div>
            </div>

            {/* Accounts Checklist */}
            <div className="flex-1 max-h-[460px] overflow-y-auto space-y-2 pr-1">
              {loadingUsers ? (
                <div className="py-12 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Memuat daftar akun pengguna...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-xs">
                  Tidak ada akun pengguna yang cocok dengan filter ini.
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const checked = selectedEmails.has(user.email);
                  return (
                    <label
                      key={user.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-cyan-500/10 border-cyan-500/40'
                          : 'bg-stone-950/70 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmail(user.email)}
                        className="mt-1 w-4 h-4 rounded accent-cyan-500 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-stone-100 truncate">{user.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              user.isPro
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {user.planName}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 font-mono truncate">{user.email}</div>
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span className={user.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}>
                            {user.status === 'active' ? 'Aktif' : 'Expired'}
                          </span>
                          {user.city && user.city !== '-' && <span className="text-stone-500">&bull; {user.city}</span>}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: EDITOR PESAN CUSTOM & PREVIEW */}
          <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Editor Pesan Custom
              </h2>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showPreview ? 'Tutup Preview' : 'Lihat Preview Email'}</span>
              </button>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('version_update')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  presetCategory === 'version_update'
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Update Versi</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('promo')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  presetCategory === 'promo'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Promo / Renew</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('maintenance')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  presetCategory === 'maintenance'
                    ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Maintenance</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('custom')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  presetCategory === 'custom'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Custom Bebas</span>
              </button>
            </div>

            {broadcastFeedback && (
              <div
                className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                  broadcastFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                }`}
              >
                {broadcastFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <span>{broadcastFeedback.text}</span>
              </div>
            )}

            {showPreview ? (
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="text-xs text-stone-500">
                  Subjek: <span className="text-stone-200 font-semibold">{previewSample.subject}</span>
                </div>
                <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-stone-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">{settings.appName}</div>
                    <div className="text-base font-bold text-white mt-1">{previewSample.title}</div>
                  </div>
                  <div className="p-4 text-xs text-stone-300 whitespace-pre-line leading-relaxed">
                    {previewSample.body}
                    {ctaText.trim() && (
                      <div className="mt-4">
                        <span className="inline-block px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-lg">
                          {ctaText}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Subjek Email
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 focus:border-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    Judul Header di Dalam Email
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 focus:border-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-300">
                      Isi Pesan
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {['{{name}}', '{{planName}}', '{{appName}}', '{{appVersion}}', '{{expiresAt}}'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-amber-300"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-100 focus:border-cyan-500 outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1.5">
                      Teks Tombol CTA (Opsional)
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Buka Aplikasi"
                      className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-400 mb-1.5">
                      Link Tujuan Tombol (Opsional)
                    </label>
                    <input
                      type="text"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="/app/dashboard"
                      className="w-full px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs font-mono text-stone-100"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-4">
              <p className="text-xs text-stone-400">
                Dikirim via FreeResend / SMTP terintegrasi ke akun yang dicentang.
              </p>
              <button
                type="button"
                disabled={sendingBroadcast || selectedEmails.size === 0}
                onClick={handleSendBroadcast}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black rounded-xl text-sm flex items-center gap-2 transition-colors shrink-0"
              >
                {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Kirim ke {selectedEmails.size} Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KUSTOMISASI TEMPLATE OTOMATIS */}
      {activeTab === 'templates' && templates && (
        <div className="space-y-5">
          {templateFeedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
                templateFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}
            >
              {templateFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span>{templateFeedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5">
            {(Object.keys(TEMPLATE_META) as TemplateKey[]).map((key) => {
              const meta = TEMPLATE_META[key];
              const item = templates[key];
              return (
                <div key={key} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-stone-100">{meta.label}</h3>
                      <p className="text-xs text-stone-400 mt-0.5">{meta.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => resetTemplateToDefault(key)}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-200 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) =>
                            setTemplates({
                              ...templates,
                              [key]: { ...item, enabled: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded accent-cyan-500"
                        />
                        <span>Aktif</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1.5">Subjek Email</label>
                      <input
                        type="text"
                        value={item.subject}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            [key]: { ...item, subject: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1.5">Judul Header Email</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          setTemplates({
                            ...templates,
                            [key]: { ...item, title: e.target.value },
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-medium text-stone-300">Isi Pesan</label>
                      <span className="text-[11px] font-mono text-amber-400/90">
                        Variabel: {meta.vars.join(', ')}
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={item.body}
                      onChange={(e) =>
                        setTemplates({
                          ...templates,
                          [key]: { ...item, body: e.target.value },
                        })
                      }
                      className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-100 leading-relaxed"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end sticky bottom-4">
            <button
              type="button"
              disabled={savingTemplates}
              onClick={handleSaveTemplates}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black rounded-xl text-sm flex items-center gap-2 shadow-xl"
            >
              {savingTemplates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Semua Template Otomatis</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: RIWAYAT PENGIRIMAN */}
      {activeTab === 'logs' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-stone-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-100">Riwayat Pengiriman Broadcast</h2>
            <button
              type="button"
              onClick={refreshLogs}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-300"
            >
              {loadingLogs ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-800">
              <thead className="bg-stone-950/60">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase">Waktu</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase">Kategori</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase">Subjek</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase">Target</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-stone-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-xs text-stone-500">
                      Belum ada riwayat broadcast yang dikirim.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-850/40">
                      <td className="px-5 py-3.5 text-xs text-stone-400 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-semibold">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-200 font-medium">
                        {log.subject}
                        {Array.isArray(log.sampleEmails) && log.sampleEmails.length > 0 && (
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            Ke: {log.sampleEmails.join(', ')}{log.totalTargets > 5 ? ` (+${log.totalTargets - 5} lainnya)` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-stone-300">{log.totalTargets} akun</td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="text-emerald-400 font-bold">{log.sentCount} terkirim</span>
                        {log.failedCount > 0 && (
                          <span className="text-rose-400 ml-2">({log.failedCount} gagal)</span>
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
