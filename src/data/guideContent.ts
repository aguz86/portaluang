export interface GuideTopic {
  id: string;
  chapterNumber: number;
  title: string;
  category: 'Dasar Finansial' | 'Anggaran Berbasis Nol' | 'Tagihan & Arus Kas' | 'Pos Sinking Fund' | 'Pelunasan Hutang' | 'Kekayaan & Aset' | 'Privasi & AI';
  readTimeMinutes: number;
  summary: string;
  content: string[];
  keyTakeaways: string[];
  actionableStep: string;
}

export const GUIDE_CHAPTERS: GuideTopic[] = [
  {
    id: 'ch-1',
    chapterNumber: 1,
    title: 'Filosofi Kedaulatan Finansial Mandiri',
    category: 'Dasar Finansial',
    readTimeMinutes: 4,
    summary: 'Mengapa aplikasi keuangan berlangganan sering gagal dan bagaimana aplikasi lokal browser memberikan kendali penuh tanpa biaya bulanan.',
    content: [
      'Sebagian besar aplikasi keuangan memerlukan koneksi perbankan otomatis yang sering terputus, menjual data privasi transaksi Anda, atau mengenakan biaya berlangganan rutin.',
      'Portal Uang menggunakan database cloud yang aman untuk menyimpan data Anda.',
      'Dengan mencatat transaksi secara sadar dan mandiri, Anda membangun kesadaran finansial sejati—mengenali kebocoran kecil dan kebiasaan impulsif sebelum menjadi masalah besar.'
    ],
    keyTakeaways: [
      'Tanpa biaya berlangganan atau biaya tersembunyi selamanya.',
      'Tidak memerlukan kata sandi bank; keamanan akun tetap terjamin 100%.',
      'Performa secepat kilat dan dapat diakses offline kapan saja.'
    ],
    actionableStep: 'Buka menu Rekening & Hutang lalu catat saldo utama di bank BCA, Mandiri, atau dompet digital Anda sebagai langkah awal.'
  },
  {
    id: 'ch-2',
    chapterNumber: 2,
    title: 'Menguasai Metode Anggaran Berbasis Nol (Zero-Based Budget)',
    category: 'Anggaran Berbasis Nol',
    readTimeMinutes: 5,
    summary: 'Cara memberi tugas eksplisit pada setiap Rupiah pemasukan sehingga Pemasukan dikurangi Alokasi tepat bernilai Rp 0.',
    content: [
      'Metode Zero-Based Budgeting (ZBB) bukan berarti saldo rekening Anda bernilai Rp 0. Ini berarti setiap Rupiah gaji yang masuk telah direncanakan penggunaannya sebelum bulan dimulai.',
      'Rumus: Total Pemasukan Bulanan - (Tagihan Tetap + Pengeluaran Variabel + Sinking Fund + Pelunasan Hutang + Investasi & Tabungan) = Rp 0 Sisa.',
      'Jika Anda memiliki sisa dana yang tidak teralokasi, dana tersebut berisiko menguap untuk pengeluaran impulsif tanpa disadari. Berikan tugas pada dana tersebut—seperti menambah investasi reksadana atau dana darurat.'
    ],
    keyTakeaways: [
      'Pemasukan - Pengeluaran - Tabungan - Pelunasan Hutang = Rp 0.',
      'Eliminasi kebocoran uang tunai sebelum bulan berjalan.',
      'Fleksibel: Sesuaikan alokasi di tengah bulan jika ada prioritas mendesak.'
    ],
    actionableStep: 'Buka menu Anggaran Berbasis Nol dan atur alokasi hingga lencana "Uang Belum Dialokasikan" berwarna hijau tepat Rp 0.'
  },
  {
    id: 'ch-3',
    chapterNumber: 3,
    title: 'Membangun Pos Sinking Fund yang Kokoh',
    category: 'Pos Sinking Fund',
    readTimeMinutes: 6,
    summary: 'Cegah pengeluaran tahunan seperti Mudik Lebaran, servis kendaraan, dan pajak terasa seperti keadaan darurat finansial.',
    content: [
      'Pengeluaran tahunan seperti Mudik Lebaran Rp 6.000.000 atau servis besar kendaraan Rp 1.800.000 sering kali menguras tabungan jika dibayar sekaligus.',
      'Pos Sinking Fund menyelesaikan masalah ini dengan membagi kewajiban besar ke dalam cicilan bulanan yang teratur (Rp 6.000.000 / 12 = Rp 500.000/bulan).',
      'Saat tagihan tiba, dana sudah siap di pos khusus tanpa mengganggu anggaran operasional bulanan Anda.'
    ],
    keyTakeaways: [
      'Pos Sinking Fund mengubah biaya besar terprediksi menjadi anggaran bulanan yang santai.',
      'Hitung target bulanan = (Target Dana - Tabungan Saat Ini) / Sisa Bulan.',
      'Simpan pos dana ini di tabungan berimbal hasil tinggi atau reksadana pasar uang.'
    ],
    actionableStep: 'Masuk ke menu Pos Sinking Fund, buat target "Mudik Lebaran" atau "Servis Motor", lalu tentukan tanggal targetnya.'
  },
  {
    id: 'ch-4',
    chapterNumber: 4,
    title: 'Strategi Pelunasan Hutang: Debt Avalanche vs. Debt Snowball',
    category: 'Pelunasan Hutang',
    readTimeMinutes: 7,
    summary: 'Perbandingan mendalam antara optimasi matematis bunga terendah (Avalanche) dan momentum psikologis cepat (Snowball).',
    content: [
      'Metode Debt Avalanche mengurutkan hutang berdasarkan tingkat bunga tertinggi (APR/bunga tertinggi lebih dulu). Ini menghemat total pembayaran bunga dan mempercepat pelunasan secara matematis.',
      'Metode Debt Snowball mengurutkan hutang berdasarkan saldo terkecil lebih dulu. Melunasi hutang kecil memberikan kemenangan psikologis cepat yang meningkatkan kedisiplinan.',
      'Portal Uang memiliki Laboratorium Pelunasan Hutang interaktif yang menghitung tanggal pasti lunas serta penghematan bunga dari kedua metode.'
    ],
    keyTakeaways: [
      'Metode Avalanche menghemat uang paling banyak dari penghematan bunga.',
      'Metode Snowball membangun motivasi psikologis dengan melunasi saldo kecil dengan cepat.',
      'Kunci utamanya adalah konsistensi dan membayar ekstra pada hutang prioritas utama.'
    ],
    actionableStep: 'Kunjungi menu Rekening & Hutang untuk menjalankan Simulasi Pelunasan Hutang pada daftar kewajiban Anda.'
  },
  {
    id: 'ch-5',
    chapterNumber: 5,
    title: 'Protokol Otomasi Gajian & Distribusi Alokasi',
    category: 'Tagihan & Arus Kas',
    readTimeMinutes: 5,
    summary: 'Cara cepat membagikan uang gaji ke pos-pos yang ditentukan begitu transfer gaji masuk ke rekening BCA/Mandiri Anda.',
    content: [
      'Perencanaan gajian menghilangkan godaan belanja impulsif. Dengan membuat aturan alokasi otomatis, gaji Anda langsung terbagi untuk tagihan wajib, sinking fund, dan tabungan.',
      'Contoh pada gaji Rp 8.500.000: Rp 2.400.000 untuk KPR, Rp 1.800.000 untuk Belanja Bulanan, Rp 1.000.000 untuk Reksadana Bibit, dan Rp 400.000 untuk Sinking Fund Mudik.',
      'Mengeksekusi protokol ini dalam 5 menit setelah gajian mencegah penguapan uang dan pengeluaran yang tidak terkontrol.'
    ],
    keyTakeaways: [
      'Alokasikan gaji segera di hari gajian sebelum dipakai belanja pilihan.',
      'Tetapkan nominal pasti untuk tagihan esensial dan persentase untuk investasi.',
      'Pantau siklus gajian dengan Perencana Hari Gajian Portal Uang.'
    ],
    actionableStep: 'Buka menu Perencana Hari Gajian, atur frekuensi gajian, dan konfigurasikan rancangan alokasi uang Anda.'
  },
  {
    id: 'ch-6',
    chapterNumber: 6,
    title: 'Penguasaan Kalender Tagihan & Bebas Denda Keterlambatan',
    category: 'Tagihan & Arus Kas',
    readTimeMinutes: 4,
    summary: 'Eliminasi denda keterlambatan dan tagihan yang terlewat dengan matriks kalender tagihan visual dan pelacak bayar otomatis.',
    content: [
      'Denda keterlambatan merusak arus kas dan membuang uang secara sia-sia. Portal Uang menyediakan matriks tagihan bulanan visual yang diurutkan berdasarkan tanggal jatuh tempo.',
      'Tandai tagihan sebagai "Lunas" hanya dengan satu klik untuk mencatat transaksi secara otomatis di rekening bank Anda.',
      'Kelompokkan tagihan mingguan untuk mengidentifikasi tanggal pengeluaran puncak agar saldo rekening tetap terjaga.'
    ],
    keyTakeaways: [
      'Tanggal jatuh tempo visual menyoroti jadwal pembayaran mendatang.',
      'Satu klik "Tandai Lunas" otomatis sinkron ke jurnal transaksi.',
      'Pisahkan tagihan Autodebet dan Manual untuk menghindari double payment.'
    ],
    actionableStep: 'Cek menu Kalender Tagihan dan ubah status tagihan yang belum dibayar menjadi Lunas.'
  },
  {
    id: 'ch-7',
    chapterNumber: 7,
    title: 'Laju Kekayaan Bersih & Strategi Alokasi Aset',
    category: 'Kekayaan & Aset',
    readTimeMinutes: 6,
    summary: 'Lacak pertumbuhan kekayaan nyata di luar pemasukan bulanan: Akumulasi aset, penurunan hutang, dan pertumbuhan investasi compounding.',
    content: [
      'Kekayaan Bersih = Total Aset (Rekening Bank, Deposito, Investasi Reksadana/Saham, Rumah) dikurangi Total Hutang (Kartu Kredit, Cicilan Motor, KPR).',
      'Pemasukan mengukur arus kas harian, tetapi Kekayaan Bersih mengukur tingkat kebebasan finansial sejati Anda.',
      'Mencatat riwayat bulanan memungkinkan Anda melihat tren grafik kekayaan bersih yang terus meningkat seiring berjalannya waktu.'
    ],
    keyTakeaways: [
      'Fokus pada memperbesar jarak antara total aset dan total hutang.',
      'Catat riwayat kekayaan bersih pada tanggal 1 setiap bulan.',
      'Rayakan pencapaian milestone seperti nilai kekayaan bersih yang mulai menjadi positif.'
    ],
    actionableStep: 'Buka menu Mesin Kekayaan Bersih dan catat riwayat nilai kekayaan bersih Anda bulan ini.'
  },
  {
    id: 'ch-8',
    chapterNumber: 8,
    title: 'Privasi Lokal, Cadangan Data & Asisten AI Cerdas',
    category: 'Privasi & AI',
    readTimeMinutes: 5,
    summary: 'Cara aman mengamankan cadangan data JSON, mengekspor laporan CSV, dan memanfaatkan AI Gemini untuk audit anggaran instan.',
    content: [
      'Karena Portal Uang beroperasi secara lokal di browser Anda, lakukan ekspor cadangan data JSON berkala ke Google Drive atau penyimpanan perangkat Anda.',
      'Butuh analisa dari asisten finansial AI? Klik tombol "Penasihat AI" untuk meminta Gemini menganalisis kebiasaan belanja, variansi anggaran, dan strategi pelunasan hutang Anda secara aman.',
      'Anda juga dapat menempelkan teks rincian struk belanja atau riwayat m-banking ke prompt AI untuk mengurai transaksi secara instan ke dalam catatan Anda.'
    ],
    keyTakeaways: [
      'Ekspor file cadangan JSON secara berkala agar data senantiasa aman.',
      'Impor data kapan saja di berbagai perangkat seperti laptop, tablet, atau HP.',
      'Gunakan integrasi Gemini AI untuk analisis keuangan cerdas berkecepatan tinggi.'
    ],
    actionableStep: 'Klik ikon "Cadangan & Ekspor" di navigasi atas untuk mengunduh file cadangan data JSON lokal Anda.'
  }
];

