import React, { useState, useEffect } from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2, ChevronDown } from "lucide-react";
import { FAQItem } from "./admin/AdminFAQs";

export default function FAQ() {
  const { settings } = useGlobalSettings();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const sorted = data.data.sort((a: FAQItem, b: FAQItem) => a.order - b.order);
          setFaqs(sorted);
          if (sorted.length > 0) setOpenId(sorted[0].id);
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
      <div className="py-20 max-w-3xl mx-auto px-4 w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Pertanyaan Umum</h1>
          <p className="text-xl text-stone-400">Temukan jawaban atas pertanyaan yang sering diajukan mengenai {settings.appName}.</p>
        </div>
        
        {loading ? (
           <div className="flex justify-center items-center h-64">
             <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
           </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-20 bg-stone-900/50 rounded-3xl border border-stone-800">
            <h3 className="text-xl font-bold text-stone-200 mb-2">Belum ada FAQ</h3>
            <p className="text-stone-400">Hubungi tim support kami jika Anda memiliki pertanyaan.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.map(faq => (
              <div 
                key={faq.id} 
                className={`bg-stone-900 border ${openId === faq.id ? 'border-amber-500/50 shadow-lg shadow-amber-500/5' : 'border-stone-800 hover:border-stone-700'} rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer`}
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              >
                <div className="p-6 flex items-center justify-between">
                  <h3 className={`font-bold text-lg ${openId === faq.id ? 'text-amber-500' : 'text-stone-200'}`}>
                    {faq.question}
                  </h3>
                  <ChevronDown className={`w-5 h-5 text-stone-500 transition-transform duration-300 ${openId === faq.id ? 'rotate-180 text-amber-500' : ''}`} />
                </div>
                
                <div 
                  className={`px-6 overflow-hidden transition-all duration-300 ${openId === faq.id ? 'max-h-[1000px] pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="prose prose-invert prose-stone max-w-none text-stone-400">
                    <SafeMarkdown>{faq.answer}</SafeMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LandingLayout>
  );
}
