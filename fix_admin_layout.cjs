const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminLayout.tsx', 'utf8');

if (!content.includes('useGlobalSettings')) {
  content = content.replace(
    /import \{ Link, useLocation, Outlet, useNavigate, Navigate \} from 'react-router-dom';/,
    `import { Link, useLocation, Outlet, useNavigate, Navigate } from 'react-router-dom';\nimport { useGlobalSettings } from '../../hooks/useGlobalSettings';`
  );
  
  content = content.replace(
    /const navigate = useNavigate\(\);/,
    `const navigate = useNavigate();\n  const { settings } = useGlobalSettings();`
  );
  
  content = content.replace(
    /AuraLedger Admin<\/span> • System Management/g,
    `{settings.appName} Admin</span> • System Management`
  );
  
  content = content.replace(
    /&copy; \{new Date\(\)\.getFullYear\(\)\} AuraLedger\./g,
    `&copy; {new Date().getFullYear()} {settings.appName}.`
  );
  
  content = content.replace(
    /<span>Version 1\.0\.0<\/span>/g,
    `<span>Version {settings.appVersion}</span>`
  );
}

fs.writeFileSync('src/pages/admin/AdminLayout.tsx', content);
