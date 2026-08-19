const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  /export const Navbar: React\.FC<NavbarProps> = \(\{\s*themeMode,\s*setThemeMode,\s*onOpenQuickAdd,\s*onOpenAiAdvisor,\s*onOpenBackupModal,\s*onResetData,\s*unassignedCash,\s*hasDueBills = false,\s*\}\) => \{/,
  `export const Navbar: React.FC<NavbarProps> = ({
  themeMode,
  setThemeMode,
  onOpenQuickAdd,
  onOpenAiAdvisor,
  onOpenBackupModal,
  onResetData,
  unassignedCash,
  hasDueBills = false,
  isCloudSyncing,
  bills = [],
  transactions = [],
  budgetCategories = [],
  notificationSettings,
}) => {`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
