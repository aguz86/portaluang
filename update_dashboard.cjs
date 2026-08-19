const fs = require('fs');

let content = fs.readFileSync('src/DashboardApp.tsx', 'utf8');
content = content.replace(
  /import \{ FinancialReportsView \} from '.\/components\/FinancialReportsView';/,
  "import { FinancialReportsView } from './components/FinancialReportsView';\nimport { ProfileView } from './components/ProfileView';"
);

content = content.replace(
  /<Route path="reports" element=\{/,
  "<Route path=\"profile\" element={<ProfileView />} />\n        <Route path=\"reports\" element={"
);

fs.writeFileSync('src/DashboardApp.tsx', content);
