const fs = require('fs');

function fixStr(str) {
  return str.replace(/"(.*)\$\{new Date\(\)\.toISOString\(\)\.substring\(0, 10\)\}(.*)"/, "`$1\\${new Date().toISOString().substring(0, 10)}$2`");
}

let backup = fs.readFileSync('src/components/BackupModal.tsx', 'utf8');
backup = fixStr(backup);
fs.writeFileSync('src/components/BackupModal.tsx', backup);

let fin = fs.readFileSync('src/components/FinancialReportsView.tsx', 'utf8');
fin = fixStr(fin);
fin = fixStr(fin);
fs.writeFileSync('src/components/FinancialReportsView.tsx', fin);

let budget = fs.readFileSync('src/components/ZeroBasedBudgetView.tsx', 'utf8');
budget = fixStr(budget);
budget = fixStr(budget);
fs.writeFileSync('src/components/ZeroBasedBudgetView.tsx', budget);

let tx = fs.readFileSync('src/components/TransactionsView.tsx', 'utf8');
tx = fixStr(tx);
fs.writeFileSync('src/components/TransactionsView.tsx', tx);

