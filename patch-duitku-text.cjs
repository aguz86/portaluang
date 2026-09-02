const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

code = code.replace(
  'let methodLabel = duitkuInvoice?.paymentMethodName || "Duitku Payment Gateway";',
  'let methodLabel = duitkuInvoice?.paymentMethodName || duitkuMethods.find(m => m.paymentMethod === paymentMethod)?.paymentName || "Payment Gateway";'
);
code = code.replace(
  'methodLabel = "Duitku QRIS Instan";',
  'methodLabel = "QRIS Instan";'
);
code = code.replace(
  'methodLabel = `Duitku Virtual Account ${paymentMethod.replace(\'va_\', \'\').toUpperCase()}`;',
  'methodLabel = `Virtual Account ${paymentMethod.replace(\'va_\', \'\').toUpperCase()}`;'
);
code = code.replace(
  'methodLabel = `Duitku E-Wallet (${ewalletProvider.toUpperCase()})`;',
  'methodLabel = `E-Wallet (${ewalletProvider.toUpperCase()})`;'
);
code = code.replace(
  '<Zap className="w-3.5 h-3.5" /> Duitku Realtime Instant Settlement &bull; Berlaku 24 Jam',
  '<Zap className="w-3.5 h-3.5" /> Realtime Instant Settlement &bull; Berlaku 24 Jam'
);
code = code.replace(
  'alt="Duitku QR Code"',
  'alt="QR Code"'
);
code = code.replace(
  '<span>Garansi Duitku PG Resmi</span>',
  '<span>Garansi Sistem Pembayaran Resmi</span>'
);

fs.writeFileSync('src/pages/Checkout.tsx', code);
console.log('Removed Duitku branding');
