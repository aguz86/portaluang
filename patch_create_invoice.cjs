const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `        paymentUrl,
        createdAt: now.toISOString(),
        duitkuResponse: duitkuResponseData
      };

      await saveTransaction(pool, tx);`;

const replacement = `        paymentUrl,
        createdAt: now.toISOString(),
        duitkuResponse: duitkuResponseData,
        env: config.env
      };

      await saveTransaction(pool, tx);`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
