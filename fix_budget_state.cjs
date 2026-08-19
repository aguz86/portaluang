const fs = require('fs');
let data = fs.readFileSync('src/components/ZeroBasedBudgetView.tsx', 'utf8');

data = data.replace(
  /import React,\s*\{\s*useState\s*\}\s*from 'react';/,
  `import { ExportDateRangeModal } from "./ExportDateRangeModal";\nimport React, { useState } from 'react';`
);

data = data.replace(
  /const \[copied,\s*setCopied\] = useState\(false\);/,
  `const [copied, setCopied] = useState(false);\n  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });\n  const [printDateRange, setPrintDateRange] = useState<{start: string, end: string} | null>(null);`
);

fs.writeFileSync('src/components/ZeroBasedBudgetView.tsx', data);
