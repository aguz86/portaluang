const fs = require('fs');

const replaceInFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Anda/g, "Kamu");
    content = content.replace(/anda/g, "kamu");
    fs.writeFileSync(filePath, content);
  }
};

const files = [
  'src/components/ZeroBasedBudgetView.tsx',
  'src/components/BillsView.tsx',
  'src/components/SinkingFundsView.tsx',
  'src/components/NetWorthView.tsx',
  'src/components/InvestmentsView.tsx',
  'src/components/SettingsView.tsx',
  'src/components/IncomePaydayView.tsx',
  'src/components/LandingLayout.tsx',
  'src/components/TelegramLinkModal.tsx',
  'src/components/InstallAppModal.tsx',
  'src/components/ProfileView.tsx',
  'src/components/DashboardView.tsx',
  'src/components/Footer.tsx',
  'src/components/Navbar.tsx',
  'src/pages/Pricing.tsx',
  'src/pages/Login.tsx',
  'src/pages/Register.tsx'
];

files.forEach(replaceInFile);
