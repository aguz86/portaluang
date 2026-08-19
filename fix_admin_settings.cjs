const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');

// Add import
content = content.replace(
  /import \{ Save, Globe, Key, AlertTriangle, CheckCircle2 \} from 'lucide-react';/,
  `import { Save, Globe, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';\nimport { useGlobalSettings } from '../../hooks/useGlobalSettings';`
);

// Add state and replace default values
content = content.replace(
  /const \[maintenance, setMaintenance\] = useState\(false\);/,
  `const [maintenance, setMaintenance] = useState(false);
  const { settings, updateSettings } = useGlobalSettings();
  const [appName, setAppName] = useState(settings.appName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [appVersion, setAppVersion] = useState(settings.appVersion);
  
  // Sync if external change happens
  useEffect(() => {
    setAppName(settings.appName);
    setSupportEmail(settings.supportEmail);
    setAppVersion(settings.appVersion);
  }, [settings]);
  `
);

// Add missing useEffect import if not present
if (!content.includes('useEffect')) {
  content = content.replace(
    /import React, \{ useState \} from 'react';/,
    `import React, { useState, useEffect } from 'react';`
  );
}

// Save function logic
content = content.replace(
  /const handleSave = \(e: React\.FormEvent\) => \{[\s\S]*?setTimeout\(\(\) => setMessage\(null\), 3000\);\n  \};/,
  `const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update global settings
    updateSettings({
      appName,
      supportEmail,
      appVersion
    });

    setMessage({ type: 'success', text: 'Settings saved successfully!' });
    setTimeout(() => setMessage(null), 3000);
  };`
);

// Update inputs
content = content.replace(
  /<input type="text" defaultValue="AuraLedger" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" \/>/,
  `<input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />`
);

content = content.replace(
  /<input type="email" defaultValue="support@auraledger\.com" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" \/>/,
  `<input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100" />`
);

// Add App Version field
const versionField = `            <div>
              <label className="block text-sm font-medium text-stone-300">App Version</label>
              <input type="text" value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder="e.g. 1.2.0" className="mt-2 block w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 font-mono text-sm" />
            </div>`;

content = content.replace(
  /<\/div>\s*<\/div>\s*<div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">/,
  `${versionField}\n          </div>\n        </div>\n        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">`
);

fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
