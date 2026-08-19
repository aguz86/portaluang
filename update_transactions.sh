#!/bin/bash
sed -i '1s/^/import { ExportDateRangeModal } from ".\/ExportDateRangeModal";\n/' src/components/TransactionsView.tsx

# Add state
sed -i '/const \[searchTerm/a \  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });' src/components/TransactionsView.tsx

# Modify handlers
sed -i 's/const handlePrint = () => {/const handlePrint = () => { setExportModalConfig({ isOpen: true, type: "pdf" }); };\n  const executePrint = (startDate: string, endDate: string) => {/' src/components/TransactionsView.tsx

sed -i 's/const handleExportGoogleSheets = () => {/const handleExportGoogleSheets = () => { setExportModalConfig({ isOpen: true, type: "csv" }); };\n  const executeExportGoogleSheets = (startDate: string, endDate: string) => {/' src/components/TransactionsView.tsx
