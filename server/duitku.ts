import crypto from 'crypto';
import { decrypt } from './cryptoUtils';

export interface DuitkuConfig {
  merchantCode: string;
  apiKey: string;
  env: 'sandbox' | 'production';
  callbackUrl?: string;
  returnUrl?: string;
  sandboxWhitelist?: string[];
}

export interface DuitkuTransaction {
  merchantOrderId: string;
  reference: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paymentMethodName: string;
  email: string;
  userId: string;
  customerName?: string;
  phoneNumber?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  vaNumber?: string;
  qrString?: string;
  paymentUrl?: string;
  createdAt: string;
  paidAt?: string;
  duitkuResponse?: any;
  env?: 'sandbox' | 'production';
}

// Default fallback configuration for Sandbox Testing
const DEFAULT_CONFIG: DuitkuConfig = {
  merchantCode: process.env.DUITKU_MERCHANT_CODE || 'D9821_AURA',
  apiKey: process.env.DUITKU_API_KEY || '8f3e2b1a9c4d7e6f5a0b1c2d3e4f5a6b',
  env: (process.env.DUITKU_ENV as 'sandbox' | 'production') || 'sandbox',
};

export async function getDuitkuConfig(pool: any): Promise<DuitkuConfig> {
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

      apiKey = decrypt(apiKey);

      let sandboxWhitelist: string[] = [];
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
      };
    }
  } catch (err) {
    console.error('Error loading Duitku settings from DB:', err);
  }
  return DEFAULT_CONFIG;
}

export function generateDuitkuInquirySignature(
  merchantCode: string,
  merchantOrderId: string,
  amount: number,
  apiKey: string
): string {
  const raw = `${merchantCode}${merchantOrderId}${amount}${apiKey}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

export function verifyDuitkuCallbackSignature(
  merchantCode: string,
  amount: number | string,
  merchantOrderId: string,
  signature: string,
  apiKey: string
): boolean {
  const raw = `${merchantCode}${amount}${merchantOrderId}${apiKey}`;
  const calculated = crypto.createHash('md5').update(raw).digest('hex');
  return calculated.toLowerCase() === (signature || '').toLowerCase();
}

export function generateDuitkuStatusSignature(
  merchantCode: string,
  merchantOrderId: string,
  apiKey: string
): string {
  const raw = `${merchantCode}${merchantOrderId}${apiKey}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

// Payment Channel Map
export const DUITKU_CHANNELS: Record<string, { code: string; name: string; type: 'qris' | 'va' | 'ewallet' | 'cc'; icon: string }> = {
  qris: { code: 'NQ', name: 'QRIS Standar Nasional (BCA, GoPay, OVO, ShopeePay, Dana)', type: 'qris', icon: 'QrCode' },
  va_bca: { code: 'BC', name: 'BCA Virtual Account', type: 'va', icon: 'Building2' },
  va_mandiri: { code: 'M2', name: 'Mandiri Virtual Account (Livin)', type: 'va', icon: 'Building2' },
  va_bri: { code: 'BR', name: 'BRI Virtual Account (BRIVA)', type: 'va', icon: 'Building2' },
  va_bni: { code: 'B1', name: 'BNI Virtual Account', type: 'va', icon: 'Building2' },
  va_cimb: { code: 'NC', name: 'CIMB Niaga Virtual Account', type: 'va', icon: 'Building2' },
  va_permata: { code: 'VA', name: 'Permata Bank Virtual Account', type: 'va', icon: 'Building2' },
  ewallet_gopay: { code: 'GP', name: 'GoPay Direct', type: 'ewallet', icon: 'Smartphone' },
  ewallet_shopee: { code: 'SP', name: 'ShopeePay App / QR', type: 'ewallet', icon: 'Smartphone' },
  ewallet_ovo: { code: 'OV', name: 'OVO Push Payment', type: 'ewallet', icon: 'Smartphone' },
  ewallet_dana: { code: 'DA', name: 'DANA Checkout', type: 'ewallet', icon: 'Smartphone' }
};

export async function getAllTransactions(pool: any): Promise<DuitkuTransaction[]> {
  try {
    const result = await pool.query("SELECT data FROM app_state WHERE id = 'duitku_transactions'");
    if (result.rows.length > 0 && Array.isArray(result.rows[0].data)) {
      return result.rows[0].data;
    }
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }
  return [];
}

export async function saveTransaction(pool: any, tx: DuitkuTransaction): Promise<void> {
  try {
    const current = await getAllTransactions(pool);
    const existingIndex = current.findIndex(item => item.merchantOrderId === tx.merchantOrderId);
    if (existingIndex >= 0) {
      current[existingIndex] = tx;
    } else {
      current.unshift(tx);
    }
    // Keep last 200 transactions
    const trimmed = current.slice(0, 200);
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) 
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ['duitku_transactions', JSON.stringify(trimmed)]
    );
  } catch (err) {
    console.error('Error saving transaction:', err);
  }
}

export async function updateTransactionStatus(
  pool: any,
  merchantOrderId: string,
  status: 'SUCCESS' | 'FAILED' | 'EXPIRED'
): Promise<DuitkuTransaction | null> {
  const list = await getAllTransactions(pool);
  const tx = list.find(t => t.merchantOrderId === merchantOrderId);
  if (!tx) return null;

  tx.status = status;
  if (status === 'SUCCESS') {
    tx.paidAt = new Date().toISOString();
  }
  await saveTransaction(pool, tx);
  return tx;
}
