const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "// Restore channelInfo\n      const channelInfo = DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris'];\n      const channelCode = (paymentMethod && paymentMethod.length === 2) ? paymentMethod : channelInfo.code;",
  "// Restore channelInfo dynamically\n      const channelInfo = (paymentMethod && paymentMethod.length === 2) ? (Object.values(DUITKU_CHANNELS).find(c => c.code === paymentMethod) || DUITKU_CHANNELS['qris']) : (DUITKU_CHANNELS[paymentMethod] || DUITKU_CHANNELS['qris']);\n      const channelCode = channelInfo.code;"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed channelInfo reference again');
