const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// 1. Modify getGeminiClient so it doesn't throw, but returns null if no key
const oldGetClient = `const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };`;

const newGetClient = `const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };`;

server = server.replace(oldGetClient, newGetClient);

// 2. Modify the /api/ai-insights route to handle null AI client
const oldInsightCall = `const ai = getGeminiClient();

      // Fetch dynamic AI customization from global_settings`;

const newInsightCall = `const ai = getGeminiClient();

      if (!ai) {
        let mockResponse = "Berdasarkan analisis portofolio keuangan kamu saat ini, disarankan untuk mengoptimalkan kembali alokasi pengeluaran bulanan dan mempercepat pembayaran hutang menggunakan metode Snowball untuk menjaga kesehatan kas jangka panjang.";
        
        if (mode === 'budget_audit') {
          mockResponse = "Berdasarkan analisis anggaran berbasis nol Kamu, alokasi saat ini sudah cukup seimbang. Namun, ada potensi untuk meningkatkan porsi tabungan (Pay Yourself First) dari 15% menjadi 20% dengan mengurangi pengeluaran sekunder. Pertahankan kedisiplinan ini!";
        } else if (mode === 'debt_strategy') {
          mockResponse = "Strategi pelunasan hutang Kamu dapat dioptimalkan. Metode Snowball terlihat lebih cocok untuk memberikan motivasi awal, tetapi jika fokus Kamu adalah meminimalkan bunga total, sebaiknya prioritaskan metode Avalanche. Lunasi tagihan dengan bunga tertinggi terlebih dahulu.";
        } else if (mode === 'statement_parser') {
          mockResponse = "Analisis mutasi berhasil. Terdeteksi beberapa transaksi berulang yang bisa dioptimalkan. Berdasarkan pola pengeluaran ini, Kamu mungkin bisa menghemat hingga Rp 350.000 bulan ini.";
        }
        
        return res.json({
          success: true,
          response: \`[Simulasi AI - API Key Tidak Diperlukan]\\n\\n\${mockResponse}\`
        });
      }

      // Fetch dynamic AI customization from global_settings`;

server = server.replace(oldInsightCall, newInsightCall);

fs.writeFileSync('server.ts', server);
