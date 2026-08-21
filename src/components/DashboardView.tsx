import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Account, Bill, BudgetCategory, SinkingFund, Transaction, ActiveTab, formatRupiah } from '../types';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  AlertCircle, 
  Calculator, 
  Plus, 
  Target, 
  CreditCard, 
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  budgetCategories: BudgetCategory[];
  bills: Bill[];
  sinkingFunds: SinkingFund[];
  unassignedCash: number;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenQuickAdd: () => void;
  onOpenAiAdvisor: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  budgetCategories,
  bills,
  sinkingFunds,
  unassignedCash,
  setActiveTab,
  onOpenQuickAdd,
  onOpenAiAdvisor,
}) => {
  const navigate = useNavigate();
  const { settings } = useGlobalSettings();
  const aiName = settings.aiName || 'Portal Uang Advisor';

  // Calculations
  const totalAssets = accounts
    .filter((a) => a.category === 'asset')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.category === 'liability')
    .reduce((sum, a) => sum + a.balance, 0);

  const netWorth = totalAssets - totalLiabilities;

  // Monthly income & expenses calculation
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const monthTransactions = transactions.filter((t) => t.date?.startsWith(currentMonth));

  const monthlyIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = monthlyIncome - monthlyExpenses;

  // Bills due soon
  const unpaidBills = bills.filter((b) => !b.isPaid);
  const totalUnpaidBills = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

  // Sinking funds progress
  const totalSinkingSaved = sinkingFunds.reduce((sum, s) => sum + s.currentAmount, 0);
  const totalSinkingTarget = sinkingFunds.reduce((sum, s) => sum + s.targetAmount, 0);

  // Recharts Spending breakdown
  const expensesByCategory: { [key: string]: number } = {};
  monthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

  const pieData = Object.keys(expensesByCategory).map((cat) => ({
    name: cat,
    value: expensesByCategory[cat],
  }));

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Cash flow trend mock generator for chart
  const cashFlowTrendData = [
    { month: 'Feb', income: 8000000, expense: 6200000 },
    { month: 'Mar', income: 8200000, expense: 6400000 },
    { month: 'Apr', income: 9500000, expense: 6800000 },
    { month: 'Mei', income: 8500000, expense: 6100000 },
    { month: 'Jun', income: 10000000, expense: 7100000 },
    { month: 'Jul', income: monthlyIncome || 10000000, expense: monthlyExpenses || 6225000 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 font-semibold text-xs uppercase tracking-wider">Ikhtisar Finansial Utama</span>
            <span className="text-stone-500 text-xs">•</span>
            <span className="text-stone-400 text-xs">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight">Pusat Kendali Keuangan Anda</h2>
          <p className="text-stone-400 text-sm mt-1 max-w-xl">
            Kelola gaji bulanan, alokasi anggaran berbasis nol, pos sinking fund mudik & liburan, serta laju kekayaan bersih Anda secara mandiri.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onOpenAiAdvisor}
            className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Tanya {aiName}</span>
          </button>
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Worth */}
        <div 
          onClick={() => navigate('/app/net-worth')}
          className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm hover:border-amber-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-400 transition-colors">Kekayaan Bersih</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-100 font-mono">
            {formatRupiah(netWorth)}
          </div>
          <div className="mt-2 text-xs flex items-center justify-between text-stone-400">
            <span>Aset: {formatRupiah(totalAssets)}</span>
            <span className="text-rose-400">Hutang: {formatRupiah(totalLiabilities)}</span>
          </div>
        </div>

        {/* Monthly Net Cash Flow */}
        <div 
          onClick={() => navigate('/app/transactions')}
          className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm hover:border-emerald-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-emerald-400 transition-colors">Arus Kas Bulan Ini</span>
            <div className={`p-2 rounded-lg ${netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold font-mono ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netCashFlow >= 0 ? '+' : ''}{formatRupiah(netCashFlow)}
          </div>
          <div className="mt-2 text-xs flex items-center justify-between text-stone-400">
            <span className="flex items-center text-emerald-400">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> {formatRupiah(monthlyIncome)}
            </span>
            <span className="flex items-center text-rose-400">
              <ArrowDownRight className="w-3 h-3 mr-0.5" /> {formatRupiah(monthlyExpenses)}
            </span>
          </div>
        </div>

        {/* Zero-Based Unassigned Pool */}
        <div 
          onClick={() => navigate('/app/budget')}
          className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm hover:border-amber-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-400 transition-colors">
              Pos Belum Dialokasi
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold font-mono ${
            Math.abs(unassignedCash) < 1 ? 'text-emerald-400' : unassignedCash > 0 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {formatRupiah(unassignedCash)}
          </div>
          <div className="mt-2 text-xs text-stone-400 flex items-center justify-between">
            <span>
              {Math.abs(unassignedCash) < 1 ? 'Semua Rupiah bertugas!' : unassignedCash > 0 ? 'Siap dialokasikan' : 'Overbudget'}
            </span>
            <span className="text-amber-400 underline font-medium">Alokasikan</span>
          </div>
        </div>

        {/* Unpaid Bills */}
        <div 
          onClick={() => navigate('/app/bills')}
          className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm hover:border-amber-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider group-hover:text-amber-400 transition-colors">
              Tagihan Belum Lunas ({unpaidBills.length})
            </span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-stone-100 font-mono">
            {formatRupiah(totalUnpaidBills)}
          </div>
          <div className="mt-2 text-xs text-stone-400 flex items-center justify-between">
            <span>Jatuh tempo terdekat</span>
            <span className="text-amber-400 underline font-medium">Kalender</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Quick Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash Flow & Spending Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-stone-100 text-base">Tren Pemasukan vs Pengeluaran</h3>
                <p className="text-xs text-stone-400">Riwayat pergerakan arus kas 6 bulan terakhir</p>
              </div>
              <button 
                onClick={() => navigate('/app/reports')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                Lihat Analitik Lengkap →
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#78716c" fontSize={11} tickLine={false} />
                  <YAxis stroke="#78716c" fontSize={11} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(0)}Jt`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => formatRupiah(val)}
                  />
                  <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#f59e0b" fillOpacity={1} fill="url(#expenseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Module Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div 
              onClick={() => navigate('/app/budget')}
              className="bg-stone-900/80 border border-stone-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all group"
            >
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg w-fit mb-3">
                <Calculator className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-100 text-sm group-hover:text-amber-400 transition-colors">Anggaran Berbasis Nol</h4>
              <p className="text-xs text-stone-400 mt-1">Alokasikan gaji ke pos amplop sebelum belanja dimulai.</p>
            </div>

            <div 
              onClick={() => navigate('/app/goals')}
              className="bg-stone-900/80 border border-stone-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all group"
            >
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg w-fit mb-3">
                <Target className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-100 text-sm group-hover:text-amber-400 transition-colors">Pos Sinking Fund ({sinkingFunds.length})</h4>
              <p className="text-xs text-stone-400 mt-1">
                {formatRupiah(totalSinkingSaved)} / {formatRupiah(totalSinkingTarget)} terkumpul
              </p>
            </div>

            <div 
              onClick={() => navigate('/app/accounts')}
              className="bg-stone-900/80 border border-stone-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition-all group"
            >
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg w-fit mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-stone-100 text-sm group-hover:text-amber-400 transition-colors">Simulasi Pelunasan Hutang</h4>
              <p className="text-xs text-stone-400 mt-1">Bandingkan percepatan metode Snowball vs Avalanche.</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Recent Transactions & Spending Breakdown */}
        <div className="space-y-6">
          {/* Category Pie Chart Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-stone-100 text-base mb-1">Rincian Pengeluaran Bulan Ini</h3>
            <p className="text-xs text-stone-400 mb-4">Distribusi pos alokasi dana Anda</p>

            {pieData.length > 0 ? (
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val: number) => formatRupiah(val)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500 text-xs">Belum ada catatan pengeluaran bulan ini.</div>
            )}

            {/* Legend list */}
            <div className="space-y-2 mt-2 max-h-36 overflow-y-auto pr-1 text-xs">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-stone-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                    <span className="truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="font-mono text-stone-400">{formatRupiah(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions Widget */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-100 text-base">Transaksi Terakhir</h3>
              <button 
                id="btn-lihat-semua-transaksi"
                onClick={() => navigate('/app/transactions')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 group/btn px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
              >
                <span>Lihat Semua</span>
                <span className="transition-transform group-hover/btn:translate-x-0.5">→</span>
              </button>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div 
                  key={tx.id} 
                  onClick={() => navigate('/app/transactions')}
                  className="flex items-center justify-between text-xs py-2 border-b border-stone-800/60 last:border-0 hover:bg-stone-800/30 px-1 rounded-lg transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-stone-200">{tx.payee}</div>
                    <div className="text-[11px] text-stone-400">{tx.category} • {tx.date}</div>
                  </div>
                  <div className={`font-mono font-bold ${
                    tx.type === 'income' ? 'text-emerald-400' : 'text-stone-100'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

