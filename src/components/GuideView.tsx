import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUIDE_CHAPTERS, GuideTopic } from '../data/guideContent';
import { ActiveTab } from '../types';
import { 
  BookOpen, 
  Search, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Zap,
  Download
} from 'lucide-react';

interface GuideViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onLoadSampleData?: () => void;
}

export const GuideView: React.FC<GuideViewProps> = ({ setActiveTab, onLoadSampleData }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('SEMUA');
  const [selectedChapter, setSelectedChapter] = useState<GuideTopic>(GUIDE_CHAPTERS[0]);
  
  const readerRef = useRef<HTMLDivElement>(null);

  const categories = ['SEMUA', 'Dasar Keuangan', 'Anggaran Zero-Based', 'Tagihan & Arus Kas', 'Sinking Funds', 'Pelunasan Utang', 'Kekayaan Bersih', 'Privasi Lokal & AI'];

  const filteredChapters = GUIDE_CHAPTERS.filter((ch) => {
    const matchesSearch = 
      ch.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = activeCategory === 'SEMUA' || ch.category === activeCategory || activeCategory === 'ALL';

    return matchesSearch && matchesCat;
  });

  const handleChapterClick = (ch: GuideTopic) => {
    setSelectedChapter(ch);
    setTimeout(() => {
      readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-stone-100">Panduan & Strategi Pengelolaan Keuangan</h2>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl">
            Panduan interaktif lengkap seputar penganggaran Zero-Based, matematika pelunasan utang metode Avalanche/Snowball, strategi Sinking Fund, serta keamanan data finansial.
          </p>
        </div>
        {onLoadSampleData && (
          <button 
            onClick={onLoadSampleData}
            className="px-4 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-stone-950 transition-colors font-bold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Muat Data Sample</span>
          </button>
        )}
      </div>

      {/* Main Grid: Chapter Index Sidebar + Chapter Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Search & Chapter List */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Category Filter */}
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari topik panduan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Chapter Cards List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredChapters.map((ch) => {
              const isSelected = selectedChapter.id === ch.id;
              return (
                <div
                  key={ch.id}
                  onClick={() => handleChapterClick(ch)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-stone-850 border-amber-500/60 shadow-sm'
                      : 'bg-stone-900 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono mb-1">
                    <span>BAB {ch.chapterNumber} • {ch.category}</span>
                    <span className="flex items-center gap-1 text-stone-500">
                      <Clock className="w-3 h-3" /> {ch.readTimeMinutes} mnt
                    </span>
                  </div>
                  <h4 className={`font-bold text-xs ${isSelected ? 'text-amber-400' : 'text-stone-200'}`}>
                    {ch.title}
                  </h4>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 8 Cols: Reader Content */}
        <div ref={readerRef} className="lg:col-span-8 bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-6 shadow-sm scroll-mt-6">
          {/* Chapter Title Header */}
          <div className="border-b border-stone-800 pb-4">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono font-bold uppercase mb-1">
              <span>Bab {selectedChapter.chapterNumber}</span>
              <span>•</span>
              <span>{selectedChapter.category}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-stone-100">{selectedChapter.title}</h1>
            <p className="text-sm text-stone-300 mt-2 italic bg-stone-950/60 border border-stone-800 p-3 rounded-xl">
              "{selectedChapter.summary}"
            </p>
          </div>

          {/* Paragraphs */}
          <div className="space-y-4 text-stone-300 text-sm leading-relaxed">
            {selectedChapter.content.map((p, idx) => (
              <p key={idx}>{p}</p>
            ))}
          </div>

          {/* Key Takeaways Box */}
          <div className="bg-stone-950 border border-amber-500/30 p-5 rounded-xl space-y-3">
            <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Poin Penting & Aturan Utama
            </h4>
            <ul className="space-y-2 text-xs text-stone-300">
              {selectedChapter.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Step & Navigation Shortcut */}
          <div className="bg-stone-850 border border-stone-800 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Langkah Aksi Langsung</span>
              <p className="text-xs text-stone-200 font-medium mt-0.5">{selectedChapter.actionableStep}</p>
            </div>

            <button
              onClick={() => {
                let target = '/app/dashboard';
                if (selectedChapter.chapterNumber === 2) target = '/app/budget';
                else if (selectedChapter.chapterNumber === 3) target = '/app/goals';
                else if (selectedChapter.chapterNumber === 4) target = '/app/accounts';
                else if (selectedChapter.chapterNumber === 5) target = '/app/payday';
                else if (selectedChapter.chapterNumber === 6) target = '/app/bills';
                else if (selectedChapter.chapterNumber === 7) target = '/app/net-worth';
                else if (selectedChapter.chapterNumber === 8) target = '/app/settings';
                navigate(target);
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>Buka Fitur Ini</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

