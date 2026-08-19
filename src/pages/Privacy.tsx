import React, { useState, useEffect } from "react";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2 } from "lucide-react";

export default function Privacy() {
  const [content, setContent] = useState(`## **1. Informasi yang Kami Kumpulkan**

Dalam menyediakan layanan manajemen keuangan komprehensif, Portal Uang mengumpulkan beberapa jenis informasi:

* **Data Akun & Profil:** Nama, alamat email, dan kredensial login.
* **Data Finansial (Zero-Based Budgeting):** Saldo rekening, catatan hutang, tagihan rutin (bills), alokasi anggaran, dan target tabungan (sinking funds) yang Anda masukkan.
* **Data Integrasi & Perangkat:** ID Telegram (jika Anda mengaktifkan bot pengingat tagihan), alamat IP, dan data pelacakan analitik (seperti Meta Pixel) untuk mengoptimalkan pengalaman pengguna.

## **2. Pemrosesan Data & Kecerdasan Buatan (AI)**

Aplikasi kami dilengkapi dengan asisten cerdas **Portal Uang Advisor (AI Financial Advisor)**:

* Data transaksi dan metrik keuangan Anda dapat diproses melalui layanan API pihak ketiga (Google Gemini API).
* Data dikirimkan secara aman dan terenkripsi. Data finansial pribadi Anda tidak digunakan untuk melatih model AI publik mereka.

## **3. Penggunaan Informasi**

Data yang dikumpulkan digunakan semata-mata untuk: 
(a) Menyediakan fungsionalitas aplikasi seperti kalkulasi *Net Worth* dan strategi pelunasan hutang (Snowball/Avalanche); 
(b) Mengirimkan notifikasi tagihan via Telegram/Email; 
(c) Memproses pembayaran; dan 
(d) Menganalisis metrik UI/UX.

## **4. Keamanan & Pihak Ketiga**

Portal Uang terhubung dengan penyedia data publik (contoh: Yahoo Finance, Antam) untuk pembaruan *Live Market Data*. Kami menggunakan perlindungan enkripsi standar industri dan **tidak menjual data finansial Anda** kepada pialang data pihak ketiga.`);
  const [title, setTitle] = useState("Kebijakan Privasi");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/privacy')
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
