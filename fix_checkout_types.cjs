const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// The issue is that renderedVaList[0] is of type string, but setPaymentMethod expects specific literals.
// Let's cast it to any.

code = code.replace("onClick={() => setPaymentMethod(renderedVaList[0] || 'va_bca')}", "onClick={() => setPaymentMethod((renderedVaList[0] as any) || 'va_bca')}");

fs.writeFileSync('src/pages/Checkout.tsx', code);
console.log('Fixed Checkout.tsx type issue');
