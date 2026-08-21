const fs = require('fs');
let content = fs.readFileSync('server/duitku.ts', 'utf8');

const getDuitkuConfigTarget = `export async function getDuitkuConfig(pool: any): Promise<DuitkuConfig> {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
    if (result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      return {
        merchantCode: process.env.DUITKU_MERCHANT_CODE || data.duitkuMerchantCode || DEFAULT_CONFIG.merchantCode,
        apiKey: process.env.DUITKU_API_KEY || data.duitkuApiKey || DEFAULT_CONFIG.apiKey,
        env: (process.env.DUITKU_ENV as 'sandbox' | 'production') || data.duitkuEnv || DEFAULT_CONFIG.env,
      };
    }
  } catch (err) {
    console.error('Error loading Duitku settings from DB:', err);
  }
  return DEFAULT_CONFIG;
}`;

const getDuitkuConfigReplacement = `export async function getDuitkuConfig(pool: any): Promise<DuitkuConfig> {
  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
    if (result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      const env = (process.env.DUITKU_ENV as 'sandbox' | 'production') || data.duitkuEnv || DEFAULT_CONFIG.env;
      
      let merchantCode = env === 'production' 
        ? (data.duitkuProductionMerchantCode || data.duitkuMerchantCode || '') 
        : (data.duitkuSandboxMerchantCode || data.duitkuMerchantCode || DEFAULT_CONFIG.merchantCode);
        
      let apiKey = env === 'production' 
        ? (data.duitkuProductionApiKey || data.duitkuApiKey || '') 
        : (data.duitkuSandboxApiKey || data.duitkuApiKey || DEFAULT_CONFIG.apiKey);

      return {
        merchantCode: process.env.DUITKU_MERCHANT_CODE || merchantCode,
        apiKey: process.env.DUITKU_API_KEY || apiKey,
        env,
      };
    }
  } catch (err) {
    console.error('Error loading Duitku settings from DB:', err);
  }
  return DEFAULT_CONFIG;
}`;

content = content.replace(getDuitkuConfigTarget, getDuitkuConfigReplacement);

const txInterfaceTarget = `  createdAt: string;
  paidAt?: string;
  duitkuResponse?: any;
}`;

const txInterfaceReplacement = `  createdAt: string;
  paidAt?: string;
  duitkuResponse?: any;
  env?: 'sandbox' | 'production';
}`;

content = content.replace(txInterfaceTarget, txInterfaceReplacement);

fs.writeFileSync('server/duitku.ts', content);
