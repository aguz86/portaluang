const fs = require('fs');
let data = fs.readFileSync('src/components/FinancialReportsView.tsx', 'utf8');

// Imports
data = data.replace(
  /import React,\s*\{\s*useState,\s*useMemo\s*\}\s*from 'react';/,
  `import { ExportDateRangeModal } from "./ExportDateRangeModal";\nimport React, { useState, useMemo } from 'react';`
);

// State
data = data.replace(
  /const \[activeTab, setActiveTab\] = useState\('overview'\);/,
  `const [activeTab, setActiveTab] = useState('overview');\n  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });\n  const [printDateRange, setPrintDateRange] = useState<{start: string, end: string} | null>(null);`
);

// Handlers
data = data.replace(
  /const handlePrint = \(\) => \{[\s\S]*?\};\n/,
  `const handlePrint = () => { setExportModalConfig({ isOpen: true, type: "pdf" }); };\n  const executePrint = (startDate: string, endDate: string) => { setPrintDateRange({ start: startDate, end: endDate }); setTimeout(() => { import('../utils/pdfGenerator').then(({ generatePDF }) => { generatePDF('financial-reports-view', 'Laporan_Keuangan.pdf'); setTimeout(() => setPrintDateRange(null), 500); }); }, 300); };\n`
);

data = data.replace(
  /const handleExportGoogleSheets = \(\) => \{/,
  `const handleExportGoogleSheets = () => { setExportModalConfig({ isOpen: true, type: "csv" }); };\n  const executeExportGoogleSheets = (startDate: string, endDate: string) => {`
);

// We need to filter `transactions` in executeExportGoogleSheets if it's there.
// But FinancialReportsView might just export the category breakdown! Let's check how it exports.
fs.writeFileSync('src/components/FinancialReportsView.tsx', data);
