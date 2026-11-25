const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "const { email, lastLoinAt } = req.body;",
  "const { email, lastLoginAt } = req.body;"
);

code = code.replace(
  "userData.lastLoinAt = lastLoinAt;",
  "userData.lastLoginAt = lastLoginAt || new Date().toISOString();"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed lastLoinAt');
