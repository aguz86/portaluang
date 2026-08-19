const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  /updatedAt: result\.rows\[0\]\.updated_at/g,
  "updatedAt: (result.rows[0] as any).updated_at"
);

fs.writeFileSync('server.ts', content);
