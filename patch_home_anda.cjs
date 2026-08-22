const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace("Kuasai Uang Anda dengan ", "Kuasai Uang Kamu dengan ");
content = content.replace("Hitung Potensi Penghematan & Alokasi Gaji Anda", "Hitung Potensi Penghematan & Alokasi Gaji Kamu");
content = content.replace("Pemasukan Bulanan Anda:", "Pemasukan Bulanan Kamu:");
content = content.replace("Solusi Lengkap Finansial Anda", "Solusi Lengkap Finansial Kamu");
content = content.replace("Siap Mengambil Kendali Keuangan Anda?", "Siap Mengambil Kendali Keuangan Kamu?");
content = content.replace("Kuasai Finansial Anda", "Kuasai Finansial Kamu");

fs.writeFileSync('src/pages/Home.tsx', content);
