const fs = require('fs');
let data = fs.readFileSync('src/components/FinancialReportsView.tsx', 'utf8');

data = data.replace(
  /const executeExportGoogleSheets = \(startDate: string, endDate: string\) => \{/,
  `const executeExportGoogleSheets = (startDate: string, endDate: string) => {
    setPrintDateRange({ start: startDate, end: endDate });
    setTimeout(() => {
      exportGoogleSheetsInternal();
      setTimeout(() => setPrintDateRange(null), 500);
    }, 300);
  };
  const exportGoogleSheetsInternal = () => {`
);

fs.writeFileSync('src/components/FinancialReportsView.tsx', data);
