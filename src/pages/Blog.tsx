import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2, Calendar, ArrowLeft, Search, Clock, User, BookOpen } from "lucide-react";
import { BlogPost } from "./admin/AdminPosts";
import { isSafeUrl } from "../utils/security";

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("SEMUA");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const published = data.data.filter((p: BlogPost) => p.status === "published");
          published.sort(
            (a: BlogPost, b: BlogPost) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setPosts(published);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const activeSlug = searchParams.get("slug");
  const activePost = useMemo(
    () => (activeSlug ? posts.find((p) => p.slug === activeSlug || p.id === activeSlug) || null : null),
    [posts, activeSlug]
  );

  const categories = useMemo(() => {
    const cats = new Set<string>(["SEMUA"]);
    posts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = selectedCategory === "SEMUA" || p.category === selectedCategory;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [posts, selectedCategory, searchTerm]);

  // Extract H2/H3 Table of Contents for long-form reader stability
  const tocHeadings = useMemo(() => {
    if (!activePost?.content) return [];
    return activePost.content
      .split("\n")
      .map((line) => {
        const m = line.match(/^(#{2,3})\s+(.+)/);
        if (!m) return null;
        const text = m[2].replace(/[*_`]/g, "").trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        return { level: m[1].length, text, id };
      })
      .filter(Boolean) as Array<{ level: number; text: string; id: string }>;
  }, [activePost?.content]);

  const openPost = (post: BlogPost) => {
    setSearchParams({ slug: post.slug || post.id });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closePost = () => {
    setSearchParams({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <LandingLayout>
      <div className="py-16 sm:py-20 max-w-6xl mx-auto px-4 w-full">
        {!activePost ? (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Blog &amp; Artikel</h1>
                <p className="text-lg text-stone-400">
                  Panduan mendalam, tips pengelolaan kas, dan inspirasi perjalanan finansial Anda.
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari artikel atau topik..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      selectedCategory === cat
                        ? "bg-amber-500 text-stone-950"
                        : "bg-stone-900 border border-stone-800 text-stone-300 hover:border-stone-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20 bg-stone-900/50 rounded-3xl border border-stone-800">
                <h3 className="text-xl font-bold text-stone-200 mb-2">Belum ada artikel</h3>
                <p className="text-stone-400">
                  Kami sedang menyiapkan konten edukasi menarik untuk Anda. Kembali lagi nanti!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden hover:border-amber-500/50 transition-colors flex flex-col cursor-pointer group"
                    onClick={() => openPost(post)}
                  >
                    {post.coverImage && isSafeUrl(post.coverImage) && (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-44 object-cover border-b border-stone-800"
                      />
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-2 text-stone-500 text-xs mb-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.createdAt).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {post.readingTime && (
                          <span className="inline-flex items-center gap-1 text-amber-400/90 font-semibold">
                            <Clock className="w-3.5 h-3.5" /> {post.readingTime} mnt baca
                          </span>
                        )}
                      </div>
                      {post.category && (
                        <span className="inline-block w-fit px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                          {post.category}
                        </span>
                      )}
                      <h2 className="text-xl font-bold text-stone-100 mb-2.5 line-clamp-2 group-hover:text-amber-500 transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-sm text-stone-400 mb-5 line-clamp-3 flex-1">
                        {post.excerpt || post.content.replace(/[#*_`]/g, "").substring(0, 150) + "..."}
                      </p>

                      <div className="text-amber-500 font-semibold text-sm mt-auto">
                        Baca selengkapnya &rarr;
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <button
                onClick={closePost}
                className="flex items-center gap-2 text-stone-400 hover:text-amber-500 transition-colors mb-8 font-medium text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Semua Artikel
              </button>

              {activePost.coverImage && isSafeUrl(activePost.coverImage) && (
                <img
                  src={activePost.coverImage}
                  alt={activePost.title}
                  className="w-full max-h-96 object-cover rounded-2xl border border-stone-800 mb-8"
                />
              )}

              <div className="mb-8">
                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 font-medium mb-3">
                  {activePost.category && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase">
                      {activePost.category}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-amber-400">
                    <Calendar className="w-4 h-4" />
                    {new Date(activePost.createdAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  {activePost.author && (
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-4 h-4" /> {activePost.author}
                    </span>
                  )}
                  {activePost.readingTime && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {activePost.readingTime} menit baca
                    </span>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                  {activePost.title}
                </h1>
              </div>

              <div className="prose prose-invert prose-stone lg:prose-lg max-w-none prose-headings:text-stone-100 prose-a:text-amber-500">
                <SafeMarkdown>{activePost.content}</SafeMarkdown>
              </div>
            </div>

            {tocHeadings.length > 0 && (
              <aside className="lg:col-span-4 hidden lg:block">
                <div className="sticky top-24 bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-stone-800 pb-2.5">
                    <BookOpen className="w-4 h-4" />
                    Daftar Isi Artikel
                  </div>
                  <nav className="space-y-1.5 text-xs">
                    {tocHeadings.map((h, i) => (
                      <a
                        key={`${h.id}-${i}`}
                        href={`#${h.id}`}
                        className={`block text-stone-400 hover:text-amber-400 transition-colors py-1 ${
                          h.level === 3 ? "pl-3 text-[11px]" : "font-semibold"
                        }`}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </LandingLayout>
  );
}
