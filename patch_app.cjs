const fs = require('fs');

const appPath = 'src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');

if (!appContent.includes("AdminSecurity")) {
    appContent = appContent.replace(
        "import { AdminSettings } from './pages/admin/AdminSettings';",
        "import { AdminSettings } from './pages/admin/AdminSettings';\nimport { AdminSecurity } from './pages/admin/AdminSecurity';"
    );
    appContent = appContent.replace(
        "<Route path=\"settings\" element={<AdminSettings />} />",
        "<Route path=\"security\" element={<AdminSecurity />} />\n          <Route path=\"settings\" element={<AdminSettings />} />"
    );
    fs.writeFileSync(appPath, appContent, 'utf8');
}
