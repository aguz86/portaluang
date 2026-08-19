const fs = require('fs');
let data = fs.readFileSync('src/components/FinancialReportsView.tsx', 'utf8');

data = data.replace(
  /const monthTransactions = transactions\.filter\(\(t\) => t\.date\.startsWith\(currentMonth\)\);/,
  `const effectiveTransactions = printDateRange 
    ? transactions.filter(t => t.date >= printDateRange.start && t.date <= printDateRange.end)
    : transactions;
  
  // Use effectiveTransactions for the report instead of just current month if date range is set, otherwise default to current month for overview? 
  // Wait, if printDateRange is set, we use effectiveTransactions, otherwise monthTransactions.
  const monthTransactions = printDateRange 
    ? effectiveTransactions 
    : transactions.filter((t) => t.date.startsWith(currentMonth));`
);

fs.writeFileSync('src/components/FinancialReportsView.tsx', data);
