const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "// If paymentMethod is exactly 2 characters, assume it's a direct Duitku code.\n      const channelCode = (paymentMethod && paymentMethod.length === 2) ? paymentMethod : (DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris']).code;",
  "// Restore channelInfo\n      const channelInfo = DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris'];\n      const channelCode = (paymentMethod && paymentMethod.length === 2) ? paymentMethod : channelInfo.code;"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed channelInfo reference');
