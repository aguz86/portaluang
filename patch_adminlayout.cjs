const fs = require('fs');

const layoutPath = 'src/pages/admin/AdminLayout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

if (!layoutContent.includes("label: 'Security'")) {
    const searchStr = "{ path: '/admin/settings', label: 'Settings', icon: <Settings className=\"w-5 h-5\" /> },";
    const replaceStr = "{ path: '/admin/security', label: 'Security', icon: <ShieldCheck className=\"w-5 h-5\" /> },\n  " + searchStr;
    layoutContent = layoutContent.replace(searchStr, replaceStr);

    if (!layoutContent.includes('ShieldCheck')) {
        layoutContent = layoutContent.replace('Settings,', 'Settings, ShieldCheck,');
    }
    fs.writeFileSync(layoutPath, layoutContent, 'utf8');
}
