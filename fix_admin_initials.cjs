const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminLayout.tsx', 'utf8');

content = content.replace(
  /AL\s*<\/div>/g,
  `{settings.appName.substring(0, 2).toUpperCase()}</div>`
);

fs.writeFileSync('src/pages/admin/AdminLayout.tsx', content);
