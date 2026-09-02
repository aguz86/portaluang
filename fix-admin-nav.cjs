const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminLayout.tsx', 'utf8');

code = code.replace("label: 'Users'", "label: 'Pengguna'");
code = code.replace("label: 'Transactions'", "label: 'Transaksi'");
code = code.replace("label: 'Subscriptions'", "label: 'Paket Langganan'");
code = code.replace("label: 'Payments'", "label: 'Pembayaran (Duitku)'");
code = code.replace("label: 'Marketing'", "label: 'Pemasaran & Email'");
code = code.replace("label: 'Settings'", "label: 'Pengaturan Sistem'");

fs.writeFileSync('src/pages/admin/AdminLayout.tsx', code);
console.log('Fixed admin nav labels');
