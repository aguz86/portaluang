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
  env?: 'sandbox' | 'production' | 'compensation';
  isCompensation?: boolean;
  bonusDays?: number;
  reason?: string;
  newExpiresAt?: string;
}

export function getDuitkuEnvFromServer(): 'sandbox' | 'production' {
  const raw = (process.env.DUITKU_ENV || '').trim().toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

export async function getDuitkuConfig(pool: any): Promise<DuitkuConfig> {
  // Mode sandbox/production strictly comes from server ENV (DUITKU_ENV) and cannot be overridden via DB or Admin UI
  const env: 'sandbox' | 'production' = getDuitkuEnvFromServer();
  let sandboxWhitelist: string[] = [];

  try {
    const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
    if (result.rows.length > 0 && result.rows[0].data) {
      const data = result.rows[0].data;
      if (data.duitkuSandboxWhitelist) {
        sandboxWhitelist = String(data.duitkuSandboxWhitelist)
          .split(',')
          .map((e: string) => e.trim().toLowerCase())
          .filter(Boolean);
      }
    }
  } catch (err) {
    console.error('Error loading Duitku whitelist settings from DB:', err);
  }

  // All Duitku credentials (merchantCode & apiKey) MUST come strictly from environment variables
  const merchantCode = (
    env === 'production'
      ? (process.env.DUITKU_PRODUCTION_MERCHANT_CODE || process.env.DUITKU_MERCHANT_CODE || '')
      : (process.env.DUITKU_SANDBOX_MERCHANT_CODE || process.env.DUITKU_MERCHANT_CODE || '')
  ).trim();

  const apiKey = (
    env === 'production'
      ? (process.env.DUITKU_PRODUCTION_API_KEY || process.env.DUITKU_API_KEY || '')
      : (process.env.DUITKU_SANDBOX_API_KEY || process.env.DUITKU_API_KEY || '')
  ).trim();

  return {
    merchantCode,
    apiKey,
    env,
    sandboxWhitelist,
  };
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
export const DUITKU_CHANNELS: Record<string, { code: string; name: string; type: 'qris' | 'va' | 'ewallet' | 'retail' | 'cc'; icon: string }> = {
  qris: { code: 'NQ', name: 'QRIS Standar Nasional (BCA, GoPay, OVO, ShopeePay, Dana)', type: 'qris', icon: 'QrCode' },
  qris_nobu: { code: 'NQ', name: 'QRIS Nobu', type: 'qris', icon: 'QrCode' },
  qris_shopee: { code: 'SP', name: 'ShopeePay QRIS', type: 'qris', icon: 'QrCode' },
  qris_linkaja: { code: 'LQ', name: 'LinkAja QRIS', type: 'qris', icon: 'QrCode' },
  qris_aq: { code: 'AQ', name: 'QRIS App', type: 'qris', icon: 'QrCode' },
  qris_sq: { code: 'SQ', name: 'Nusapay QRIS', type: 'qris', icon: 'QrCode' },
  va_bca: { code: 'BC', name: 'BCA Virtual Account', type: 'va', icon: 'Building2' },
  va_mandiri: { code: 'M2', name: 'Mandiri Virtual Account (Livin)', type: 'va', icon: 'Building2' },
  va_mandiri_h2h: { code: 'M1', name: 'Mandiri Virtual Account', type: 'va', icon: 'Building2' },
  va_bri: { code: 'BR', name: 'BRI Virtual Account (BRIVA)', type: 'va', icon: 'Building2' },
  va_bni: { code: 'B1', name: 'BNI Virtual Account', type: 'va', icon: 'Building2' },
  va_bni_alt: { code: 'I1', name: 'BNI Virtual Account', type: 'va', icon: 'Building2' },
  va_cimb: { code: 'NC', name: 'CIMB Niaga Virtual Account', type: 'va', icon: 'Building2' },
  va_cimb_alt: { code: 'B4', name: 'CIMB Niaga Virtual Account', type: 'va', icon: 'Building2' },
  va_permata: { code: 'VA', name: 'Permata Bank Virtual Account', type: 'va', icon: 'Building2' },
  va_permata_alt: { code: 'BT', name: 'Permata Bank Virtual Account', type: 'va', icon: 'Building2' },
  va_sampoerna: { code: 'S1', name: 'Bank Sahabat Sampoerna VA', type: 'va', icon: 'Building2' },
  va_maybank: { code: 'MB', name: 'Maybank Virtual Account', type: 'va', icon: 'Building2' },
  va_atm_bersama: { code: 'A1', name: 'ATM Bersama Virtual Account', type: 'va', icon: 'Building2' },
  va_bsi: { code: 'BV', name: 'BSI Virtual Account', type: 'va', icon: 'Building2' },
  va_artha: { code: 'AG', name: 'Bank Artha Graha VA', type: 'va', icon: 'Building2' },
  ewallet_gopay: { code: 'GP', name: 'GoPay Direct', type: 'ewallet', icon: 'Smartphone' },
  ewallet_shopee: { code: 'SA', name: 'ShopeePay App', type: 'ewallet', icon: 'Smartphone' },
  ewallet_ovo: { code: 'OV', name: 'OVO Push Payment', type: 'ewallet', icon: 'Smartphone' },
  ewallet_dana: { code: 'DA', name: 'DANA Checkout', type: 'ewallet', icon: 'Smartphone' },
  ewallet_linkaja: { code: 'LA', name: 'LinkAja App', type: 'ewallet', icon: 'Smartphone' },
  retail_pos: { code: 'FT', name: 'Retail (Alfamart / Pegadaian / POS)', type: 'retail', icon: 'Wallet' },
  retail_indomaret: { code: 'IR', name: 'Indomaret', type: 'retail', icon: 'Wallet' },
  retail_alfamart: { code: 'AL', name: 'Alfamart', type: 'retail', icon: 'Wallet' },
  credit_card: { code: 'VC', name: 'Kartu Kredit (Visa / Mastercard / JCB)', type: 'cc', icon: 'CreditCard' }
};

export function resolveDuitkuChannel(
  paymentMethod: string,
  customName?: string
): { code: string; name: string; type: 'qris' | 'va' | 'ewallet' | 'retail' | 'cc'; icon: string } {
  const raw = (paymentMethod || '').trim();
  if (DUITKU_CHANNELS[raw]) {
    const ch = DUITKU_CHANNELS[raw];
    return customName ? { ...ch, name: customName } : ch;
  }

  const upper = raw.toUpperCase();
  const byCode = Object.values(DUITKU_CHANNELS).find(c => c.code === upper);
  if (byCode) {
    return customName ? { ...byCode, name: customName } : byCode;
  }

  // Always preserve valid 2-character Duitku channel codes (never overwrite to QRIS!)
  if (/^[A-Z0-9]{2}$/.test(upper)) {
    const qrisCodes = new Set(['NQ', 'LQ', 'AQ', 'SQ', 'DQ', 'GQ']);
    const retailCodes = new Set(['FT', 'IR', 'AL', 'R1']);
    const ewalletCodes = new Set(['GP', 'SP', 'SA', 'OV', 'DA', 'LA', 'SL', 'OL']);
    const ccCodes = new Set(['VC', 'DN']);
    const type: 'qris' | 'va' | 'ewallet' | 'retail' | 'cc' = qrisCodes.has(upper)
      ? 'qris'
      : retailCodes.has(upper)
      ? 'retail'
      : ewalletCodes.has(upper)
      ? 'ewallet'
      : ccCodes.has(upper)
      ? 'cc'
      : 'va';

    return {
      code: upper,
      name: customName || `Duitku (${upper})`,
      type,
      icon: type === 'qris' ? 'QrCode' : type === 'va' ? 'Building2' : 'Wallet',
    };
  }

  return DUITKU_CHANNELS['qris'];
}

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
    // Keep last 2000 transactions (supports 1000+ user compensation batches)
    const trimmed = current.slice(0, 2000);
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) 
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ['duitku_transactions', JSON.stringify(trimmed)]
    );
  } catch (err) {
    console.error('Error saving transaction:', err);
  }
}

export async function saveTransactionsBatch(pool: any, txs: DuitkuTransaction[]): Promise<void> {
  if (!Array.isArray(txs) || txs.length === 0) return;
  try {
    const current = await getAllTransactions(pool);
    const map = new Map<string, DuitkuTransaction>();
    for (const tx of txs) {
      map.set(tx.merchantOrderId, tx);
    }
    const merged: DuitkuTransaction[] = [...txs];
    for (const item of current) {
      if (!map.has(item.merchantOrderId)) {
        merged.push(item);
      }
    }
    const trimmed = merged.slice(0, 2000);
    await pool.query(
      `INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) 
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      ['duitku_transactions', JSON.stringify(trimmed)]
    );
  } catch (err) {
    console.error('Error batch saving transactions:', err);
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
