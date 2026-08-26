const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(/import \{ \n  LayoutDashboard,\n  Crown,\n  ChevronRight,\n  Settings,\n  X,\n  Menu,/g, 'import { \n  LayoutDashboard,');

// Also the regex for SettingsView didn't match fully because there were some other things inside it. Let's delete from `{/* Settings Modal */}` to the end of the file, and replace with `</>\n  );\n};\n`

const parts = content.split('{/* Settings Modal */}');
if (parts.length > 1) {
  content = parts[0] + '</>\n  );\n};\n';
}

fs.writeFileSync('src/components/Navbar.tsx', content);
