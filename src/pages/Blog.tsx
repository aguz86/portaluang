import React, { useState, useEffect } from "react";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2, Calendar, X, ArrowLeft } from "lucide-react";
import { BlogPost } from "./admin/AdminPosts";

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Filter out drafts and sort by date descending
          const published = data.data.filter((p: BlogPost) => p.status === 'published');
          published.sort((a: BlogPost, b: BlogPost) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPosts(published);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <LandingLayout>
      <div className="py-20 max-w-5xl mx-auto px-4 w-full">
        {!activePost ? (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Blog & Artikel</h1>
            <p className="text-xl text-stone-400 mb-12">Panduan, tips, dan inspirasi untuk perjalanan finansial Anda.</p>
            
            {loading ? (
               <div className="flex justify-center items-center h-64">
                 <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
               </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20 bg-stone-900/50 rounded-3xl border border-stone-800">
                <h3 className="text-xl font-bold text-stone-200 mb-2">Belum ada artikel</h3>
                <p className="text-stone-400">Kami sedang menyiapkan konten menarik untuk Anda. Kembali lagi nanti!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map(post => (
                  <div 
                    key={post.id} 
                    className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden hover:border-amber-500/50 transition-colors flex flex-col cursor-pointer group"
                    onClick={() => setActivePost(post)}
                  >
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
                        <Calendar className="w-4 h-4" />
                        {new Date(post.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <h2 className="text-2xl font-bold text-stone-100 mb-3 line-clamp-2 group-hover:text-amber-500 transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-stone-400 mb-6 line-clamp-3 flex-1">
                        {post.excerpt || post.content.substring(0, 150) + '...'}
                      </p>
                      
                      <div className="text-amber-500 font-medium text-sm mt-auto">Baca selengkapnya &rarr;</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="max-w-3xl mx-auto">
            <button 
              onClick={() => setActivePost(null)}
              className="flex items-center gap-2 text-stone-400 hover:text-amber-500 transition-colors mb-8 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Kembali ke Blog
            </button>
            
            <div className="mb-10">
              <div className="flex items-center gap-2 text-amber-500 font-medium mb-4">
                <Calendar className="w-5 h-5" />
                {new Date(activePost.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                {activePost.title}
              </h1>
            </div>
            
            <div className="prose prose-invert prose-stone lg:prose-lg max-w-none prose-headings:text-stone-100 prose-a:text-amber-500">
              <SafeMarkdown>{activePost.content}</SafeMarkdown>
            </div>
          </div>
        )}
      </div>
    </LandingLayout>
  );
}
