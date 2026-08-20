import { Account, Bill, BudgetCategory, NetWorthSnapshot, PaydayConfig, SinkingFund, Transaction, Investment, NotificationSettings } from '../types';

export const INITIAL_NOTIFICATION_SETTINGS: NotificationSettings = {
  telegramChatId: '',
  telegramUsername: '',
  telegramFirstName: '',
  telegramLinkedAt: '',
  telegramEnabled: false,
  pushEnabled: false,
  dueReminderDays: 3,
};

export const INITIAL_INVESTMENTS: Investment[] = [];
export const INITIAL_ACCOUNTS: Account[] = [];
export const INITIAL_BUDGET_CATEGORIES: BudgetCategory[] = [
  { id: 'cat-inc-1', group: 'Pemasukan', name: 'Gaji Utama', planned: 0, icon: 'Briefcase' },
  { id: 'cat-fb-1', group: 'Tagihan Tetap', name: 'Sewa Kontrakan / Tempat Tinggal', planned: 0, icon: 'Home' },
  { id: 'cat-fb-2', group: 'Tagihan Tetap', name: 'Listrik & Air', planned: 0, icon: 'Zap' },
  { id: 'cat-ve-1', group: 'Pengeluaran Variabel', name: 'Belanja Bulanan', planned: 0, icon: 'ShoppingCart' },
  { id: 'cat-sf-1', group: 'Pos Sinking Fund', name: 'Dana Darurat', planned: 0, icon: 'Shield' },
  { id: 'cat-dp-1', group: 'Pelunasan Utang', name: 'Cicilan Kendaraan', planned: 0, icon: 'Car' }
];

export const INITIAL_BILLS: Bill[] = [];
export const INITIAL_SINKING_FUNDS: SinkingFund[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_PAYDAY_CONFIG: PaydayConfig = {
  frequency: 'monthly',
  nextDate: new Date().toISOString().slice(0, 10),
  expectedIncome: 0,
  rules: [],
};

export const INITIAL_NET_WORTH_SNAPSHOTS: NetWorthSnapshot[] = [];
