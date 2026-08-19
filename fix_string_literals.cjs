const fs = require('fs');
let content = fs.readFileSync('src/DashboardApp.tsx', 'utf8');

content = content.replace(
  /body: 'Ada tagihan yang harus dibayar dalam \$\{notificationSettings\.dueReminderDays \|\| 3\} hari ke depan\. Cek tab Kalender Tagihan Anda\.'/g,
  "body: `Ada tagihan yang harus dibayar dalam ${notificationSettings.dueReminderDays || 3} hari ke depan. Cek tab Kalender Tagihan Anda.`"
);

content = content.replace(
  /message: '⚠️ AuraLedger Reminder:\\n\\nAda tagihan jatuh tempo dalam \$\{notificationSettings\.dueReminderDays \|\| 3\} hari ke depan\. Segera periksa aplikasi Anda\.'/g,
  "message: `⚠️ AuraLedger Reminder:\\n\\nAda tagihan jatuh tempo dalam ${notificationSettings.dueReminderDays || 3} hari ke depan. Segera periksa aplikasi Anda.`"
);

fs.writeFileSync('src/DashboardApp.tsx', content);
