import React, { useState, useEffect } from 'react';
import { Save, FileEdit, LayoutTemplate, Loader2, AlertTriangle, CheckCircle2, Bold, Italic, Link as LinkIcon, Image as ImageIcon, Code, List, ListOrdered } from 'lucide-react';
import { SafeMarkdown } from '../../components/SafeMarkdown';
import { checkMaliciousContent } from '../../utils/security';

const PAGES = [
  { id: 'about', label: 'Tentang Kami' },
  { id: 'blog', label: 'Blog' },
  { id: 'faq', label: 'FAQ' },
  { id: 'privacy', label: 'Kebijakan Privasi' },
  { id: 'terms', label: 'Syarat Ketentuan' },
];

export const AdminContent: React.FC = () => {
  const [activePage, setActivePage] = useState(PAGES[0].id);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  useEffect(() => {
    fetchContent(activePage);
  }, [activePage]);

  const fetchContent = async (pageId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/content/${pageId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setContent(data.data.content || '');
        setTitle(data.data.title || '');
      } else {
        // Initialize with default template if not found
        setContent('');
        setTitle('');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal mengambil konten' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Security check against gambling, phishing, and XSS injection
    const checkTitle = checkMaliciousContent(title);
    if (checkTitle.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkTitle.reason}` });
      return;
    }
    const checkBody = checkMaliciousContent(content);
    if (checkBody.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkBody.reason}` });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/content/${activePage}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Konten berhasil disimpan dan diverifikasi aman.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan konten' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };


  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = content;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };
  
  const insertImagePrompt = () => {
    const url = prompt('Masukkan URL gambar:');
    if (url) {
      const width = prompt('Masukkan lebar gambar (opsional, misal: 100%, 500px):');
      const height = prompt('Masukkan tinggi gambar (opsional, misal: 100%, 500px):');
      let imgTag = '<img src="' + url + '" alt="Gambar"';
      if (width) imgTag += ' width="' + width + '"';
      if (height) imgTag += ' height="' + height + '"';
      imgTag += ' />';
      insertText(imgTag);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-rose-500" />
            Manajemen Konten
          </h1>
          <p className="text-stone-400 mt-1">Edit halaman publik website Anda menggunakan format Markdown.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PAGES.map(page => (
          <button
            key={page.id}
            onClick={() => setActivePage(page.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activePage === page.id 
                ? 'bg-rose-500 text-stone-950 shadow-md' 
                : 'bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl">
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">
                Judul Halaman
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Misal: Tentang Portal Uang"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:outline-none focus:border-rose-500 transition-colors mb-4"
              />
              

              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                  Konten (Markdown)
                </label>
              </div>
              <div className="flex flex-wrap gap-1 mb-2 bg-stone-950 border border-stone-800 p-1.5 rounded-lg">
                <button type="button" onClick={() => insertText('**', '**')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('_', '_')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Italic className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-stone-800 mx-1 self-center"></div>
                <button type="button" onClick={() => insertText('[', '](url)')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><LinkIcon className="w-4 h-4" /></button>
                <button type="button" onClick={insertImagePrompt} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><ImageIcon className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-stone-800 mx-1 self-center"></div>
                <button type="button" onClick={() => insertText('\n- ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('\n1. ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><ListOrdered className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-stone-800 mx-1 self-center"></div>
                <button type="button" onClick={() => insertText('`', '`')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Code className="w-4 h-4" /></button>
              </div>
              <textarea
                id="content-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="# Heading 1\nTulis konten Anda di sini..."
                className="w-full h-[500px] bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 focus:outline-none focus:border-rose-500 transition-colors font-mono text-sm resize-y custom-scrollbar"
              />

              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-semibold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl hidden lg:block overflow-y-auto max-h-[700px] custom-scrollbar">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-stone-800 text-stone-400">
              <LayoutTemplate className="w-5 h-5" />
              <h3 className="font-medium">Pratinjau Hasil</h3>
            </div>
            
            <div className="prose prose-invert prose-rose max-w-none">
              {title && <h1>{title}</h1>}
              <SafeMarkdown>{content || '*Pratinjau akan muncul di sini...*'}</SafeMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
