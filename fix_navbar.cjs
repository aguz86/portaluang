const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Fix the imports
content = content.replace(
  /import { \n  LayoutDashboard,/,
  `import { 
  LayoutDashboard,
  Crown,
  ChevronRight,
  Settings,
  X,
  Menu,`
);

// Fix the settings button
content = content.replace(
  /onClick=\{\(\) => setIsSettingsOpen\(true\)\}/g,
  `onClick={() => navigate('/app/settings')}`
);

// Remove the SettingsView modal at the bottom
content = content.replace(
  /\{\/\* Settings Modal \*\/\}\s*\{isSettingsOpen && \([\s\S]*?\}\)/,
  ""
);

fs.writeFileSync('src/components/Navbar.tsx', content);
