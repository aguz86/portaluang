import React, { useState, useEffect } from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2 } from "lucide-react";

export default function About() {
  const { settings } = useGlobalSettings();
  const [content, setContent] = useState(`<p>{settings.appName} lahir dari sebuah kebutuhan sederhana: alat manajemen keuangan pribadi yang benar-benar memahami cara kerja Zero-Based Budgeting, tanpa disesaki fitur yang tidak relevan.</p><p>Misi kami adalah membantu masyarakat mencapai kebebasan finansial melalui literasi pencatatan yang disiplin dan cerdas. Dengan bantuan Artificial Intelligence (AI), kami ingin {settings.appName} bukan hanya sekadar pencatat, tapi juga asisten cerdas yang menganalisis pola keuangan Anda.</p><h3>Tim Kami</h3><p>Kami adalah tim kecil yang terdiri dari developer dan enthusiast personal finance yang berbasis di Indonesia.</p>`);
  const [title, setTitle] = useState("Tentang {settings.appName}");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/about')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          if (data.data.content) setContent(data.data.content);
          if (data.data.title) setTitle(data.data.title);
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
      <div className="py-20 max-w-4xl mx-auto px-4 w-full">
        {loading ? (
           <div className="flex justify-center items-center h-64">
             <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
           </div>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">{title}</h1>
            <div className="prose prose-invert prose-stone lg:prose-lg max-w-none">
              <SafeMarkdown>{content}</SafeMarkdown>
            </div>
          </>
        )}
      </div>
    </LandingLayout>
  );
}
