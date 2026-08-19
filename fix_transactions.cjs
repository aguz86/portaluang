const fs = require('fs');
let data = fs.readFileSync('src/components/TransactionsView.tsx', 'utf8');

// The modal was injected incorrectly inside the map function.
// Let's remove the modal and the `<>` from inside the map function.
const wrongModalRegex = /    <>\n      <ExportDateRangeModal\n        isOpen=\{exportModalConfig\.isOpen\}\n        onClose=\{\(\) => setExportModalConfig\(\{ \.\.\.exportModalConfig, isOpen: false \}\)\}\n        onConfirm=\{exportModalConfig\.type === "pdf" \? executePrint : executeExportGoogleSheets\}\n        transactions=\{transactions\}\n        exportType=\{exportModalConfig\.type\}\n      \/>\n/g;

data = data.replace(wrongModalRegex, '');

// Also, the <div id="transactions-view"> was replaced with the modal but wait, if it was inside the map, how did it get there?
// Let's just remove the first `<>` after `return (` in the map function if it's there.
// Actually, let's just make sure the `return (` in the map function returns `<tr`
data = data.replace(/return \(\s*<tr key=\{tx\.id\}/, 'return (\n                  <tr key={tx.id}');


// Make sure the modal is actually at the beginning of the component's main return.
const mainReturnRegex = /return \(\s*<div id="transactions-view"/;
if (mainReturnRegex.test(data)) {
  data = data.replace(mainReturnRegex, `return (
    <>
      <ExportDateRangeModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}
        transactions={transactions}
        exportType={exportModalConfig.type}
      />
      <div id="transactions-view"`);
}

fs.writeFileSync('src/components/TransactionsView.tsx', data);
