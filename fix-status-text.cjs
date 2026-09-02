const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

code = code.replace(
  'setProcessingStep("Mengecek status pembayaran ke Duitku Gateway...");',
  'setProcessingStep("Mengecek status pembayaran ke sistem...");'
);

fs.writeFileSync('src/pages/Checkout.tsx', code);
console.log('Fixed processing text');
