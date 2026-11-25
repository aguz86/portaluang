const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("Silakan loin terlebih", "Silakan login terlebih");

fs.writeFileSync('server.ts', code);
console.log('Fixed typo in server.ts');
