const fs = require('fs');
let data = fs.readFileSync('src/components/ZeroBasedBudgetView.tsx', 'utf8');

// Imports
data = data.replace(
  /import React,\s*\{\s*useState,\s*useMemo\s*\}\s*from 'react';/,
  `import { ExportDateRangeModal } from "./ExportDateRangeModal";\nimport React, { useState, useMemo } from 'react';`
);

// State
data = data.replace(
  /const \[expandedGroups,\s*setExpandedGroups\]\s*=\s*useState<Record<string,\s*boolean>>\(\{\}\);/,
  `const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});\n  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });\n  const [printDateRange, setPrintDateRange] = useState<{start: string, end: string} | null>(null);`
);

// Handlers
data = data.replace(
  /const handlePrint = \(\) => \{[\s\S]*?\};\n/,
  `const handlePrint = () => { setExportModalConfig({ isOpen: true, type: "pdf" }); };\n  const executePrint = (startDate: string, endDate: string) => { setPrintDateRange({ start: startDate, end: endDate }); setTimeout(() => { import('../utils/pdfGenerator').then(({ generatePDF }) => { generatePDF('zero-based-budget-view', 'Laporan_Anggaran.pdf'); setTimeout(() => setPrintDateRange(null), 500); }); }, 300); };\n`
);

data = data.replace(
  /const handleExportGoogleSheets = \(\) => \{/,
  `const handleExportGoogleSheets = () => { setExportModalConfig({ isOpen: true, type: "csv" }); };\n  const executeExportGoogleSheets = (startDate: string, endDate: string) => {\n    setPrintDateRange({ start: startDate, end: endDate });\n    setTimeout(() => {\n      exportGoogleSheetsInternal();\n      setTimeout(() => setPrintDateRange(null), 500);\n    }, 300);\n  };\n  const exportGoogleSheetsInternal = () => {`
);

// Add modal to return
data = data.replace(
  /return \(\s*<div id="zero-based-budget-view"/,
  `return (
    <>
      <ExportDateRangeModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}
        transactions={transactions}
        exportType={exportModalConfig.type}
      />
      <div id="zero-based-budget-view"`
);

// Close fragment
data = data.replace(/    <\/div>\n  \);\n\};/g, '    </div>\n    </>\n  );\n};');

fs.writeFileSync('src/components/ZeroBasedBudgetView.tsx', data);
