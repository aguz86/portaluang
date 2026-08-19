const fs = require('fs');
let data = fs.readFileSync('src/components/FinancialReportsView.tsx', 'utf8');

data = data.replace(
  /return \(\s*<div id="financial-reports-view"/,
  `return (
    <>
      <ExportDateRangeModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}
        transactions={transactions}
        exportType={exportModalConfig.type}
      />
      <div id="financial-reports-view"`
);

data = data.replace(/    <\/div>\n  \);\n\};/g, '    </div>\n    </>\n  );\n};');

fs.writeFileSync('src/components/FinancialReportsView.tsx', data);
