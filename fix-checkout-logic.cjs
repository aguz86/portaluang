const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// Fix request body
code = code.replace(
  "paymentMethod: paymentMethod === 'ewallet' ? \`ewallet_\${ewalletProvider}\` : paymentMethod,",
  "paymentMethod: paymentMethod,"
);

// Fix default QR payload generator
code = code.replace(
  "if (paymentMethod === 'qris' && !qrDataUrl) {",
  "if (paymentMethod === 'NQ' && !qrDataUrl) {"
);

// Fix label generator
const labelGenStart = "let methodLabel = duitkuInvoice?.paymentMethodName || \"Duitku Payment Gateway\";";
const labelGenEnd = "} else if (paymentMethod === 'ewallet') {\n            methodLabel = `Duitku E-Wallet ${ewalletProvider.toUpperCase()}`;\n          }";
const labelNew = "let methodLabel = duitkuInvoice?.paymentMethodName || duitkuMethods.find(m => m.paymentMethod === paymentMethod)?.paymentName || \"Duitku Payment Gateway\";";

const idx1 = code.indexOf(labelGenStart);
if (idx1 !== -1) {
  const idx2 = code.indexOf(labelGenEnd);
  if (idx2 !== -1) {
    code = code.substring(0, idx1) + labelNew + code.substring(idx2 + labelGenEnd.length);
  }
}

fs.writeFileSync('src/pages/Checkout.tsx', code);
console.log('Fixed Checkout logic');
