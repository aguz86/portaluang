const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const oldVa = `const vaNumbers = {
    va_bca: { bank: 'BCA', number: '82710812' + invoiceId.replace(/\\D/g, '').slice(-6) },
    va_mandiri: { bank: 'Bank Mandiri', number: '88708' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_bri: { bank: 'BRI (BRIVA)', number: '12800' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_bni: { bank: 'BNI', number: '98800' + invoiceId.replace(/\\D/g, '').slice(-8) }
  };`;

const newVa = `const vaNumbers: Record<string, { bank: string; number: string }> = {
    va_bca: { bank: 'BCA', number: '82710812' + invoiceId.replace(/\\D/g, '').slice(-6) },
    va_mandiri: { bank: 'Bank Mandiri', number: '88708' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_bri: { bank: 'BRI (BRIVA)', number: '12800' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_bni: { bank: 'BNI', number: '98800' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_cimb: { bank: 'CIMB Niaga', number: '1149' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_permata: { bank: 'Permata', number: '8856' + invoiceId.replace(/\\D/g, '').slice(-8) },
    va_atmbersama: { bank: 'ATM Bersama', number: '014' + invoiceId.replace(/\\D/g, '').slice(-8) }
  };
  
  // Dynamic fallback for any unknown VA
  const getVaInfo = (key: string) => {
    if (vaNumbers[key]) return vaNumbers[key];
    const name = key.replace('va_', '').toUpperCase();
    return { bank: name, number: '8880' + invoiceId.replace(/\\D/g, '').slice(-8) };
  };`;

code = code.replace(oldVa, newVa);
fs.writeFileSync('src/pages/Checkout.tsx', code);
