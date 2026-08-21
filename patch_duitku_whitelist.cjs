const fs = require('fs');
let content = fs.readFileSync('server/duitku.ts', 'utf8');

const target1 = `  env: 'sandbox' | 'production';
  callbackUrl?: string;
  returnUrl?: string;
}`;
const replacement1 = `  env: 'sandbox' | 'production';
  callbackUrl?: string;
  returnUrl?: string;
  sandboxWhitelist?: string[];
}`;
content = content.replace(target1, replacement1);

const target2 = `      return {
        merchantCode: process.env.DUITKU_MERCHANT_CODE || merchantCode,
        apiKey: process.env.DUITKU_API_KEY || apiKey,
        env,
      };`;
const replacement2 = `      let sandboxWhitelist: string[] = [];
      if (data.duitkuSandboxWhitelist) {
        sandboxWhitelist = data.duitkuSandboxWhitelist
          .split(',')
          .map((e: string) => e.trim().toLowerCase())
          .filter(Boolean);
      }

      return {
        merchantCode: process.env.DUITKU_MERCHANT_CODE || merchantCode,
        apiKey: process.env.DUITKU_API_KEY || apiKey,
        env,
        sandboxWhitelist
      };`;
content = content.replace(target2, replacement2);

fs.writeFileSync('server/duitku.ts', content);
