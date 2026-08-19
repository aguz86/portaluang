const fs = require('fs');
let data = fs.readFileSync('src/components/TransactionsView.tsx', 'utf8');

// Restore HighlightText
data = data.replace(
  /const HighlightText = \(\{[^\}]+\}\) => \{.*?return \(\s*<>\s*<ExportDateRangeModal.*?<>\s*\{parts\.map/s,
  `const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <>{text}</>;
  const regex = new RegExp(\`(\${highlight})\`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map`
);

// We need to inject the modal right after `return (` in `TransactionsView`
// The `TransactionsView` return starts around line 125, it's `return (\n    <div id="transactions-view" className="space-y-6">`
data = data.replace(
  /return \(\s*<div id="transactions-view"/,
  `return (
    <>
      <ExportDateRangeModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}
        transactions={transactions}
        exportType={exportModalConfig.type}
      />
    <div id="transactions-view"`
);

fs.writeFileSync('src/components/TransactionsView.tsx', data);
