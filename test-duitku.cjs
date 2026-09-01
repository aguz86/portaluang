const crypto = require('crypto');
const merchantCode = 'D9821_AURA'; // fallback sandbox merchant code
const apiKey = '8f3e2b1a9c4d7e6f5a0b1c2d3e4f5a6b'; // fallback
const amount = '10000';
// Formatter for YYYY-MM-DD HH:mm:ss
const d = new Date();
const pad = (n) => n < 10 ? '0'+n : n;
const datetime = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const raw = `${merchantCode}${amount}${datetime}${apiKey}`;
const signature = crypto.createHash('sha256').update(raw).digest('hex');

const payload = {
  merchantcode: merchantCode,
  amount: amount,
  datetime: datetime,
  signature: signature
};

fetch('https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(console.log).catch(console.error);
