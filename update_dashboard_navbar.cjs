const fs = require('fs');

let content = fs.readFileSync('src/DashboardApp.tsx', 'utf8');

content = content.replace(
  /<Navbar\s+isCloudSyncing=\{isCloudSyncing\}\s+themeMode=\{themeMode\}\s+setThemeMode=\{setThemeMode\}\s+onOpenQuickAdd=\{\(\) => setIsQuickAddOpen\(true\)\}\s+onOpenAiAdvisor=\{\(\) => setIsAiAdvisorOpen\(true\)\}\s+onOpenBackupModal=\{\(\) => setIsBackupOpen\(true\)\}\s+onResetData=\{handleResetData\}\s+unassignedCash=\{unassignedCash\}\s+hasDueBills=\{hasDueBills\}\s+\/>/,
  `<Navbar
        isCloudSyncing={isCloudSyncing}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        onResetData={handleResetData}
        unassignedCash={unassignedCash}
        hasDueBills={hasDueBills}
        bills={bills}
        transactions={transactions}
        budgetCategories={budgetCategories}
        notificationSettings={notificationSettings}
      />`
);

fs.writeFileSync('src/DashboardApp.tsx', content);
