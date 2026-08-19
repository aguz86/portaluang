const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  /res\.json\(\{ success: true, pixelId: result\.rows\[0\]\.data\.pixelId, socials: result\.rows\[0\]\.data\.socials \}\);/,
  `res.json({ 
          success: true, 
          pixelId: result.rows[0].data.pixelId, 
          socials: result.rows[0].data.socials,
          appName: result.rows[0].data.appName || 'AuraLedger',
          appVersion: result.rows[0].data.appVersion || '1.0.0',
          supportEmail: result.rows[0].data.supportEmail || 'support@auraledger.com'
        });`
);

fs.writeFileSync('server.ts', content);
