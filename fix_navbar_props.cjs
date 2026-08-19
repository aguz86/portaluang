const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Update import to include required types
content = content.replace(
  /import \{ ActiveTab, ThemeMode, formatRupiah \} from '\.\.\/types';/,
  "import { ActiveTab, ThemeMode, formatRupiah, Bill, Transaction, BudgetCategory, NotificationSettings } from '../types';"
);

// Update interface
content = content.replace(
  /interface NavbarProps \{[\s\S]*?isCloudSyncing\?: boolean;\n\}/,
  `interface NavbarProps {
  themeMode: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
  onOpenQuickAdd: () => void;
  onOpenAiAdvisor: () => void;
  onOpenBackupModal: () => void;
  onResetData: () => void;
  unassignedCash: number;
  hasDueBills?: boolean;
  isCloudSyncing?: boolean;
  bills?: Bill[];
  transactions?: Transaction[];
  budgetCategories?: BudgetCategory[];
  notificationSettings?: NotificationSettings;
}`
);

// Update component signature
content = content.replace(
  /export const Navbar: React\.FC<NavbarProps> = \(\{[\s\S]*?isCloudSyncing,\n\}\) => \{/,
  `export const Navbar: React.FC<NavbarProps> = ({
  themeMode,
  setThemeMode,
  onOpenQuickAdd,
  onOpenAiAdvisor,
  onOpenBackupModal,
  onResetData,
  unassignedCash,
  hasDueBills,
  isCloudSyncing,
  bills = [],
  transactions = [],
  budgetCategories = [],
  notificationSettings,
}) => {`
);

fs.writeFileSync('src/components/Navbar.tsx', content);
