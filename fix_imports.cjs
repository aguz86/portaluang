const fs = require('fs');

const files = [
  'src/DashboardApp.tsx',
  'src/components/LandingLayout.tsx',
  'src/pages/admin/AdminSettings.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { useGlobalSettings } from')) {
    let hookPath = '';
    if (file === 'src/DashboardApp.tsx') hookPath = './hooks/useGlobalSettings';
    else if (file === 'src/components/LandingLayout.tsx') hookPath = '../hooks/useGlobalSettings';
    else if (file === 'src/pages/admin/AdminSettings.tsx') hookPath = '../../hooks/useGlobalSettings';
    
    content = `import { useGlobalSettings } from '${hookPath}';\n` + content;
    fs.writeFileSync(file, content);
  }
}
