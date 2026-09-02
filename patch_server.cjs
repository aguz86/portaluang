const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "const channelInfo = DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris'];\n      const channelCode = channelInfo.code;",
  "// If paymentMethod is exactly 2 characters, assume it's a direct Duitku code.\n      const channelCode = (paymentMethod && paymentMethod.length === 2) ? paymentMethod : (DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris']).code;"
);
fs.writeFileSync('server.ts', code);
console.log('Patched server.ts');
