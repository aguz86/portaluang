const fs = require('fs');
let modal = fs.readFileSync('src/components/InstallAppModal.tsx', 'utf8');

modal = modal.replace(
  'const { platform, browser, promptInstall, isStandalone } = pwa;',
  'const { platform, browser, promptInstall, isStandalone, hasDeferredPrompt } = pwa;'
);

fs.writeFileSync('src/components/InstallAppModal.tsx', modal);
