import React, { useState, useEffect } from 'react';
import { Save, Plus, Edit, Trash2, Loader2, AlertTriangle, CheckCircle2, X, HelpCircle } from 'lucide-react';
import { SafeMarkdown } from '../../components/SafeMarkdown';
import { checkMaliciousContent } from '../../utils/security';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export const AdminFAQs: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentFaq, setCurrentFaq] = useState<FAQItem | null>(null);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/faqs');
      const data = await res.json();
      if (data.success) {
        setFaqs((data.data || []).sort((a: FAQItem, b: FAQItem) => a.order - b.order));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentFaq) return;
    
    // Security check
    const checkQ = checkMaliciousContent(currentFaq.question);
    if (checkQ.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkQ.reason}` });
      return;
    }
    const checkA = checkMaliciousContent(currentFaq.answer);
    if (checkA.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkA.reason}` });
      return;
    }

    setSaving(true);
    setMessage(null);

    let updatedFaqs;
    if (faqs.find(f => f.id === currentFaq.id)) {
      updatedFaqs = faqs.map(f => f.id === currentFaq.id ? currentFaq : f).sort((a, b) => a.order - b.order);
    } else {
      updatedFaqs = [...faqs, currentFaq].sort((a, b) => a.order - b.order);
    }

    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(updatedFaqs)
      });
      const data = await res.json();
      if (data.success) {
        setFaqs(updatedFaqs);
        setIsEditing(false);
        setCurrentFaq(null);
        setMessage({ type: 'success', text: 'FAQ berhasil disimpan dan diverifikasi aman.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan FAQ' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus FAQ ini?')) return;
    
    const updatedFaqs = faqs.filter(f => f.id !== id);
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(updatedFaqs)
      });
      const data = await res.json();
      if (data.success) {
        setFaqs(updatedFaqs);
        setMessage({ type: 'success', text: 'FAQ berhasil dihapus' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghapus FAQ' });
    }
  };

  const openNew = () => {
    setCurrentFaq({
      id: Date.now().toString(),
      question: '',
      answer: '',
      order: faqs.length > 0 ? Math.max(...faqs.map(f => f.order)) + 1 : 1
    });
    setIsEditing(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            Manajemen FAQ
          </h1>
          <p className="text-stone-400 mt-1">Kelola daftar pertanyaan yang sering diajukan.</p>
        </div>
        {!isEditing && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Tambah FAQ Baru
          </button>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {isEditing && currentFaq ? (
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">
              {faqs.find(f => f.id === currentFaq.id) ? 'Edit FAQ' : 'Tambah FAQ Baru'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Pertanyaan</label>
              <input
                type="text"
                value={currentFaq.question}
                onChange={e => setCurrentFaq({...currentFaq, question: e.target.value})}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Urutan</label>
              <input
                type="number"
                value={currentFaq.order}
                onChange={e => setCurrentFaq({...currentFaq, order: parseInt(e.target.value) || 0})}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Jawaban (Markdown)</label>
            <textarea
              value={currentFaq.answer}
              onChange={e => setCurrentFaq({...currentFaq, answer: e.target.value})}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 focus:border-rose-500 focus:outline-none font-mono text-sm resize-y h-48"
            />
          </div>
          
          <div className="flex justify-end">
             <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Simpan FAQ
              </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
             <div className="flex justify-center p-12 bg-stone-900 border border-stone-800 rounded-xl"><Loader2 className="w-8 h-8 text-stone-600 animate-spin" /></div>
          ) : faqs.length === 0 ? (
             <div className="p-12 text-center text-stone-400 bg-stone-900 border border-stone-800 rounded-xl">Belum ada FAQ. Tambahkan sekarang!</div>
          ) : (
            faqs.map((faq, index) => (
              <div key={faq.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex items-start gap-4 hover:border-stone-700 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 bg-stone-950 rounded-lg flex items-center justify-center text-stone-400 font-medium">
                  {faq.order}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-stone-200 text-lg mb-2">{faq.question}</h3>
                  <div className="prose prose-invert prose-stone prose-sm max-w-none text-stone-400">
                    <SafeMarkdown>{faq.answer}</SafeMarkdown>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0 ml-4">
                  <button onClick={() => { setCurrentFaq(faq); setIsEditing(true); }} className="p-2 text-stone-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
