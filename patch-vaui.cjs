const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

code = code.replace(/{vaNumbers\[key\]\.bank}/g, '{getVaInfo(key).bank}');
code = code.replace(/paymentMethod in vaNumbers/g, 'paymentMethod?.startsWith("va_")');
code = code.replace(/vaNumbers\[paymentMethod as keyof typeof vaNumbers\]\.bank/g, 'getVaInfo(paymentMethod as string).bank');
code = code.replace(/vaNumbers\[paymentMethod as keyof typeof vaNumbers\]\.number/g, 'getVaInfo(paymentMethod as string).number');

fs.writeFileSync('src/pages/Checkout.tsx', code);
