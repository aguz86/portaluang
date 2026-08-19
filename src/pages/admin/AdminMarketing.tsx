import React, { useState, useEffect } from 'react';
import { Save, Megaphone, Timer, PlusCircle } from 'lucide-react';
import { checkMaliciousContent } from '../../utils/security';

export const AdminMarketing: React.FC = () => {
  const [headline, setHeadline] = useState('Otomatiskan Keuangan Anda Sepenuhnya');
  const [subHeadline, setSubHeadline] = useState('Dapatkan akses tak terbatas ke semua fitur premium, sinkronisasi cloud, dan wawasan AI.');
  
  // Scarcity
  const [scarcityEnabled, setScarcityEnabled] = useState(false);
  const [scarcityText, setScarcityText] = useState('Hanya tersisa 3 slot dengan harga promo!');
  const [countdownMinutes, setCountdownMinutes] = useState(15);

  // Order Bump
  const [bumpEnabled, setBumpEnabled] = useState(false);
  const [bumpTitle, setBumpTitle] = useState('Ya, Tambahkan Sesi Konsultasi 1-on-1 (30 Menit)');
  const [bumpDescription, setBumpDescription] = useState('Dapatkan review langsung tentang kondisi keuangan Anda bersama tim ahli kami.');
  const [bumpPrice, setBumpPrice] = useState(99000);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('/api/admin/marketing', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success && data.data) {
          const d = data.data;
          if (d.headline) setHeadline(d.headline);
          if (d.subHeadline) setSubHeadline(d.subHeadline);
          if (d.scarcityEnabled !== undefined) setScarcityEnabled(d.scarcityEnabled);
          if (d.scarcityText) setScarcityText(d.scarcityText);
          if (d.countdownMinutes) setCountdownMinutes(d.countdownMinutes);
          if (d.bumpEnabled !== undefined) setBumpEnabled(d.bumpEnabled);
          if (d.bumpTitle) setBumpTitle(d.bumpTitle);
          if (d.bumpDescription) setBumpDescription(d.bumpDescription);
          if (d.bumpPrice) setBumpPrice(d.bumpPrice);
        }
      } catch (err) {
        console.error('Failed to fetch marketing settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Security check against malicious / gambling / phishing text injection
    const fieldsToCheck = [headline, subHeadline, scarcityText, bumpTitle, bumpDescription];
    for (const val of fieldsToCheck) {
      if (val) {
        const check = checkMaliciousContent(val);
        if (check.isMalicious) {
          alert(`Peringatan Keamanan: ${check.reason}`);
          return;
        }
      }
    }

    try {
      const payload = {
        headline,
        subHeadline,
        scarcityEnabled,
        scarcityText,
        countdownMinutes,
        bumpEnabled,
        bumpTitle,
        bumpDescription,
        bumpPrice
      };
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Pengaturan marketing berhasil disimpan dan diverifikasi aman!');
      } else {
        alert('Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      alert('Error menyimpan pengaturan.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Marketing & Landing Page</h1>
        <p className="text-sm text-stone-400 mt-1">Configure landing page copywriting, scarcity, and order bumps.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Copywriting */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" /> Copywriting (Pro Landing)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300">Headline</label>
              <input type="text" value={headline} onChange={e => setHeadline(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300">Sub-Headline</label>
              <textarea value={subHeadline} onChange={e => setSubHeadline(e.target.value)} rows={3} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
            </div>
          </div>
        </div>

        {/* Scarcity */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <Timer className="w-5 h-5 text-rose-500" /> Scarcity & Urgency
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={scarcityEnabled} onChange={e => setScarcityEnabled(e.target.checked)} className="w-4 h-4 text-rose-500 rounded border-stone-700 bg-stone-900" />
              <span className="text-sm text-stone-300 font-medium">Enable</span>
            </label>
          </div>
          
          {scarcityEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300">Scarcity Text</label>
                <input type="text" value={scarcityText} onChange={e => setScarcityText(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300">Countdown Timer (Minutes)</label>
                <input type="number" value={countdownMinutes} onChange={e => setCountdownMinutes(parseInt(e.target.value))} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
              </div>
            </div>
          )}
        </div>

        {/* Order Bump */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" /> Order Bump
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={bumpEnabled} onChange={e => setBumpEnabled(e.target.checked)} className="w-4 h-4 text-emerald-500 rounded border-stone-700 bg-stone-900" />
              <span className="text-sm text-stone-300 font-medium">Enable</span>
            </label>
          </div>

          {bumpEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300">Bump Title</label>
                <input type="text" value={bumpTitle} onChange={e => setBumpTitle(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300">Bump Description</label>
                <textarea value={bumpDescription} onChange={e => setBumpDescription(e.target.value)} rows={2} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300">Price (IDR)</label>
                <input type="number" value={bumpPrice} onChange={e => setBumpPrice(parseInt(e.target.value))} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors">
            <Save className="w-5 h-5" /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
