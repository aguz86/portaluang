const fs = require('fs');
let content = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

content = content.replace(
  "const isTrial = selectedPlan.id === 'free_trial';",
  "const isTrial = selectedPlan.price === 0;"
);

content = content.replace(
  "activateUserPlan('free_trial', 'Free Trial (Rp 0)', 0, invoiceId);",
  "activateUserPlan(selectedPlan.id, 'Free Trial (Rp 0)', 0, invoiceId);"
);

fs.writeFileSync('src/pages/Checkout.tsx', content);
