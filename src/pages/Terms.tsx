import React, { useState, useEffect } from "react";
import { useGlobalSettings } from "../hooks/useGlobalSettings";
import { LandingLayout } from "../components/LandingLayout";
import { SafeMarkdown } from "../components/SafeMarkdown";
import { Loader2 } from "lucide-react";

export default function Terms() {
  const { settings } = useGlobalSettings();
  const [content, setContent] = useState(`## **1. Penerimaan Syarat & Sifat Layanan**

Dengan mengakses atau menggunakan layanan Portal Uang, Anda memahami bahwa platform ini adalah **perangkat lunak pencatatan keuangan pribadi dan pengelolaan Zero-Based Budgeting**. Portal Uang **bukanlah** bank, manajer investasi, penasihat keuangan bersertifikat, atau lembaga keuangan yang diatur.

## **2. Sanggahan (Disclaimer) Asisten AI Portal Uang Advisor**

Layanan kami mencakup asisten kecerdasan buatan (Portal Uang Advisor) yang memberikan saran finansial dan ekstraksi otomatis. Segala rekomendasi yang dihasilkan oleh AI bersifat **informasional dan algoritmik**. Anda setuju bahwa keputusan finansial tetap menjadi tanggung jawab Anda sepenuhnya, dan Anda diwajibkan untuk memverifikasi secara manual setiap hasil analisis sebelum mengambil tindakan keuangan.

## **3. Akurasi Data Pasar (Live Market)**

Fitur *Investments & Net Worth* dapat menampilkan harga aset (saham, reksa dana, emas) yang ditarik dari penyedia API publik. Kami tidak menjamin bahwa data ini instan (tanpa *delay*) atau akurat 100%. Pengguna sangat dilarang menggunakan data ini sebagai panduan utama untuk aktivitas *trading*.

## **4. Langganan, Pembayaran & Integrasi Pihak Ketiga**

Akses ke beberapa fitur canggih (contoh: Portal Uang Advisor AI level pro, Notifikasi Bot Telegram) mungkin ditawarkan melalui paket **Pro**. Semua pembayaran diproses oleh gerbang pembayaran resmi. Biaya yang ditagihkan bersifat final dan tidak dapat dikembalikan *(non-refundable)*. Ketentuan penggunaan bot Telegram tunduk pada kebijakan Telegram itu sendiri.

## **5. Tanggung Jawab Pengguna**

Anda bertanggung jawab penuh untuk menjaga keamanan kata sandi akun Anda serta memasukkan metrik (seperti saldo, hutang, dan tagihan) secara akurat agar proyeksi *budgeting* dan pelunasan (Snowball/Avalanche) Anda berjalan lancar.`);
  const [title, setTitle] = useState("Syarat & Ketentuan");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/content/terms')
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
