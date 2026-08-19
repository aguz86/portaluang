const fs = require('fs');

const fixFile = (filepath, needsImport) => {
  let content = fs.readFileSync(filepath, 'utf8');
  content = content.replace(/new Date\(\)\.toISOString\(\)\.substring\(0, 10\)/g, 'formatDateToDDMMYYYY()');
  
  if (needsImport) {
    if (content.includes('../utils/format')) {
      content = content.replace(/import \{([^}]+)\} from '\.\.\/utils\/format';/, (match, p1) => {
        if (!p1.includes('formatDateToDDMMYYYY')) {
          return `import {${p1}, formatDateToDDMMYYYY} from '../utils/format';`;
        }
        return match;
      });
    } else {
      content = content.replace(/import React/, "import { formatDateToDDMMYYYY } from '../utils/format';\nimport React");
    }
  }
  
  fs.writeFileSync(filepath, content);
};

fixFile('src/components/BackupModal.tsx', true);
fixFile('src/components/FinancialReportsView.tsx', true);
fixFile('src/components/ZeroBasedBudgetView.tsx', true);
fixFile('src/components/TransactionsView.tsx', true);

