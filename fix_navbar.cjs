const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

if (!content.includes('useGlobalSettings')) {
  content = content.replace(
    /import \{ Link, useLocation, useNavigate \} from 'react-router-dom';/,
    `import { Link, useLocation, useNavigate } from 'react-router-dom';\nimport { useGlobalSettings } from '../hooks/useGlobalSettings';`
  );
  
  content = content.replace(
    /const location = useLocation\(\);/,
    `const location = useLocation();\n  const { settings } = useGlobalSettings();`
  );
}

content = content.replace(
  /<h1 className="font-extrabold text-lg tracking-tight text-stone-100">AuraLedger<\/h1>/g,
  `<h1 className="font-extrabold text-lg tracking-tight text-stone-100">{settings.appName}</h1>`
);

content = content.replace(
  /AL\s*<\/div>/g,
  `{settings.appName.substring(0, 2).toUpperCase()}</div>`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
