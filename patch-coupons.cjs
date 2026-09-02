const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!app.includes('AdminCoupons')) {
  app = app.replace(
    "import { AdminFAQs } from './pages/admin/AdminFAQs';",
    "import { AdminFAQs } from './pages/admin/AdminFAQs';\nimport { AdminCoupons } from './pages/admin/AdminCoupons';"
  );
  
  // Add route
  app = app.replace(
    '<Route path="faqs" element={<AdminFAQs />} />',
    '<Route path="faqs" element={<AdminFAQs />} />\n          <Route path="coupons" element={<AdminCoupons />} />'
  );
  fs.writeFileSync('src/App.tsx', app);
  console.log('Added AdminCoupons to App.tsx');
}

let layout = fs.readFileSync('src/pages/admin/AdminLayout.tsx', 'utf8');
if (!layout.includes('/admin/coupons')) {
  layout = layout.replace(
    "{ path: '/admin/subscriptions', label: 'Subscriptions', icon: <PackageSearch className=\"w-5 h-5\" /> },",
    "{ path: '/admin/subscriptions', label: 'Subscriptions', icon: <PackageSearch className=\"w-5 h-5\" /> },\n  { path: '/admin/coupons', label: 'Kupon Diskon', icon: <Ticket className=\"w-5 h-5\" /> },"
  );
  
  if (!layout.includes('Ticket')) {
    layout = layout.replace(
      "import { ",
      "import { Ticket, "
    );
  }
  fs.writeFileSync('src/pages/admin/AdminLayout.tsx', layout);
  console.log('Added AdminCoupons to AdminLayout.tsx');
}
