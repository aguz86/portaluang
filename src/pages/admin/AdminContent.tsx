import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  FileEdit,
  LayoutTemplate,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Table,
  History,
  RotateCcw,
  Maximize2,
  Minimize2,
  BookOpen,
  Plus,
  Trash2,
  Layers,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafeMarkdown } from '../../components/SafeMarkdown';
import { checkMaliciousContent, isSafeUrl } from '../../utils/security';
import { GUIDE_CHAPTERS, GuideTopic } from '../../data/guideContent';

const PAGES = [
  { id: 'about', label: 'Tentang Kami' },
  { id: 'features', label: 'Halaman Fitur' },
  { id: 'blog', label: 'Header Blog' },
  { id: 'faq', label: 'Header FAQ' },
  { id: 'privacy', label: 'Kebijakan Privasi' },
  { id: 'terms', label: 'Syarat Ketentuan' },
];

interface RevisionItem {
  id: string;
  savedAt: string;
  title: string;
  content: string;
  summary?: string;
}

interface EditableGuide extends GuideTopic {
  markdownContent?: string;
  actionRoute?: string;
  source?: 'local' | 'payload';
}

export const AdminContent: React.FC = () => {
  const [sectionTab, setSectionTab] = useState<'pages' | 'guides'>('pages');

  // --- Static / Long-form Pages State ---
  const [activePage, setActivePage] = useState(PAGES[0].id);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [pageSource, setPageSource] = useState<'local' | 'payload'>('local');
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [recoverableDraft, setRecoverableDraft] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Long-form Guides State ---
  const [guides, setGuides] = useState<EditableGuide[]>([]);
  const [selectedGuideIdx, setSelectedGuideIdx] = useState<number>(0);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [savingGuides, setSavingGuides] = useState(false);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  useEffect(() => {
    if (sectionTab === 'pages') {
      fetchContent(activePage);
    } else {
      fetchGuides();
    }
  }, [activePage, sectionTab]);

  // Autosave local draft for active page
  useEffect(() => {
    if (sectionTab !== 'pages' || loading || pageSource === 'payload') return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`pu_draft_page_${activePage}`, JSON.stringify({ title, content }));
        setLastAutosaved(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {
        // ignore
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [sectionTab, activePage, title, content, loading, pageSource]);

  const wordCount = useMemo(() => {
    const t = content.trim();
    return t ? t.split(/\s+/).filter(Boolean).length : 0;
  }, [content]);

  const fetchContent = async (pageId: string) => {
    setLoading(true);
    setMessage(null);
    setRecoverableDraft(null);
    setLastAutosaved(null);
    try {
      const [contentRes, revRes] = await Promise.all([
        fetch(`/api/content/${pageId}`),
        fetch(`/api/admin/content/${pageId}/revisions`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);
      const data = await contentRes.json();
      const loadedTitle = data.success && data.data ? data.data.title || '' : '';
      const loadedContent = data.success && data.data ? data.data.content || '' : '';
      setTitle(loadedTitle);
      setContent(loadedContent);
      setPageSource(data.source === 'payload' ? 'payload' : 'local');

      if (revRes.ok) {
        const revData = await revRes.json();
        setRevisions(revData.success && Array.isArray(revData.data) ? revData.data : []);
      }

      try {
        const localRaw = localStorage.getItem(`pu_draft_page_${pageId}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if ((parsed.content && parsed.content !== loadedContent) || (parsed.title && parsed.title !== loadedTitle)) {
            setRecoverableDraft(parsed);
          }
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal mengambil konten halaman.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGuides = async () => {
    setLoadingGuides(true);
    try {
      const res = await fetch('/api/guides');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setGuides(
          data.data.map((g: any) => ({
            ...g,
            markdownContent: g.markdownContent || (Array.isArray(g.content) ? g.content.join('\n\n') : ''),
          }))
        );
      } else {
        setGuides(
          GUIDE_CHAPTERS.map((ch) => ({
            ...ch,
            markdownContent: ch.content.join('\n\n'),
            source: 'local',
          }))
        );
      }
      setSelectedGuideIdx(0);
    } catch {
      setGuides(
        GUIDE_CHAPTERS.map((ch) => ({
          ...ch,
          markdownContent: ch.content.join('\n\n'),
          source: 'local',
        }))
      );
    } finally {
      setLoadingGuides(false);
    }
  };

  const handleSave = async () => {
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
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.removeItem(`pu_draft_page_${activePage}`);
        } catch {
          // ignore
        }
        setRecoverableDraft(null);
        setMessage({ type: 'success', text: 'Konten berhasil disimpan beserta snapshot riwayat revisi.' });
        fetchContent(activePage);
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan konten' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGuides = async () => {
    const localGuides = guides
      .filter((g) => g.source !== 'payload')
      .map((g) => ({
        ...g,
        content: (g.markdownContent || '').split(/\n{2,}/).filter(Boolean),
      }));

    const check = checkMaliciousContent(JSON.stringify(localGuides));
    if (check.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${check.reason}` });
      return;
    }

    setSavingGuides(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(localGuides),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Seluruh bab Panduan Panjang berhasil disimpan ke Supabase.' });
        fetchGuides();
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan panduan.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghubungi server.' });
    } finally {
      setSavingGuides(false);
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
    const url = prompt('Masukkan URL gambar (https://...):');
    if (url && isSafeUrl(url)) {
      const alt = prompt('Deskripsi singkat gambar:') || 'Gambar';
      insertText(`\n![${alt}](${url})\n`);
    } else if (url) {
      setMessage({ type: 'error', text: 'URL gambar tidak valid.' });
    }
  };

  const activeGuide = guides[selectedGuideIdx];

  return (
    <div className={focusMode && sectionTab === 'pages' ? 'fixed inset-0 z-50 bg-stone-950 overflow-y-auto p-4 sm:p-6' : 'space-y-6'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-rose-500" />
            Manajemen Halaman & Panduan Panjang
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Kelola halaman Tentang Kami, Privasi, S&amp;K, serta Bab Panduan Finansial panjang dengan riwayat revisi &amp; autosave.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSectionTab('pages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              sectionTab === 'pages' ? 'bg-rose-500 text-stone-950' : 'bg-stone-900 border border-stone-800 text-stone-300'
            }`}
          >
            Halaman Publik
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('guides')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
              sectionTab === 'guides' ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 border border-stone-800 text-stone-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Panduan Panjang (/app/guide)
          </button>
          <Link
            to="/admin/cms"
            className="px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Payload CMS
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {sectionTab === 'pages' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {PAGES.map((page) => (
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRevisions(!showRevisions)}
                className="px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                Riwayat Revisi ({revisions.length})
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className="px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-300 text-xs font-bold inline-flex items-center gap-1.5"
              >
                {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {focusMode ? 'Keluar Fokus' : 'Mode Fokus'}
              </button>
            </div>
          </div>

          {pageSource === 'payload' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <span>
                Halaman ini sedang menggunakan konten sinkronisasi dari <strong>Payload CMS</strong>. Edit di Payload CMS lalu jalankan Sync untuk memperbarui versi publik, atau ubah prioritas CMS ke Mode Lokal di menu Payload CMS.
              </span>
              <Link to="/admin/cms" className="font-bold underline shrink-0">
                Pengaturan Payload CMS
              </Link>
            </div>
          )}

          {recoverableDraft && (
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <span>Tersedia draft lokal yang belum tersimpan ke server untuk halaman ini.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTitle(recoverableDraft.title);
                    setContent(recoverableDraft.content);
                    setRecoverableDraft(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 text-stone-950 font-bold inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Pulihkan Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(`pu_draft_page_${activePage}`);
                    setRecoverableDraft(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 text-stone-300"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {showRevisions && revisions.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
                10 Versi Revisi Sebelumnya (Klik Pulihkan untuk mengembalikan ke editor)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-stone-200 truncate">{rev.title || '(Tanpa Judul)'}</div>
                      <div className="text-[11px] text-stone-500">
                        {new Date(rev.savedAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTitle(rev.title);
                        setContent(rev.content);
                        setShowRevisions(false);
                        setMessage({ type: 'success', text: 'Revisi dipulihkan ke editor. Klik Simpan Perubahan untuk mempublikasikan.' });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold shrink-0"
                    >
                      Pulihkan
                    </button>
                  </div>
                ))}
              </div>
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                      Judul Halaman
                    </label>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{wordCount} kata</span>
                      {lastAutosaved && <span className="text-emerald-400">• Autosave {lastAutosaved}</span>}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Misal: Tentang Portal Uang"
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:outline-none focus:border-rose-500 transition-colors mb-4"
                  />

                  <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1.5">
                    Konten Halaman (Markdown + Tabel GFM)
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2 bg-stone-950 border border-stone-800 p-1.5 rounded-lg">
                    <button type="button" onClick={() => insertText('\n## ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Heading2 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('\n### ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Heading3 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('**', '**')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Bold className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('_', '_')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Italic className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('\n> ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Quote className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-stone-800 mx-1 self-center" />
                    <button type="button" onClick={() => insertText('[', '](https://)')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><LinkIcon className="w-4 h-4" /></button>
                    <button type="button" onClick={insertImagePrompt} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><ImageIcon className="w-4 h-4" /></button>
                    <div className="w-px h-6 bg-stone-800 mx-1 self-center" />
                    <button type="button" onClick={() => insertText('\n- ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><List className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('\n1. ')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><ListOrdered className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('\n| Kolom 1 | Kolom 2 |\n| --- | --- |\n| Isi 1 | Isi 2 |\n')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Table className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertText('`', '`')} className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Code className="w-4 h-4" /></button>
                  </div>
                  <textarea
                    id="content-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="## Subjudul&#10;Tulis konten halaman panjang Anda di sini..."
                    className="w-full h-[500px] bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 focus:outline-none focus:border-rose-500 transition-colors font-mono text-sm resize-y custom-scrollbar leading-relaxed"
                  />

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-semibold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl hidden lg:block overflow-y-auto max-h-[720px] custom-scrollbar">
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
        </>
      ) : (
        /* TAB 2: LONG-FORM GUIDES STUDIO (/app/guide) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-100">Daftar Bab Panduan</h3>
              <button
                type="button"
                onClick={() => {
                  const nextNum = guides.length + 1;
                  const newGuide: EditableGuide = {
                    id: `ch-${Date.now()}`,
                    chapterNumber: nextNum,
                    title: `Bab ${nextNum}: Panduan Baru`,
                    category: 'Dasar Finansial',
                    readTimeMinutes: 5,
                    summary: 'Ringkasan panduan...',
                    content: [],
                    markdownContent: '## Pendahuluan\n\nTulis panduan lengkap di sini...',
                    keyTakeaways: ['Poin penting pertama'],
                    actionableStep: 'Buka menu terkait di Dashboard.',
                    actionRoute: '/app/dashboard',
                    source: 'local',
                  };
                  setGuides([...guides, newGuide]);
                  setSelectedGuideIdx(guides.length);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Bab Baru
              </button>
            </div>

            {loadingGuides ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="w-6 h-6 text-stone-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {guides.map((g, idx) => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGuideIdx(idx)}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedGuideIdx === idx
                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mb-1">
                      <span>BAB {g.chapterNumber} • {g.category}</span>
                      {g.source === 'payload' && <span className="text-amber-400 font-bold">PAYLOAD</span>}
                    </div>
                    <div className="text-xs font-bold">{g.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            {activeGuide ? (
              <>
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="text-base font-bold text-white">Edit Bab {activeGuide.chapterNumber}</h3>
                  {activeGuide.source !== 'payload' && (
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = guides.filter((_, i) => i !== selectedGuideIdx);
                        setGuides(filtered);
                        setSelectedGuideIdx(Math.max(0, selectedGuideIdx - 1));
                      }}
                      className="text-xs text-rose-400 hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Bab
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Judul Panduan</label>
                    <input
                      type="text"
                      value={activeGuide.title}
                      onChange={(e) => {
                        const next = [...guides];
                        next[selectedGuideIdx] = { ...activeGuide, title: e.target.value };
                        setGuides(next);
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Kategori</label>
                    <input
                      type="text"
                      value={activeGuide.category}
                      onChange={(e) => {
                        const next = [...guides];
                        next[selectedGuideIdx] = { ...activeGuide, category: e.target.value as any };
                        setGuides(next);
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Ringkasan Singkat</label>
                  <input
                    type="text"
                    value={activeGuide.summary}
                    onChange={(e) => {
                      const next = [...guides];
                      next[selectedGuideIdx] = { ...activeGuide, summary: e.target.value };
                      setGuides(next);
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sm text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Isi Panduan Panjang (Markdown)</label>
                  <textarea
                    rows={12}
                    value={activeGuide.markdownContent || ''}
                    onChange={(e) => {
                      const next = [...guides];
                      next[selectedGuideIdx] = { ...activeGuide, markdownContent: e.target.value };
                      setGuides(next);
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm font-mono text-stone-100 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Poin Penting (1 baris per poin)</label>
                    <textarea
                      rows={4}
                      value={(activeGuide.keyTakeaways || []).join('\n')}
                      onChange={(e) => {
                        const next = [...guides];
                        next[selectedGuideIdx] = {
                          ...activeGuide,
                          keyTakeaways: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                        };
                        setGuides(next);
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Langkah Aksi</label>
                      <input
                        type="text"
                        value={activeGuide.actionableStep}
                        onChange={(e) => {
                          const next = [...guides];
                          next[selectedGuideIdx] = { ...activeGuide, actionableStep: e.target.value };
                          setGuides(next);
                        }}
                        className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">No. Bab</label>
                        <input
                          type="number"
                          min={1}
                          value={activeGuide.chapterNumber}
                          onChange={(e) => {
                            const next = [...guides];
                            next[selectedGuideIdx] = { ...activeGuide, chapterNumber: Number(e.target.value) || 1 };
                            setGuides(next);
                          }}
                          className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Menit Baca</label>
                        <input
                          type="number"
                          min={1}
                          value={activeGuide.readTimeMinutes}
                          onChange={(e) => {
                            const next = [...guides];
                            next[selectedGuideIdx] = { ...activeGuide, readTimeMinutes: Number(e.target.value) || 1 };
                            setGuides(next);
                          }}
                          className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={handleSaveGuides}
                    disabled={savingGuides}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-xs rounded-xl"
                  >
                    {savingGuides ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Semua Bab Panduan
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-stone-500">Pilih atau tambah bab panduan di sebelah kiri.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
