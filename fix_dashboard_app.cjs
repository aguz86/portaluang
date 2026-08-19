const fs = require('fs');
let content = fs.readFileSync('src/DashboardApp.tsx', 'utf8');

if (!content.includes('useGlobalSettings')) {
  content = content.replace(
    /import React, \{ useState, useEffect, useRef, useMemo \} from 'react';/,
    `import React, { useState, useEffect, useRef, useMemo } from 'react';\nimport { useGlobalSettings } from './hooks/useGlobalSettings';`
  );
  
  content = content.replace(
    /export default function DashboardApp\(\) \{/,
    `export default function DashboardApp() {\n  const { settings } = useGlobalSettings();`
  );
}

content = content.replace(
  /<span className="font-bold text-stone-400">AuraLedger<\/span>/g,
  `<span className="font-bold text-stone-400">{settings.appName}</span>`
);

content = content.replace(
  /AuraLedger<\/span> • Local-First Sovereign Wealth Engine\s*<\/div>/g,
  `{settings.appName}</span> • Local-First Sovereign Wealth Engine <span className="ml-2 text-[10px] bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded border border-stone-700">v{settings.appVersion}</span>\n            </div>`
);

fs.writeFileSync('src/DashboardApp.tsx', content);
