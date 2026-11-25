import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  Bold,
  Italic,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  List,
  ListOrdered,
  Eye,
  Maximize2,
  Minimize2,
  Heading2,
  Heading3,
  Quote,
  Table,
  CheckSquare,
  Layers,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkMaliciousContent, isSafeUrl } from '../../utils/security';
import { SafeMarkdown } from '../../components/SafeMarkdown';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  category?: string;
  author?: string;
  readingTime?: number;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt?: string;
  status: 'draft' | 'published';
  source?: 'local' | 'payload';
}

const DRAFT_KEY_PREFIX = 'pu_draft_post_';

export const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [recoverableDraft, setRecoverableDraft] = useState<BlogPost | null>(null);

  const getToken = () => localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Autosave current editing draft locally for crash-proof long-form writing
  useEffect(() => {
    if (!isEditing || !currentPost || currentPost.source === 'payload') return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`${DRAFT_KEY_PREFIX}${currentPost.id}`, JSON.stringify(currentPost));
        setLastAutosaved(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {
        // ignore storage quota errors
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [isEditing, currentPost]);

  const wordCount = useMemo(() => {
    const text = (currentPost?.content || '').trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [currentPost?.content]);

  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const headings = useMemo(() => {
    const lines = (currentPost?.content || '').split('\n');
    return lines
      .map((line) => {
        const m = line.match(/^(#{1,3})\s+(.+)/);
        if (!m) return null;
        return { level: m[1].length, text: m[2].replace(/[*_`]/g, '').trim() };
      })
      .filter(Boolean) as Array<{ level: number; text: string }>;
  }, [currentPost?.content]);

  const startEditingPost = (post: BlogPost) => {
    setMessage(null);
    setRecoverableDraft(null);
    try {
      const savedRaw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${post.id}`);
      if (savedRaw) {
        const parsed: BlogPost = JSON.parse(savedRaw);
        if (parsed.content !== post.content || parsed.title !== post.title) {
          setRecoverableDraft(parsed);
        }
      }
    } catch {
      // ignore
    }
    setCurrentPost({
      category: 'Edukasi Finansial',
      author: 'Tim Portal Uang',
      ...post,
    });
    setIsEditing(true);
  };

  const openNew = () => {
    const newPost: BlogPost = {
      id: Date.now().toString(),
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      coverImage: '',
      category: 'Edukasi Finansial',
      author: 'Tim Portal Uang',
      seoTitle: '',
      seoDescription: '',
      createdAt: new Date().toISOString(),
      status: 'draft',
      source: 'local',
    };
    setCurrentPost(newPost);
    setRecoverableDraft(null);
    setLastAutosaved(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentPost) return;

    const checkFields = [currentPost.title, currentPost.content, currentPost.excerpt, currentPost.seoTitle, currentPost.seoDescription];
    for (const field of checkFields) {
      if (!field) continue;
      const checkRes = checkMaliciousContent(field);
      if (checkRes.isMalicious) {
        setMessage({ type: 'error', text: `Keamanan: ${checkRes.reason}` });
        return;
      }
    }

    if (currentPost.coverImage && !isSafeUrl(currentPost.coverImage)) {
      setMessage({ type: 'error', text: 'URL Gambar Cover tidak valid. Gunakan protokol http:// atau https://.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const postToSave: BlogPost = {
      ...currentPost,
      slug:
        currentPost.slug ||
        currentPost.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      readingTime: estimatedMinutes,
      updatedAt: new Date().toISOString(),
      source: 'local',
    };

    const localOnlyPosts = posts.filter((p) => p.source !== 'payload');
    const updatedLocalPosts = localOnlyPosts.find((p) => p.id === postToSave.id)
      ? localOnlyPosts.map((p) => (p.id === postToSave.id ? postToSave : p))
      : [postToSave, ...localOnlyPosts];

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(updatedLocalPosts),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.removeItem(`${DRAFT_KEY_PREFIX}${postToSave.id}`);
        } catch {
          // ignore
        }
        await fetchPosts();
        setIsEditing(false);
        setFocusMode(false);
        setCurrentPost(null);
        setMessage({ type: 'success', text: 'Artikel berhasil disimpan dan diverifikasi aman.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan artikel' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus artikel lokal ini?')) return;

    const updatedLocalPosts = posts.filter((p) => p.source !== 'payload' && p.id !== id);
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(updatedLocalPosts),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPosts();
        setMessage({ type: 'success', text: 'Artikel berhasil dihapus.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal menghapus artikel.' });
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (!textarea || !currentPost) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentPost.content;
    const selectedText = text.substring(start, end);

    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setCurrentPost({ ...currentPost, content: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertImagePrompt = () => {
    const url = prompt('Masukkan URL gambar (https://...):');
    if (url && isSafeUrl(url)) {
      const alt = prompt('Deskripsi singkat gambar (alt text):') || 'Ilustrasi Artikel';
      insertText(`\n![${alt}](${url})\n`);
    } else if (url) {
      setMessage({ type: 'error', text: 'URL gambar tidak valid. Gunakan URL http:// atau https://.' });
    }
  };

  return (
    <div className={focusMode && isEditing ? 'fixed inset-0 z-50 bg-stone-950 overflow-y-auto p-4 sm:p-6' : 'space-y-6'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            Studio Artikel & Blog
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Editor artikel panjang dengan autosave draft lokal, outline heading, pratinjau langsung, dan integrasi Payload CMS.
          </p>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2.5">
            <Link
              to="/admin/cms"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 text-xs font-bold transition-colors"
            >
              <Layers className="w-4 h-4 text-amber-400" />
              Payload CMS
            </Link>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold px-4 py-2 rounded-xl transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Tulis Artikel Baru
            </button>
          </div>
        )}
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

      {isEditing && currentPost ? (
        <div className="bg-stone-900 border border-stone-800 p-5 sm:p-6 rounded-2xl space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-stone-800 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                {posts.find((p) => p.id === currentPost.id) ? 'Edit Artikel' : 'Tulis Artikel Baru'}
              </h2>
              <span className="text-xs text-stone-400 bg-stone-950 border border-stone-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {wordCount} kata • ~{estimatedMinutes} mnt baca
              </span>
              {lastAutosaved && (
                <span className="text-[11px] text-emerald-400 font-medium">
                  Draft tersimpan otomatis ({lastAutosaved})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 ${
                  showPreview
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-stone-950 border-stone-800 text-stone-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Pratinjau
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-950 border border-stone-800 text-stone-300 hover:text-white inline-flex items-center gap-1.5"
              >
                {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {focusMode ? 'Keluar Fokus' : 'Mode Fokus'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFocusMode(false);
                }}
                className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {currentPost.source === 'payload' && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <span>
                Artikel ini disinkronkan dari <strong>Payload CMS</strong>. Untuk edit permanen, perbarui langsung di dashboard Payload CMS lalu klik Sync agar tidak tertimpa saat webhook berjalan.
              </span>
              <Link to="/admin/cms" className="font-bold underline shrink-0">
                Buka Payload Hub
              </Link>
            </div>
          )}

          {recoverableDraft && (
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <span>Ditemukan draft lokal yang belum tersimpan ke server untuk artikel ini.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPost(recoverableDraft);
                    setRecoverableDraft(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 text-stone-950 font-bold inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Pulihkan Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(`${DRAFT_KEY_PREFIX}${currentPost.id}`);
                    setRecoverableDraft(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 text-stone-300"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Judul Artikel</label>
              <input
                type="text"
                value={currentPost.title}
                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                placeholder="Misal: Panduan Lengkap Zero-Based Budgeting Untuk Karyawan"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Slug URL</label>
              <input
                type="text"
                value={currentPost.slug}
                onChange={(e) => setCurrentPost({ ...currentPost, slug: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
                placeholder="panduan-zero-based-budgeting"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Kategori</label>
              <input
                type="text"
                value={currentPost.category || ''}
                onChange={(e) => setCurrentPost({ ...currentPost, category: e.target.value })}
                placeholder="Edukasi Finansial / Tips Hemat / Investasi"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Penulis</label>
              <input
                type="text"
                value={currentPost.author || ''}
                onChange={(e) => setCurrentPost({ ...currentPost, author: e.target.value })}
                placeholder="Tim Portal Uang"
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">URL Gambar Cover (Opsional)</label>
              <input
                type="url"
                value={currentPost.coverImage || ''}
                onChange={(e) => setCurrentPost({ ...currentPost, coverImage: e.target.value })}
                placeholder="https://..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Ringkasan (Excerpt)</label>
            <textarea
              value={currentPost.excerpt}
              onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
              placeholder="Ringkasan singkat artikel untuk kartu pratinjau dan SEO..."
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:border-rose-500 focus:outline-none resize-none h-20"
            />
          </div>

          {/* Long-form Editor + Split Live Preview */}
          <div className={`grid grid-cols-1 ${showPreview ? 'lg:grid-cols-2' : ''} gap-5`}>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                Konten Artikel Panjang (Markdown & Tabel GFM)
              </label>
              <div className="flex flex-wrap gap-1 bg-stone-950 border border-stone-800 p-1.5 rounded-lg">
                <button type="button" onClick={() => insertText('\n## ')} title="Heading 2" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Heading2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('\n### ')} title="Heading 3" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Heading3 className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-stone-800 mx-1 self-center" />
                <button type="button" onClick={() => insertText('**', '**')} title="Bold" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('_', '_')} title="Italic" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('\n> ')} title="Kutipan / Callout" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Quote className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-stone-800 mx-1 self-center" />
                <button type="button" onClick={() => insertText('[', '](https://)')} title="Tautan" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><LinkIcon className="w-4 h-4" /></button>
                <button type="button" onClick={insertImagePrompt} title="Sisipkan Gambar" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><ImageIcon className="w-4 h-4" /></button>
                <div className="w-px h-6 bg-stone-800 mx-1 self-center" />
                <button type="button" onClick={() => insertText('\n- ')} title="Daftar Poin" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('\n1. ')} title="Daftar Bernomor" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><ListOrdered className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertText('\n- [ ] ')} title="Checklist" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><CheckSquare className="w-4 h-4" /></button>
                <button
                  type="button"
                  onClick={() =>
                    insertText('\n| Aspek | Keterangan | Target |\n| --- | --- | --- |\n| Dana Darurat | 6x Pengeluaran | Terpenuhi |\n')
                  }
                  title="Sisipkan Tabel"
                  className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"
                >
                  <Table className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => insertText('`', '`')} title="Inline Code" className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded"><Code className="w-4 h-4" /></button>
              </div>
              <textarea
                id="content-textarea"
                value={currentPost.content}
                onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
                placeholder="## Pendahuluan&#10;Tulis artikel atau panduan mendalam di sini..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 focus:border-rose-500 focus:outline-none font-mono text-sm resize-y h-[480px] custom-scrollbar leading-relaxed"
              />
            </div>

            {showPreview && (
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 h-[560px] overflow-y-auto custom-scrollbar space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-800 pb-2 flex items-center justify-between">
                  <span>Pratinjau Artikel</span>
                  {headings.length > 0 && <span>{headings.length} Sub-judul terdeteksi</span>}
                </div>
                {currentPost.coverImage && isSafeUrl(currentPost.coverImage) && (
                  <img
                    src={currentPost.coverImage}
                    alt={currentPost.title}
                    className="w-full h-44 object-cover rounded-xl border border-stone-800"
                  />
                )}
                {currentPost.title && <h1 className="text-2xl font-black text-white">{currentPost.title}</h1>}
                <div className="prose prose-invert prose-stone max-w-none prose-headings:text-stone-100">
                  <SafeMarkdown>{currentPost.content || '*Pratinjau konten artikel panjang akan muncul di sini...*'}</SafeMarkdown>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-stone-800">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1 uppercase tracking-wider">Status Publikasi</label>
              <select
                value={currentPost.status}
                onChange={(e) => setCurrentPost({ ...currentPost, status: e.target.value as 'draft' | 'published' })}
                className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="draft">Draft (Belum Tayang)</option>
                <option value="published">Diterbitkan (Live)</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFocusMode(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || currentPost.source === 'payload'}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Artikel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-stone-400">Belum ada artikel. Tambahkan sekarang atau hubungkan Payload CMS!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-950/50 border-b border-stone-800 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Judul & Kategori</th>
                    <th className="px-6 py-4 font-medium">Sumber</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-stone-850 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-200">{post.title}</p>
                        <p className="text-xs text-stone-500 mt-1 truncate max-w-md">
                          /{post.slug} • {post.category || 'Umum'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {post.source === 'payload' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Payload CMS
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-800 text-stone-300">
                            Studio Lokal
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-stone-800 text-stone-400'
                          }`}
                        >
                          {post.status === 'published' ? 'Terbit' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-400">
                        {new Date(post.createdAt).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEditingPost(post)}
                            className="p-2 text-stone-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                            title="Edit / Lihat"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {post.source !== 'payload' && (
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
