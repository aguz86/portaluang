const fs = require('fs');
let content = fs.readFileSync('src/pages/Login.tsx', 'utf8');

if (!content.includes('useGlobalSettings')) {
  content = content.replace(
    /import \{ Link, useNavigate \} from "react-router-dom";/,
    `import { Link, useNavigate } from "react-router-dom";\nimport { useGlobalSettings } from "../hooks/useGlobalSettings";`
  );
  
  content = content.replace(
    /const navigate = useNavigate\(\);/,
    `const navigate = useNavigate();\n  const { settings } = useGlobalSettings();`
  );
  
  content = content.replace(
    /Masuk ke AuraLedger/g,
    `Masuk ke {settings.appName}`
  );
}

fs.writeFileSync('src/pages/Login.tsx', content);
