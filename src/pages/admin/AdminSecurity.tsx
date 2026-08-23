import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, AlertTriangle, Save, AlertCircle } from 'lucide-react';

export const AdminSecurity: React.FC = () => {
  const [ips, setIps] = useState<string[]>([]);
  const [newIp, setNewIp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchIps = async () => {
      try {
        const adminToken = localStorage.getItem('admin_token');
        if (!adminToken) return;
        const res = await fetch('/api/admin/ip-whitelist', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.ips) {
            setIps(data.ips);
          }
        }
      } catch (err) {
        console.error('Error fetching IPs:', err);
        setError('Gagal memuat data IP Whitelist');
      } finally {
        setLoading(false);
      }
    };
    fetchIps();
  }, []);

  const handleSave = async (updatedIps: string[]) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const adminToken = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/ip-whitelist', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ ips: updatedIps })
      });
      const data = await res.json();
      if (data.success) {
        setIps(updatedIps);
        setSuccess('IP Whitelist berhasil diperbarui.');
      } else {
        setError(data.error || 'Gagal menyimpan IP Whitelist.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi gagal saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIp = () => {
    if (!newIp.trim()) return;
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(newIp.trim())) {
      setError('Format IP address tidak valid. Contoh: 192.168.1.1');
      return;
    }
    if (ips.includes(newIp.trim())) {
      setError('IP sudah ada dalam whitelist.');
      return;
    }
    const updatedIps = [...ips, newIp.trim()];
    handleSave(updatedIps);
    setNewIp('');
  };

  const handleRemoveIp = (ipToRemove: string) => {
    const updatedIps = ips.filter(ip => ip !== ipToRemove);
    handleSave(updatedIps);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-rose-500" />
          Security & IP Whitelist
        </h1>
        <p className="text-sm text-stone-400 mt-1">Kelola daftar IP Address yang diizinkan untuk mengakses portal admin.</p>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4 mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <strong>Peringatan Penting:</strong> Jika daftar ini kosong, maka semua IP Address (publik) dapat mencoba login ke portal admin. Jika Anda menambahkan setidaknya satu IP ke daftar ini, maka <strong>HANYA</strong> IP yang terdaftar yang dapat mengakses portal admin, IP lain akan langsung ditolak (Access Denied). Pastikan IP statis Anda terdaftar!
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-100">Daftar IP Diizinkan</h3>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="Contoh: 192.168.1.1"
              className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-4 py-2 text-stone-100 focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={handleAddIp}
              disabled={saving}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          <div className="mt-4 border border-stone-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-4 text-center text-stone-500 text-sm">Memuat data...</div>
            ) : ips.length === 0 ? (
              <div className="p-8 text-center text-stone-500 flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 mb-2 opacity-50" />
                <p>Belum ada IP dalam whitelist.</p>
                <p className="text-xs mt-1">Semua IP saat ini diizinkan untuk login.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-800">
                {ips.map((ip, idx) => (
                  <li key={idx} className="p-4 flex items-center justify-between hover:bg-stone-800/30 transition-colors">
                    <span className="font-mono text-stone-200">{ip}</span>
                    <button
                      onClick={() => handleRemoveIp(ip)}
                      disabled={saving}
                      className="text-stone-500 hover:text-rose-500 p-2 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                      title="Hapus IP"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
