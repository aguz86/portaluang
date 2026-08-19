import React, { useState, useEffect } from 'react';
import { Save, Plus, Edit, Trash2, Loader2, AlertTriangle, CheckCircle2, X, Bold, Italic, Link as LinkIcon, Image as ImageIcon, Code, List, ListOrdered } from 'lucide-react';
import { checkMaliciousContent } from '../../utils/security';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  createdAt: string;
  status: 'draft' | 'published';
}

export const AdminPosts: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);

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

  const handleSave = async () => {
    if (!currentPost) return;

    // Security check against gambling/phishing/XSS injection
    const checkTitle = checkMaliciousContent(currentPost.title);
    if (checkTitle.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkTitle.reason}` });
      return;
    }
    const checkContent = checkMaliciousContent(currentPost.content);
    if (checkContent.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkContent.reason}` });
      return;
    }
    const checkExcerpt = checkMaliciousContent(currentPost.excerpt);
    if (checkExcerpt.isMalicious) {
      setMessage({ type: 'error', text: `Keamanan: ${checkExcerpt.reason}` });
      return;
    }

    setSaving(true);
    setMessage(null);
    
    // Auto-generate slug if empty
    let postToSave = { ...currentPost };
    if (!postToSave.slug) {
      postToSave.slug = postToSave.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    let updatedPosts;
    if (posts.find(p => p.id === postToSave.id)) {
      updatedPosts = posts.map(p => p.id === postToSave.id ? postToSave : p);
    } else {
      updatedPosts = [postToSave, ...posts];
    }

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(updatedPosts)
      });
      const data = await res.json();
      if (data.success) {
        setPosts(updatedPosts);
        setIsEditing(false);
        setCurrentPost(null);
        setMessage({ type: 'success', text: 'Artikel berhasil disimpan dan diverifikasi aman.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal menyimpan artikel' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus artikel ini?')) return;
    
    const updatedPosts = posts.filter(p => p.id !== id);
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(updatedPosts)
      });
      const data = await res.json();
      if (data.success) {
        setPosts(updatedPosts);
        setMessage({ type: 'success', text: 'Artikel berhasil dihapus' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal menghapus artikel' });
    }
  };

  const openNew = () => {
    setCurrentPost({
      id: Date.now().toString(),
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      createdAt: new Date().toISOString(),
      status: 'draft'
    });
    setIsEditing(true);
  };


  const insertText = (before: string, after: string = '') => {
    const textarea = document.getElementById('content-textarea') as HTMLTextAreaElement;
    if (!textarea || !currentPost) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = currentPost.content;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setCurrentPost({...currentPost, content: newText});
    
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
            Artikel Blog
          </h1>
          <p className="text-stone-400 mt-1">Kelola artikel untuk blog Anda.</p>
        </div>
        {!isEditing && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Tambah Artikel Baru
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

      {isEditing && currentPost ? (
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">
              {posts.find(p => p.id === currentPost.id) ? 'Edit Artikel' : 'Tulis Artikel Baru'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Judul</label>
              <input
                type="text"
                value={currentPost.title}
                onChange={e => setCurrentPost({...currentPost, title: e.target.value})}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Slug URL (Opsional)</label>
              <input
                type="text"
                value={currentPost.slug}
                onChange={e => setCurrentPost({...currentPost, slug: e.target.value})}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
                placeholder="contoh-judul-artikel"
              />
            </div>
          </div>
          
          <div>
             <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Ringkasan (Excerpt)</label>
             <textarea
                value={currentPost.excerpt}
                onChange={e => setCurrentPost({...currentPost, excerpt: e.target.value})}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none resize-none h-20"
              />
          </div>


          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Konten (Markdown)</label>
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
              value={currentPost.content}
              onChange={e => setCurrentPost({...currentPost, content: e.target.value})}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-200 focus:border-rose-500 focus:outline-none font-mono text-sm resize-y h-64"
            />
          </div>

          
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Status</label>
              <select
                value={currentPost.status}
                onChange={e => setCurrentPost({...currentPost, status: e.target.value as 'draft'|'published'})}
                className="bg-stone-950 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 focus:border-rose-500 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Diterbitkan</option>
              </select>
            </div>
            
            <div className="ml-auto">
               <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-stone-950 font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Simpan Artikel
                </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-stone-600 animate-spin" /></div>
          ) : posts.length === 0 ? (
             <div className="p-12 text-center text-stone-400">Belum ada artikel. Tambahkan sekarang!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-950/50 border-b border-stone-800 text-xs uppercase tracking-wider text-stone-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Judul</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Tanggal</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {posts.map(post => (
                    <tr key={post.id} className="hover:bg-stone-850 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-200">{post.title}</p>
                        <p className="text-xs text-stone-500 mt-1 truncate max-w-xs">{post.slug}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${post.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-stone-800 text-stone-400'}`}>
                          {post.status === 'published' ? 'Terbit' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-400">
                        {new Date(post.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setCurrentPost(post); setIsEditing(true); }} className="p-2 text-stone-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(post.id)} className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
