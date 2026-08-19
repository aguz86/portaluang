const fs = require('fs');
let data = fs.readFileSync('src/components/FinancialReportsView.tsx', 'utf8');

data = data.replace(
  /const \[copied,\s*setCopied\] = useState\(false\);/,
  `const [copied, setCopied] = useState(false);\n  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });\n  const [printDateRange, setPrintDateRange] = useState<{start: string, end: string} | null>(null);`
);

fs.writeFileSync('src/components/FinancialReportsView.tsx', data);
