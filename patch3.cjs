const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  '  }\n};\n\nconst yahooFinance',
  '  }\n};\n}\n\nconst yahooFinance'
);
fs.writeFileSync('server.ts', content);
