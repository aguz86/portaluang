const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "error: 'Gagal membuat taihan pembayaran Duitku: ' + err.message",
  "error: 'Gagal membuat tagihan pembayaran: ' + err.message"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server.ts');
