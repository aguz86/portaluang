const fs = require('fs');
let content = fs.readFileSync('server/duitku.ts', 'utf8');

const targetImport = `import crypto from 'crypto';`;
const replacementImport = `import crypto from 'crypto';\nimport { decrypt } from './cryptoUtils';`;
content = content.replace(targetImport, replacementImport);

const targetApiKey = `      let apiKey = env === 'production' 
        ? (data.duitkuProductionApiKey || data.duitkuApiKey || '') 
        : (data.duitkuSandboxApiKey || data.duitkuApiKey || DEFAULT_CONFIG.apiKey);`;

const replacementApiKey = `      let apiKey = env === 'production' 
        ? (data.duitkuProductionApiKey || data.duitkuApiKey || '') 
        : (data.duitkuSandboxApiKey || data.duitkuApiKey || DEFAULT_CONFIG.apiKey);

      apiKey = decrypt(apiKey);`;
content = content.replace(targetApiKey, replacementApiKey);

fs.writeFileSync('server/duitku.ts', content);
