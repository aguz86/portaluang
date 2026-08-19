const fs = require('fs');
let data = fs.readFileSync('src/components/ZeroBasedBudgetView.tsx', 'utf8');

data = data.replace(
  /const monthTransactions = transactions\.filter\(\(t\) => t\.date\.startsWith\(currentMonth\)\);/,
  `const effectiveTransactions = printDateRange 
    ? transactions.filter(t => t.date >= printDateRange.start && t.date <= printDateRange.end)
    : transactions;
  
  const monthTransactions = printDateRange 
    ? effectiveTransactions 
    : transactions.filter((t) => t.date.startsWith(currentMonth));`
);

fs.writeFileSync('src/components/ZeroBasedBudgetView.tsx', data);
