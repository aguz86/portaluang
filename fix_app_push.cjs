const fs = require('fs');

let content = fs.readFileSync('src/DashboardApp.tsx', 'utf8');

content = content.replace(
  /dalam 3 hari ke depan/g,
  `dalam \${notificationSettings.dueReminderDays || 3} hari ke depan`
);

content = content.replace(
  /Ada tagihan yang harus dibayar dalam \$\{notificationSettings\.dueReminderDays \|\| 3\} hari ke depan\./g,
  "Ada tagihan yang harus dibayar dalam ${notificationSettings.dueReminderDays || 3} hari ke depan."
);

fs.writeFileSync('src/DashboardApp.tsx', content);
