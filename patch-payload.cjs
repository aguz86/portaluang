const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// Modify paymentMethod being sent
const oldPayload = `paymentMethod: paymentMethod,`;
const newPayload = `paymentMethod: paymentMethod === 'ewallet' ? \`ewallet_\${ewalletProvider}\` : paymentMethod,`;

code = code.replace(oldPayload, newPayload);
fs.writeFileSync('src/pages/Checkout.tsx', code);
