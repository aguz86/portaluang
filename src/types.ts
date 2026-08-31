export type TransactionType = 'expense' | 'income' | 'transfer' | 'sinking_fund';
export type TransactionStatus = 'cleared' | 'pending';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: string;
  subcategory?: string;
  accountId: string;
  payee: string;
  notes?: string;
  status: TransactionStatus;
  tags?: string[];
  sinkingFundId?: string;
}

export type AccountCategory = 'asset' | 'liability';
export type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'credit_card' | 'mortgage' | 'student_loan' | 'auto_loan' | 'personal_loan';

export interface Account {
  id: string;
  name: string;
  category: AccountCategory;
  type: AccountType;
  balance: number; // positif untuk aset, nilai positif untuk saldo hutang
  institution?: string;
  apr?: number; // bunga untuk hutang atau imbal hasil tabungan
  minPayment?: number; // cicilan minimum
  creditLimit?: number; // limit kartu kredit
  notes?: string;
  updatedAt: string;
}

export type BudgetGroup = 'Pemasukan' | 'Tagihan Tetap' | 'Pengeluaran Variabel' | 'Pos Sinking Fund' | 'Pelunasan Hutang' | 'Tabungan & Investasi';

export interface BudgetCategory {
  id: string;
  group: BudgetGroup;
  name: string;
  planned: number;
  actual?: number;
  icon?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: number; // Tanggal dalam bulan 1-31
  category: string;
  accountId: string;
  isPaid: boolean;
  autoPay: boolean;
  recurringFrequency: 'monthly' | 'weekly' | 'yearly';
  notes?: string;
  paidTransactionId?: string;
  paidAt?: string;
}

export interface SinkingFund {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  category: string;
  icon?: string;
  monthlyContrib: number;
  notes?: string;
}

export interface PaydayRule {
  categoryId: string;
  categoryName: string;
  type: 'percent' | 'fixed';
  value: number; // contoh: 10% atau Rp 500.000
}

export interface PaydayConfig {
  frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  nextDate: string;
  expectedIncome: number;
  rules: PaydayRule[];
}

export interface NetWorthSnapshot {
  id: string;
  date: string; // YYYY-MM
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  notes?: string;
}

export interface NotificationSettings {
  telegramChatId: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLinkedAt?: string;
  telegramEnabled: boolean;
  pushEnabled: boolean;
  dueReminderDays: number;
  dailyReminderNote?: string;
  dailyReminderTime?: string;
  dailyReminderEnabled?: boolean;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'zero_based' 
  | 'transactions' 
  | 'bills' 
  | 'sinking_funds' 
  | 'accounts_debt' 
  | 'net_worth' 
  | 'payday' 
  | 'reports' 
  | 'guide'
  | 'investments'
  | 'settings';

export type InvestmentCategory = 'logam_mulia' | 'saham' | 'reksadana' | 'obligasi';

export interface Investment {
  id: string;
  category: InvestmentCategory;
  name: string;
  ticker?: string; // e.g. BBCA.JK, BMRI.JK
  quantity: number; // units/grams/lots
  averageBuyPrice: number;
  currentPrice?: number; // Fetched from API
  lastUpdated?: string;
}


export type ThemeMode = 
  | 'amber_dark'
  | 'wordpress_blue'
  | 'aurora_finance'
  | 'wealth_elite'
  | 'cyber_matrix'
  | 'mono_matrix'
  | 'retro_pixel';

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

