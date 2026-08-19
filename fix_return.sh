#!/bin/bash
sed -i 's|return (|return (\n    <>\n      <ExportDateRangeModal\n        isOpen={exportModalConfig.isOpen}\n        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}\n        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}\n        transactions={transactions}\n        exportType={exportModalConfig.type}\n      />|' src/components/TransactionsView.tsx

# Replace the last line
sed -i 's|</script>|</script>|' src/components/TransactionsView.tsx # dummy
