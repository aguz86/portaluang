import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Save, CheckCircle2, AlertCircle, RefreshCw, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';

export const AdminAiSettings: React.FC = () => {
  const { settings, updateSettings } = useGlobalSettings();
  const [aiName, setAiName] = useState(settings.aiName || 'Portal Uang Advisor');
  const [aiRoleTitle, setAiRoleTitle] = useState(settings.aiRoleTitle || 'AI Wealth Strategist');
  const [aiTone, setAiTone] = useState(settings.aiTone || 'professional_supportive');
  const [aiSystemPrompt, setAiSystemPrompt] = useState(settings.aiSystemPrompt || '');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync when hook settings change
  useEffect(() => {
    if (settings.aiName) setAiName(settings.aiName);
    if (settings.aiRoleTitle) setAiRoleTitle(settings.aiRoleTitle);
    if (settings.aiTone) setAiTone(settings.aiTone);
    if (settings.aiSystemPrompt) setAiSystemPrompt(settings.aiSystemPrompt);
  }, [settings]);

  // Load latest settings from database
  useEffect(() => {
    const fetchAiSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.aiName) setAiName(data.data.aiName);
          if (data.data.aiRoleTitle) setAiRoleTitle(data.data.aiRoleTitle);
          if (data.data.aiTone) setAiTone(data.data.aiTone);
          if (data.data.aiSystemPrompt) setAiSystemPrompt(data.data.aiSystemPrompt);
        }
      } catch (err) {
        console.error('Failed to load AI settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAiSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const cleanAiName = aiName.trim() || 'Portal Uang Advisor';
    const cleanRoleTitle = aiRoleTitle.trim() || 'AI Wealth Strategist';

    try {
      // 1. Fetch current settings to preserve them
      const getRes = await fetch('/api/admin/settings');
      const curData = await getRes.json();
      const existingSettings = curData.success && curData.data ? curData.data : {};

      const payload = {
        ...existingSettings,
        aiName: cleanAiName,
        aiRoleTitle: cleanRoleTitle,
        aiTone,
        aiSystemPrompt
      };

      // 2. Save to backend database
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // 3. Trigger immediate realtime update across all tabs and hooks
        updateSettings({
          aiName: cleanAiName,
          aiRoleTitle: cleanRoleTitle,
          aiTone,
          aiSystemPrompt
        });

        setMessage({
          type: 'success',
          text: `Nama Asisten AI berhasil diubah menjadi "${cleanAiName}". Perubahan tersinkronisasi secara realtime!`
        });
      } else {
        setMessage({ type: 'error', text: 'Gagal menyimpan perubahan pengaturan AI.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat menyimpan pengaturan.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setAiName('Portal Uang Advisor');
    setAiRoleTitle('AI Wealth Strategist');
    setAiTone('professional_supportive');
    setAiSystemPrompt('');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider mb-1">
          <Bot className="w-4 h-4" />
          <span>Pengaturan Asisten Cerdas</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-100">Kustomisasi Nama & Karakter AI</h1>
        <p className="text-sm text-stone-400 mt-1">
          Ubah nama asisten AI, jabatan/peran, dan personalitas respons secara realtime di seluruh aplikasi klien dan server Gemini.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Live Preview Card */}
      <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 px-3.5 py-1 bg-amber-500/15 border-b border-l border-amber-500/30 rounded-bl-xl text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3" /> Live Preview Realtime
        </div>

        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40 shrink-0">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-stone-100">
                {aiName || 'Portal Uang Advisor'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-semibold">
                {aiRoleTitle || 'AI Wealth Strategist'}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              "Halo! Saya <strong className="text-amber-300">{aiName || 'Portal Uang Advisor'}</strong>, siap membantu menganalisis anggaran berbasis nol, mendeteksi kebocoran pengeluaran, dan menyusun strategi pelunasan hutang Anda."
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Identitas Asisten AI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input AI Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Nama Asisten AI <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Contoh: Portal Uang Advisor, Aura AI, FinBot, Artha AI"
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100 text-sm font-semibold outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1.5">
                Nama ini akan muncul di modal Tanya AI, tombol audit finansial, dan seluruh percakapan.
              </p>
            </div>

            {/* Input Role / Subtitle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                Gelar / Peran AI
              </label>
              <input
                type="text"
                value={aiRoleTitle}
                onChange={(e) => setAiRoleTitle(e.target.value)}
                placeholder="Contoh: AI Wealth Strategist, Konsultan Keuangan Pribadi"
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100 text-sm outline-none transition-all"
              />
              <p className="text-[11px] text-stone-500 mt-1.5">
                Sub-judul atau titel yang mendampingi nama asisten pada header modal AI.
              </p>
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
              Gaya Bahasa & Tone Percakapan
            </label>
            <select
              value={aiTone}
              onChange={(e) => setAiTone(e.target.value)}
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100 text-sm outline-none transition-all"
            >
              <option value="professional_supportive">Profesional & Ramah Mendukung (Direkomendasikan)</option>
              <option value="strict_cfo">Tegas & Berorientasi Efisiensi Ketat (Strict CFO)</option>
              <option value="casual_friendly">Santai, Kasual & Mudah Dipahami Pemula</option>
              <option value="academic_analytic">Mendalam & Analitis Berbasis Angka</option>
            </select>
          </div>

          {/* Custom Prompt Override */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5 flex items-center justify-between">
              <span>Instruksi Tambahan (System Prompt Persona)</span>
              <span className="text-[10px] text-stone-500 font-normal lowercase">(opsional)</span>
            </label>
            <textarea
              value={aiSystemPrompt}
              onChange={(e) => setAiSystemPrompt(e.target.value)}
              rows={3}
              placeholder="Instruksi khusus tambahan untuk kepribadian AI, misalnya: Selalu beri analogi menabung yang menyenangkan dan prioritaskan dana darurat 6 bulan..."
              className="w-full px-4 py-3 bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl text-stone-100 text-xs font-mono outline-none transition-all"
            />
          </div>
        </div>

        {/* Realtime Integration Status */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-stone-200">Sinkronisasi Realtime Otomatis Aktif</p>
              <p className="text-[11px] text-stone-400">
                Setiap perubahan langsung disiarkan ke server Gemini & seluruh sesi pengguna yang aktif.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetDefault}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Default
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-rose-500/20 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan AI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
