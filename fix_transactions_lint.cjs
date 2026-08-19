const fs = require('fs');
let content = fs.readFileSync('src/components/TransactionsView.tsx', 'utf8');

content = content.replace(
  /\}, 300\);\n    \}\);/,
  `    });\n    }, 300);`
);

fs.writeFileSync('src/components/TransactionsView.tsx', content);
