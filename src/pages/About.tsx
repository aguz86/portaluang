import React, { useState, useEffect } from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2, Calendar } from "lucide-react";

export default function About() {
  const { settings } = useGlobalSettings();
  const defaultContent = `<p><strong>${settings.appName}</strong> lahir dari sebuah kebutuhan sederhana: alat manajemen keuangan pribadi yang benar-benar memahami cara kerja Zero-Based Budgeting, tanpa disesaki fitur yang tidak relevan.</p><p>Misi kami adalah membantu masyarakat mencapai kebebasan finansial melalui literasi pencatatan yang disiplin dan cerdas. Dengan bantuan Artificial Intelligence (AI), kami ingin ${settings.appName} bukan hanya sekadar pencatat, tapi juga asisten cerdas yang menganalisis pola keuangan Anda.</p><h3>Tim Kami</h3><p>Kami adalah tim kecil yang terdiri dari developer dan enthusiast personal finance yang berbasis di Indonesia.</p>`;
  const [content, setContent] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content/about")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          if (data.data.content) setContent(data.data.content);
          if (data.data.title) setTitle(data.data.title);
          if (data.data.updatedAt) setUpdatedAt(data.data.updatedAt);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const displayTitle = title || `Tentang ${settings.appName}`;
  const displayContent = content || defaultContent;

  return (
    <LandingLayout>
      <div className="py-16 sm:py-20 max-w-4xl mx-auto px-4 w-full">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-8 pb-6 border-b border-stone-800/80">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{displayTitle}</h1>
              {updatedAt && (
                <div className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Diperbarui pada {new Date(updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </div>
              )}
            </div>
            <div className="prose prose-invert prose-stone lg:prose-lg max-w-none prose-headings:text-stone-100 prose-a:text-amber-500">
              <SafeMarkdown>{displayContent}</SafeMarkdown>
            </div>
          </>
        )}
      </div>
    </LandingLayout>
  );
}
