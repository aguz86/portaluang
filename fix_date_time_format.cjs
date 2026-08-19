const fs = require('fs');

let formatContent = fs.readFileSync('src/utils/format.ts', 'utf8');
formatContent += `
export const formatDateToDDMMYYYY_HHMM = (date: Date = new Date()): string => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return \`\${d}\${m}\${y}_\${hh}\${mm}\`;
};
`;
fs.writeFileSync('src/utils/format.ts', formatContent);

const filesToUpdate = [
  'src/components/BackupModal.tsx',
  'src/components/FinancialReportsView.tsx',
  'src/components/ZeroBasedBudgetView.tsx',
  'src/components/TransactionsView.tsx'
];

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/formatDateToDDMMYYYY/g, 'formatDateToDDMMYYYY_HHMM');
  fs.writeFileSync(file, content);
});
