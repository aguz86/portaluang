import { useGlobalSettings } from './hooks/useGlobalSettings';
import { FaWhatsapp, FaTiktok, FaThreads, FaInstagram, FaYoutube, FaFacebook } from 'react-icons/fa6';
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Account, 
  ActiveTab, 
  Bill, 
  BudgetCategory, 
  BudgetGroup, 
  generateId, 
  NetWorthSnapshot, 
  PaydayConfig, 
  SinkingFund, 
  ThemeMode, 
  Transaction,
  formatRupiah,
  Investment,
  NotificationSettings
} from './types';

import { 
  INITIAL_ACCOUNTS, 
  INITIAL_BILLS, 
  INITIAL_BUDGET_CATEGORIES, 
  INITIAL_NET_WORTH_SNAPSHOTS, 
  INITIAL_PAYDAY_CONFIG, 
  INITIAL_SINKING_FUNDS, 
  INITIAL_TRANSACTIONS,
  INITIAL_INVESTMENTS,
  INITIAL_NOTIFICATION_SETTINGS
} from './data/initialData';

import * as SampleData from "./data/sampleData";

import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ZeroBasedBudgetView } from './components/ZeroBasedBudgetView';
import { TransactionsView } from './components/TransactionsView';
import { BillsView } from './components/BillsView';
import { SinkingFundsView } from './components/SinkingFundsView';
import { AccountsAndDebtView } from './components/AccountsAndDebtView';
import { NetWorthView } from './components/NetWorthView';
import { IncomePaydayView } from './components/IncomePaydayView';
import { FinancialReportsView } from './components/FinancialReportsView';
import { ProfileView } from './components/ProfileView';
import { GuideView } from './components/GuideView';
import { InvestmentsView } from './components/InvestmentsView';
import { SettingsView } from './components/SettingsView';

import { QuickAddModal } from './components/QuickAddModal';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { BackupModal } from './components/BackupModal';
import { ConfirmModal } from './components/ConfirmModal';
import { InstallAppBanner } from './components/InstallAppBanner';
import { InstallAppModal } from './components/InstallAppModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'auraledger_state_v1';

const USER_ID_KEY = "auraledger_user_id";
const getUserId = () => {
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    uid = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
};


const ensureUniqueIds = <T extends { id: string }>(items: T[] | undefined, prefix: string): T[] => {
  if (!items || !Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.map((item, idx) => {
    if (!item.id || seen.has(item.id)) {
      const uniqueId = `${prefix}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      seen.add(uniqueId);
      return { ...item, id: uniqueId };
    }
    seen.add(item.id);
    return item;
  });
};


const BillingView = () => (
  <div className="p-8 bg-stone-900 border border-stone-800 rounded-2xl flex flex-col items-center justify-center text-center">
    <h2 className="text-2xl font-bold text-white mb-2">Kelola Langganan</h2>
    <p className="text-stone-400 mb-6">Anda saat ini menggunakan paket Free.</p>
    <button onClick={() => window.location.href="/app/billing/checkout"} className="px-6 py-3 bg-amber-500 text-stone-950 font-bold rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20">Upgrade ke Pro (Rp 29k/bln)</button>
  </div>
);

const BillingCheckoutView = () => (
  <div className="p-8 bg-stone-900 border border-amber-500/50 rounded-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto mt-12 shadow-2xl shadow-amber-500/10">
    <h2 className="text-2xl font-bold text-white mb-2">Checkout Portal Uang Pro</h2>
    <p className="text-stone-400 mb-8">Anda akan diarahkan ke payment gateway (Duitku).</p>
    <div className="bg-stone-950 p-4 rounded-xl mb-6 w-full text-left border border-stone-800">
      <div className="flex justify-between text-stone-300 text-sm mb-2">
        <span>Portal Uang Pro (1 Bulan)</span>
        <span>Rp 29.000</span>
      </div>
      <div className="border-t border-stone-800 my-2 pt-2 flex justify-between font-bold text-white">
        <span>Total</span>
        <span>Rp 29.000</span>
      </div>
    </div>
    <button onClick={() => window.location.href="/app/billing/success"} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20">
      Bayar Sekarang
    </button>
  </div>
);

const BillingSuccessView = () => (
  <div className="p-8 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto mt-12">
    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">Pembayaran Berhasil!</h2>
    <p className="text-stone-400 mb-8">Terima kasih telah berlangganan Portal Uang Pro. Semua fitur premium sekarang telah aktif.</p>
    <button onClick={() => window.location.href="/app/dashboard"} className="px-6 py-3 border border-stone-700 hover:bg-stone-800 text-white font-bold rounded-xl transition-colors">
      Kembali ke Dashboard
    </button>
  </div>
);

export default function DashboardApp() {
  const { settings } = useGlobalSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [socials, setSocials] = useState<any>({});
  const pwa = usePWAInstall();
  
  useEffect(() => {
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.socials) {
          setSocials(data.socials);
        }
      })
      .catch(console.error);
  }, []);
  // Persistent state loader
  const loadInitialState = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return null;
  };

  const savedState = loadInitialState();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const tabPathMap: Record<string, string> = {
    dashboard: '/app/dashboard',
    zero_based: '/app/budget',
    transactions: '/app/transactions',
    bills: '/app/bills',
    sinking_funds: '/app/goals',
    accounts_debt: '/app/accounts',
    investments: '/app/investments',
    net_worth: '/app/net-worth',
    payday: '/app/payday',
    reports: '/app/reports',
    guide: '/app/guide',
    settings: '/app/settings',
    profile: '/app/profile',
  };

  const handleSetActiveTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    const target = tabPathMap[tab] || `/app/${tab}`;
    navigate(target);
  };
  const [themeMode, setThemeMode] = useState<ThemeMode>(savedState?.themeMode || 'amber_dark');
  const [accounts, setAccounts] = useState<Account[]>(() => ensureUniqueIds(savedState?.accounts || INITIAL_ACCOUNTS, 'acc'));
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(() => ensureUniqueIds(savedState?.budgetCategories || INITIAL_BUDGET_CATEGORIES, 'cat'));
  const [bills, setBills] = useState<Bill[]>(() => ensureUniqueIds(savedState?.bills || INITIAL_BILLS, 'bill'));
  const [sinkingFunds, setSinkingFunds] = useState<SinkingFund[]>(() => ensureUniqueIds(savedState?.sinkingFunds || INITIAL_SINKING_FUNDS, 'sf'));
  const [transactions, setTransactions] = useState<Transaction[]>(() => ensureUniqueIds(savedState?.transactions || INITIAL_TRANSACTIONS, 'tx'));
  const [paydayConfig, setPaydayConfig] = useState<PaydayConfig>(savedState?.paydayConfig || INITIAL_PAYDAY_CONFIG);
  const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>(() => ensureUniqueIds(savedState?.netWorthSnapshots || INITIAL_NET_WORTH_SNAPSHOTS, 'nw'));
  const [investments, setInvestments] = useState<Investment[]>(() => ensureUniqueIds(savedState?.investments || INITIAL_INVESTMENTS, 'inv'));
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(savedState?.notificationSettings || INITIAL_NOTIFICATION_SETTINGS);
  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number, loading: boolean }>>({});
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const userId = getUserId();


  
  // Fetch from Cloud SQL on mount
  useEffect(() => {
    const fetchCloud = async () => {
      setIsCloudSyncing(true);
      try {
        const res = await fetch(`/api/sync/${userId}`);
        const result = await res.json();
        if (result.success && result.data) {
          const s = result.data;
          setThemeMode(s.themeMode || "amber_dark");
          setAccounts(ensureUniqueIds(s.accounts || INITIAL_ACCOUNTS, "acc"));
          setBudgetCategories(ensureUniqueIds(s.budgetCategories || INITIAL_BUDGET_CATEGORIES, "cat"));
          setBills(ensureUniqueIds(s.bills || INITIAL_BILLS, "bill"));
          setSinkingFunds(ensureUniqueIds(s.sinkingFunds || INITIAL_SINKING_FUNDS, "sf"));
          setTransactions(ensureUniqueIds(s.transactions || INITIAL_TRANSACTIONS, "tx"));
          setPaydayConfig(s.paydayConfig || INITIAL_PAYDAY_CONFIG);
          setNetWorthSnapshots(ensureUniqueIds(s.netWorthSnapshots || INITIAL_NET_WORTH_SNAPSHOTS, "nw"));
          setInvestments(ensureUniqueIds(s.investments || INITIAL_INVESTMENTS, "inv"));
          setNotificationSettings(s.notificationSettings || INITIAL_NOTIFICATION_SETTINGS);
        }
      } catch (e) {
        console.error("Failed to load from cloud:", e);
      } finally {
        setIsCloudSyncing(false);
        setCloudSynced(true);
      }
    };
    fetchCloud();
  }, [userId]);

  useEffect(() => {
    const fetchMarketPrice = async (t: string) => {
      if (!t) return;
      setMarketPrices(prev => ({ ...prev, [t]: { ...prev[t], loading: true } }));
      try {
        const res = await fetch(`/api/market-price?ticker=${t}`);
        const data = await res.json();
        if (data.success && data.price) {
          setMarketPrices(prev => ({ ...prev, [t]: { price: data.price, loading: false } }));
        } else {
          setMarketPrices(prev => ({ ...prev, [t]: { price: prev[t]?.price || 0, loading: false } }));
        }
      } catch (err) {
        console.error(err);
        setMarketPrices(prev => ({ ...prev, [t]: { price: prev[t]?.price || 0, loading: false } }));
      }
    };

    investments.forEach(inv => {
      if (inv.ticker && !marketPrices[inv.ticker]) {
        fetchMarketPrice(inv.ticker);
      }
    });
  }, [investments]);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === "/app/transactions/new") {
      setIsQuickAddOpen(true);
    } else {
      setIsQuickAddOpen(false);
    }
  }, [location.pathname]);

  const handleQuickAddClose = () => {
    setIsQuickAddOpen(false);
    if (location.pathname === "/app/transactions/new") {
      navigate("/app/transactions");
    }
  };

  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Sync to localStorage on change
  useEffect(() => {
    const fullState = {
      themeMode,
      accounts,
      budgetCategories,
      bills,
      sinkingFunds,
      transactions,
      paydayConfig,
      netWorthSnapshots,
      investments,
      notificationSettings,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fullState));

    if (cloudSynced) {
      fetch(`/api/sync/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullState)
      }).catch(e => console.error("Failed to sync to cloud:", e));
    }

    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
  }, [themeMode, accounts, budgetCategories, bills, sinkingFunds, transactions, paydayConfig, netWorthSnapshots, investments, notificationSettings]);

  // Zero-Based Unassigned Pool calculation
  const totalPlannedIncome = budgetCategories
    .filter((c) => c.group === 'Pemasukan')
    .reduce((sum, c) => sum + c.planned, 0);

  const totalPlannedAllocations = budgetCategories
    .filter((c) => c.group !== 'Pemasukan')
    .reduce((sum, c) => sum + c.planned, 0);

  const unassignedCash = totalPlannedIncome - totalPlannedAllocations;

  // Due Bills Calculation (Unpaid and due within 3 days)
  const currentDayOfMonth = new Date().getDate();
  const hasDueBills = bills.some(bill => {
    if (bill.isPaid) return false;
    let daysUntilDue = bill.dueDate - currentDayOfMonth;
    if (daysUntilDue < 0) daysUntilDue += 30; // Approximation for next month
    return daysUntilDue <= 3;
  });

  // Automated Notification Sender
  useEffect(() => {
    if (!hasDueBills) return;

    const todayDateStr = new Date().toISOString().substring(0, 10);
    const lastSent = localStorage.getItem('auraledger_last_notif_date');
    if (lastSent === todayDateStr) return; // Already sent today

    const sendNotifications = async () => {
      let sentAny = false;
      
      if (notificationSettings.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Portal Uang: Tagihan Jatuh Tempo', {
          body: `Ada tagihan yang harus dibayar dalam ${notificationSettings.dueReminderDays || 3} hari ke depan. Cek tab Kalender Tagihan Anda.`
        });
        sentAny = true;
      }

      if (notificationSettings.telegramEnabled && notificationSettings.telegramChatId) {
        try {
          await fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: notificationSettings.telegramChatId,
              message: `⚠️ Portal Uang Reminder:\n\nAda tagihan jatuh tempo dalam ${notificationSettings.dueReminderDays || 3} hari ke depan. Segera periksa aplikasi Anda.`
            })
          });
        } catch (e) {
          console.error("Failed to send telegram notification", e);
        }
      }

      if (sentAny) {
        localStorage.setItem('auraledger_last_notif_date', todayDateStr);
      }
    };

    // Small delay so it doesn't interrupt immediate load
    const timeout = setTimeout(() => sendNotifications(), 3000);
    return () => clearTimeout(timeout);
  }, [hasDueBills, notificationSettings]);

  // --- Handlers ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handlers for Categories
  const handleBulkUpdateCategories = (updates: { id: string, planned: number }[]) => {
    setBudgetCategories((prev) => {
      let newState = [...prev];
      for (const update of updates) {
        newState = newState.map(c => c.id === update.id ? { ...c, planned: update.planned } : c);
      }
      return newState;
    });
  };

  const handleUpdateCategory = (id: string, planned: number) => {
    const cat = budgetCategories.find((c) => c.id === id);
    if (!cat) return;
    
    if (cat.group !== 'Pemasukan') {
      const diff = planned - cat.planned;
      if (diff > 0 && unassignedCash < diff) {
        showToast(`Gagal merubah: Saldo belum dialokasikan kurang Rp ${formatRupiah(diff - unassignedCash)}, naikan pemasukan kamu/ kurangi nominal pos anggaran.`);
        return;
      }
    } else {
      const diff = planned - cat.planned;
      if (diff < 0 && unassignedCash + diff < 0) {
        showToast(`Gagal merubah: Total dialokasikan tidak boleh melebihi rencana pemasukan.`);
        return;
      }
    }
    
    setBudgetCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, planned } : c))
    );
  };

  const handleAddCategory = (group: BudgetGroup, name: string, planned: number) => {
    if (group !== 'Pemasukan' && unassignedCash < planned) {
      showToast(`Gagal menambah: Saldo belum dialokasikan kurang Rp ${formatRupiah(planned - unassignedCash)}, naikan pemasukan kamu/ kurangi nominal pos anggaran.`);
      return;
    }

    const newCat: BudgetCategory = {
      id: generateId('cat-user'),
      group,
      name,
      planned,
    };
    setBudgetCategories((prev) => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    const cat = budgetCategories.find((c) => c.id === id);
    if (!cat) return;
    if (cat.group === 'Pemasukan' && unassignedCash - cat.planned < 0) {
      showToast("Gagal menghapus: Total dialokasikan tidak boleh melebihi rencana pemasukan.");
      return;
    }

    requestConfirm(
      "Hapus Pos Anggaran",
      "Apakah Anda yakin ingin menghapus pos anggaran ini? Tindakan ini tidak dapat dibatalkan.",
      () => {
        setBudgetCategories((prev) => prev.filter((c) => c.id !== id));
        showToast("Pos anggaran berhasil dihapus");
      }
    );
  };

  // Handlers for Transactions
  const handleAddTransaction = (tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...tx,
      id: generateId('tx'),
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Update corresponding account balance if expense/income
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === tx.accountId) {
          if (tx.type === 'expense') {
            return { ...acc, balance: acc.category === 'asset' ? acc.balance - tx.amount : acc.balance + tx.amount };
          } else if (tx.type === 'income') {
            return { ...acc, balance: acc.category === 'asset' ? acc.balance + tx.amount : acc.balance - tx.amount };
          }
        }
        return acc;
      })
    );
    showToast("Transaksi berhasil disimpan!");
  };

  const handleDeleteTransaction = (id: string) => {
    requestConfirm(
      "Hapus Transaksi",
      "Apakah Anda yakin ingin menghapus transaksi ini? Saldo rekening tidak akan dikembalikan secara otomatis.",
      () => {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        showToast("Transaksi berhasil dihapus");
      }
    );
  };

  const handleToggleTransactionStatus = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: t.status === 'cleared' ? 'pending' : 'cleared' } : t))
    );
  };

  // Handlers for Bills
  const handleToggleBillPaid = (billId: string) => {
    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill) return;

    if (!targetBill.isPaid) {
      // Auto log transaction for bill and deduct account balance
      const txId = generateId('tx');
      const newTx: Transaction = {
        id: txId,
        date: new Date().toISOString().substring(0, 10),
        amount: targetBill.amount,
        type: 'expense',
        category: targetBill.category,
        accountId: targetBill.accountId,
        payee: targetBill.name,
        notes: `Pembayaran tagihan rutin: ${targetBill.name}`,
        status: 'cleared',
      };

      setTransactions((prev) => [newTx, ...prev]);

      // Deduct balance from the source account
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === targetBill.accountId) {
            return {
              ...acc,
              balance: acc.category === 'asset' ? acc.balance - targetBill.amount : acc.balance + targetBill.amount,
              updatedAt: new Date().toISOString(),
            };
          }
          return acc;
        })
      );

      setBills((prev) =>
        prev.map((b) =>
          b.id === billId
            ? { ...b, isPaid: true, paidTransactionId: txId, paidAt: new Date().toISOString() }
            : b
        )
      );

      const sourceAcc = accounts.find((a) => a.id === targetBill.accountId);
      showToast(`Tagihan "${targetBill.name}" ditandai lunas! Saldo ${sourceAcc?.name || 'rekening'} berhasil terpotong Rp ${formatRupiah(targetBill.amount)}.`);
    }
  };

  const handleRefundBillPaid = (billId: string) => {
    const targetBill = bills.find((b) => b.id === billId);
    if (!targetBill || !targetBill.isPaid) return;

    const sourceAcc = accounts.find((a) => a.id === targetBill.accountId);
    const sourceAccName = sourceAcc?.name || 'Rekening Sumber';

    requestConfirm(
      "Batalkan (Refund) Pembayaran Tagihan",
      `Apakah Anda yakin ingin membatalkan status lunas tagihan "${targetBill.name}"? Dana sebesar Rp ${formatRupiah(targetBill.amount)} akan dikembalikan ke ${sourceAccName} dan catatan transaksi terkait akan dihapus.`,
      () => {
        // 1. Kembalikan saldo ke rekening sumber sesuai nominalnya
        setAccounts((prev) =>
          prev.map((acc) => {
            if (acc.id === targetBill.accountId) {
              return {
                ...acc,
                balance: acc.category === 'asset' ? acc.balance + targetBill.amount : acc.balance - targetBill.amount,
                updatedAt: new Date().toISOString(),
              };
            }
            return acc;
          })
        );

        // 2. Hapus catatan transaksi yang dibuat saat lunas
        if (targetBill.paidTransactionId) {
          setTransactions((prev) => prev.filter((t) => t.id !== targetBill.paidTransactionId));
        } else {
          setTransactions((prev) => {
            const idx = prev.findIndex(
              (t) => t.payee === targetBill.name && t.amount === targetBill.amount && t.type === 'expense'
            );
            if (idx !== -1) {
              return prev.filter((_, i) => i !== idx);
            }
            return prev;
          });
        }

        // 3. Kembalikan status tagihan menjadi belum lunas
        setBills((prev) =>
          prev.map((b) =>
            b.id === billId
              ? { ...b, isPaid: false, paidTransactionId: undefined, paidAt: undefined }
              : b
          )
        );

        showToast(`Pembayaran tagihan "${targetBill.name}" dibatalkan! Dana Rp ${formatRupiah(targetBill.amount)} berhasil dikembalikan ke ${sourceAccName}.`);
      }
    );
  };

  const handleAddBill = (bill: Omit<Bill, 'id'>) => {
    const newBill: Bill = {
      ...bill,
      id: generateId('bill'),
    };
    setBills((prev) => [...prev, newBill]);
  };

  const handleDeleteBill = (id: string) => {
    requestConfirm(
      "Hapus Tagihan",
      "Apakah Anda yakin ingin menghapus tagihan ini?",
      () => {
        setBills((prev) => prev.filter((b) => b.id !== id));
        showToast("Tagihan berhasil dihapus");
      }
    );
  };

  // Handlers for Sinking Funds
  const handleAddSinkingFund = (fund: Omit<SinkingFund, 'id'>) => {
    const newFund: SinkingFund = {
      ...fund,
      id: generateId('sf'),
    };
    setSinkingFunds((prev) => [...prev, newFund]);
  };

  const handleDepositSinkingFund = (id: string, amount: number, accountId: string) => {
    setSinkingFunds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, currentAmount: f.currentAmount + amount } : f))
    );
    // Decrease account balance
    setAccounts((prev) => 
      prev.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a)
    );
    const targetFund = sinkingFunds.find((f) => f.id === id);
    if (targetFund) {
      handleAddTransaction({
        date: new Date().toISOString().substring(0, 10),
        amount,
        type: 'sinking_fund',
        category: targetFund.category,
        accountId: accountId,
        payee: `Sinking Deposit: ${targetFund.name}`,
        notes: `Deposited into ${targetFund.name}`,
        status: 'cleared',
      });
    }
  };

  const handleWithdrawSinkingFund = (id: string, amount: number, accountId: string) => {
    setSinkingFunds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, currentAmount: Math.max(0, f.currentAmount - amount) } : f))
    );
    // Increase account balance
    setAccounts((prev) => 
      prev.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a)
    );
  };

  const handleDeleteSinkingFund = (id: string) => {
    requestConfirm(
      "Hapus Pos Target",
      "Apakah Anda yakin ingin menghapus pos target ini?",
      () => {
        setSinkingFunds((prev) => prev.filter((f) => f.id !== id));
        showToast("Pos target berhasil dihapus");
      }
    );
  };

  // Handlers for Accounts
  const handleAddAccount = (acc: Omit<Account, 'id' | 'updatedAt'>) => {
    const newAcc: Account = {
      ...acc,
      id: generateId('acc'),
      updatedAt: new Date().toISOString().substring(0, 10),
    };
    setAccounts((prev) => [...prev, newAcc]);
  };

  const handleUpdateAccountBalance = (id: string, newBalance: number) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, balance: newBalance, updatedAt: new Date().toISOString().substring(0, 10) } : a))
    );
    showToast("Saldo rekening berhasil disimpan");
  };

  const handleDeleteAccount = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    
    const isLiability = acc.category === 'liability';
    const title = isLiability ? "Hapus Pinjaman/Kewajiban" : "Hapus Rekening";
    const message = isLiability 
      ? "Apakah Anda yakin ingin menghapus pinjaman/kewajiban ini? Transaksi yang terkait tidak akan ikut terhapus."
      : "Apakah Anda yakin ingin menghapus rekening ini? Transaksi yang terkait tidak akan ikut terhapus.";

    requestConfirm(
      title,
      message,
      () => {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        showToast(isLiability ? "Pinjaman berhasil dihapus" : "Rekening berhasil dihapus");
      }
    );
  };

  // Handlers for Net Worth Snapshots
  const handleAddNetWorthSnapshot = (snapshot: Omit<NetWorthSnapshot, 'id'>) => {
    const newSnapshot: NetWorthSnapshot = {
      ...snapshot,
      id: generateId('nw'),
    };
    setNetWorthSnapshots((prev) => [...prev, newSnapshot]);
  };

  const handleDeleteSnapshot = (id: string) => {
    requestConfirm(
      "Hapus Snapshot Kekayaan",
      "Apakah Anda yakin ingin menghapus riwayat kekayaan bersih ini?",
      () => {
        setNetWorthSnapshots((prev) => prev.filter((s) => s.id !== id));
        showToast("Snapshot berhasil dihapus");
      }
    );
  };

  // Payday Execution
  const handleExecutePayday = (totalIncome: number) => {
    const today = new Date().toISOString().substring(0, 10);
    // Log income deposit
    handleAddTransaction({
      date: today,
      amount: totalIncome,
      type: 'income',
      category: 'Primary Salary',
      accountId: accounts[0]?.id || 'acc-1',
      payee: 'Payday Direct Deposit',
      notes: 'Automated payday distribution execution',
      status: 'cleared',
    });

    // Execute rules
    paydayConfig.rules.forEach((rule) => {
      const ruleAmt = rule.type === 'fixed' ? rule.value : totalIncome * (rule.value / 100);
      handleAddTransaction({
        date: today,
        amount: ruleAmt,
        type: 'transfer',
        category: rule.categoryName,
        accountId: accounts[0]?.id || 'acc-1',
        payee: `Payday Rule: ${rule.categoryName}`,
        notes: `Payday split rule allocation`,
        status: 'cleared',
      });
    });
  };

  // Import / Reset
  const handleImportData = (importedData: any) => {
    if (importedData.accounts) setAccounts(ensureUniqueIds(importedData.accounts, 'acc'));
    if (importedData.budgetCategories) setBudgetCategories(ensureUniqueIds(importedData.budgetCategories, 'cat'));
    if (importedData.bills) setBills(ensureUniqueIds(importedData.bills, 'bill'));
    if (importedData.sinkingFunds) setSinkingFunds(ensureUniqueIds(importedData.sinkingFunds, 'sf'));
    if (importedData.transactions) setTransactions(ensureUniqueIds(importedData.transactions, 'tx'));
    if (importedData.paydayConfig) setPaydayConfig(importedData.paydayConfig);
    if (importedData.netWorthSnapshots) setNetWorthSnapshots(ensureUniqueIds(importedData.netWorthSnapshots, 'nw'));
  };

  const handleResetData = () => {
    requestConfirm(
      "Reset Semua Data",
      "Apakah Anda yakin ingin menghapus semua data dan mengembalikan aplikasi ke kondisi awal yang kosong? Tindakan ini tidak dapat dibatalkan.",
      () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setAccounts(INITIAL_ACCOUNTS);
        setBudgetCategories(INITIAL_BUDGET_CATEGORIES);
        setBills(INITIAL_BILLS);
        setSinkingFunds(INITIAL_SINKING_FUNDS);
        setTransactions(INITIAL_TRANSACTIONS);
        setPaydayConfig(INITIAL_PAYDAY_CONFIG);
        setNetWorthSnapshots(INITIAL_NET_WORTH_SNAPSHOTS);
        setInvestments(INITIAL_INVESTMENTS);
        showToast("Semua data berhasil dihapus dan direset");
      }
    );
  };

  const handleLoadSampleData = () => {
    requestConfirm(
      "Muat Data Sample?",
      "Tindakan ini akan menimpa data Anda saat ini dengan data sample untuk pembelajaran. Semua data yang ada sebelumnya akan terhapus.",
      () => {
        setAccounts(SampleData.INITIAL_ACCOUNTS);
        setBudgetCategories(SampleData.INITIAL_BUDGET_CATEGORIES);
        setBills(SampleData.INITIAL_BILLS);
        setSinkingFunds(SampleData.INITIAL_SINKING_FUNDS);
        setTransactions(SampleData.INITIAL_TRANSACTIONS);
        setPaydayConfig(SampleData.INITIAL_PAYDAY_CONFIG);
        setNetWorthSnapshots(SampleData.INITIAL_NET_WORTH_SNAPSHOTS);
        setInvestments(SampleData.INITIAL_INVESTMENTS);
        showToast("Data sample berhasil dimuat ke aplikasi");
      }
    );
  };

  return (
    <div className={`min-h-screen theme-${themeMode} bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 flex flex-col antialiased transition-colors duration-300`}>
      {/* Navigation Header */}
      <Navbar
        isCloudSyncing={isCloudSyncing}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        onResetData={handleResetData}
        unassignedCash={unassignedCash}
        hasDueBills={hasDueBills}
        bills={bills}
        transactions={transactions}
        budgetCategories={budgetCategories}
        notificationSettings={notificationSettings}
        onOpenInstallModal={() => pwa.setShowModal(true)}
        isStandalone={pwa.isStandalone}
      />

      {/* Main Container */}
      <main id="main-app-container" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <Routes>


        <Route path="dashboard" element={
          <DashboardView
            accounts={accounts}
            transactions={transactions}
            budgetCategories={budgetCategories}
            bills={bills}
            sinkingFunds={sinkingFunds}
            unassignedCash={unassignedCash}
            setActiveTab={handleSetActiveTab}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
          />
        } />

        <Route path="budget" element={
          <ZeroBasedBudgetView
            budgetCategories={budgetCategories}
            transactions={transactions}
            onUpdateCategory={handleUpdateCategory}
            onBulkUpdateCategories={handleBulkUpdateCategories}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            unassignedCash={unassignedCash}
          />
        } />

        <Route path="transactions" element={
          <TransactionsView
            transactions={transactions}
            accounts={accounts}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onToggleStatus={handleToggleTransactionStatus}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        } />

        <Route path="bills" element={
          <BillsView
            bills={bills}
            accounts={accounts}
            onTogglePaid={handleToggleBillPaid}
            onRefundPaid={handleRefundBillPaid}
            onAddBill={handleAddBill}
            onDeleteBill={handleDeleteBill}
          />
        } />

        <Route path="goals" element={
          <SinkingFundsView
            sinkingFunds={sinkingFunds}
            accounts={accounts}
            onAddSinkingFund={handleAddSinkingFund}
            onDeposit={handleDepositSinkingFund}
            onWithdraw={handleWithdrawSinkingFund}
            onDeleteSinkingFund={handleDeleteSinkingFund}
          />
        } />

        <Route path="investments" element={
          <InvestmentsView 
            investments={investments} 
            setInvestments={setInvestments}
            accounts={accounts}
            setAccounts={setAccounts}
            marketPrices={marketPrices}
            setMarketPrices={setMarketPrices}
            onAddTransaction={handleAddTransaction}
            showToast={showToast}
          />
        } />

        <Route path="accounts" element={
          <AccountsAndDebtView
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onUpdateAccountBalance={handleUpdateAccountBalance}
            onDeleteAccount={handleDeleteAccount}
          />
        } />

        <Route path="net-worth" element={
          <NetWorthView
            accounts={accounts}
            snapshots={netWorthSnapshots}
            onAddSnapshot={handleAddNetWorthSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
          />
        } />

        <Route path="payday" element={
          <IncomePaydayView
            paydayConfig={paydayConfig}
            onUpdatePaydayConfig={setPaydayConfig}
            onExecutePayday={handleExecutePayday}
          />
        } />

        <Route path="profile" element={<ProfileView showToast={showToast} />} />
        <Route path="reports" element={
          <FinancialReportsView
            budgetCategories={budgetCategories}
            transactions={transactions}
            investments={investments}
            marketPrices={marketPrices}
          />
        } />

        <Route path="settings" element={
          <SettingsView
            settings={notificationSettings}
            setSettings={setNotificationSettings}
            showToast={showToast}
            userId={userId}
            onOpenInstallModal={() => pwa.setShowModal(true)}
            isStandalone={pwa.isStandalone}
          />
        } />

        <Route path="guide" element={
          <GuideView setActiveTab={handleSetActiveTab} onLoadSampleData={handleLoadSampleData} />
        } />
      
        <Route path="settings/telegram" element={<SettingsView settings={notificationSettings} setSettings={setNotificationSettings} showToast={showToast} userId={userId} onOpenInstallModal={() => pwa.setShowModal(true)} isStandalone={pwa.isStandalone} />} />
        <Route path="billing/checkout" element={<BillingCheckoutView />} />
        <Route path="billing/success" element={<BillingSuccessView />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />

        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-900/60 py-8 text-center text-xs text-stone-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div>
              <span className="font-bold text-stone-400">{settings.appName}</span> • Local-First Sovereign Wealth Engine
            </div>
            <div className="flex items-center gap-4">
              {socials.whatsapp && (
                <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#25D366] transition-colors" aria-label="WhatsApp">
                  <FaWhatsapp className="w-5 h-5" />
                </a>
              )}
              {socials.tiktok && (
                <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-white transition-colors" aria-label="TikTok">
                  <FaTiktok className="w-5 h-5" />
                </a>
              )}
              {socials.threads && (
                <a href={socials.threads} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-white transition-colors" aria-label="Threads">
                  <FaThreads className="w-5 h-5" />
                </a>
              )}
              {socials.instagram && (
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                  <FaInstagram className="w-5 h-5" />
                </a>
              )}
              {socials.youtube && (
                <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#FF0000] transition-colors" aria-label="YouTube">
                  <FaYoutube className="w-5 h-5" />
                </a>
              )}
              {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#1877F2] transition-colors" aria-label="Facebook">
                  <FaFacebook className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
          <div className="w-full h-px bg-stone-800/50"></div>
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              &copy; {new Date().getFullYear()} Portal Uang. All rights reserved.
            </div>
            <div>
              Privacy Guaranteed • Secure Cloud Storage
            </div>
          </div>
        </div>
      </footer>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 inset-x-0 mx-auto w-fit z-50 animate-fadeIn">
          <div className={`backdrop-blur-md px-5 py-3 rounded-full shadow-lg flex items-center gap-3 border ${toastMessage.includes('Gagal') ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            {toastMessage.includes('Gagal') ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <span className={`font-medium text-sm ${toastMessage.includes('Gagal') ? 'text-rose-100' : 'text-emerald-100'}`}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Dialog Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={handleQuickAddClose}
        accounts={accounts}
        budgetCategories={budgetCategories}
        onAddTransaction={handleAddTransaction}
      />

      <AiAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        accounts={accounts}
        budgetCategories={budgetCategories}
        transactions={transactions}
        unassignedCash={unassignedCash}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        fullData={{
          accounts,
          budgetCategories,
          bills,
          sinkingFunds,
          transactions,
          paydayConfig,
          netWorthSnapshots,
        }}
        onImportData={handleImportData}
        onResetData={handleResetData}
      />

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* PWA Floating Installation Banner */}
      <InstallAppBanner pwa={pwa} />

      {/* PWA Installation Guide Modal (iOS/Android/Desktop) */}
      <InstallAppModal pwa={pwa} onClose={() => pwa.setShowModal(false)} />
    </div>
  );
}
