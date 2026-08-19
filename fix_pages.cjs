const fs = require('fs');

const pages = [
  'src/pages/Features.tsx',
  'src/pages/ProLanding.tsx',
  'src/pages/Home.tsx',
  'src/pages/Contact.tsx',
  'src/pages/About.tsx',
  'src/pages/Terms.tsx',
  'src/pages/FAQ.tsx'
];

for (const page of pages) {
  let content = fs.readFileSync(page, 'utf8');
  if (content.includes('AuraLedger')) {
    if (!content.includes('useGlobalSettings')) {
      content = content.replace(
        /import React[\s\S]*?;/,
        (match) => `${match}\nimport { useGlobalSettings } from "../hooks/useGlobalSettings";`
      );
      
      content = content.replace(
        /export default function (\w+)\(\) \{/,
        (match) => `${match}\n  const { settings } = useGlobalSettings();`
      );
    }
    
    // Replace text outside of tags - simple regex
    content = content.replace(/>\s*([^{<]*?)AuraLedger(.*?)</g, '>{$1}{settings.appName}{$2}<');
    content = content.replace(/AuraLedger adalah/g, '{settings.appName} adalah');
    // more thorough text replacement if needed, but the simple one works for plain text inside tags
    content = content.replace(/>([^<]*)AuraLedger([^<]*)</g, (match, p1, p2) => `>${p1}{settings.appName}${p2}<`);
    content = content.replace(/>([^<]*)AuraLedger([^<]*)</g, (match, p1, p2) => `>${p1}{settings.appName}${p2}<`); // run twice in case of multiple
    
    // Check if there are still any string literals
    content = content.replace(/"AuraLedger"/g, 'settings.appName');
    content = content.replace(/'AuraLedger'/g, 'settings.appName');
    
    fs.writeFileSync(page, content);
  }
}
