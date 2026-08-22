const fs = require('fs');

const fixInFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/isStkamulone/g, "isStandalone");
    content = content.replace(/stkamulone/g, "standalone");
    fs.writeFileSync(filePath, content);
  }
};

const files = [
  'src/components/InstallAppModal.tsx',
  'src/components/InstallAppBanner.tsx',
  'src/components/DashboardView.tsx',
  'src/hooks/usePWAInstall.ts',
  'src/pages/Home.tsx',
  'src/App.tsx'
];

files.forEach(fixInFile);
