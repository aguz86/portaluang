const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(/import \{ \n  LayoutDashboard,/g, 'import { \n  LayoutDashboard,\n  ChevronRight,');

fs.writeFileSync('src/components/Navbar.tsx', content);
