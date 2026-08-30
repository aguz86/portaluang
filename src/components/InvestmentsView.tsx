import React, { useState, useEffect } from 'react';
import { Investment, InvestmentCategory, Account, Transaction, formatRupiah, generateId } from '../types';
import { formatRpInput, parseRpInput } from '../utils/format';
import { TrendingUp, Plus, ArrowDownCircle, ArrowUpCircle, Trash2, Loader2, RefreshCw, X, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface InvestmentsViewProps {
  investments: Investment[];
  setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  marketPrices: Record<string, { price: number, loading: boolean }>;
  setMarketPrices: React.Dispatch<React.SetStateAction<Record<string, { price: number, loading: boolean }>>>;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  showToast: (msg: string) => void;
}

const getUnitLabel = (cat: InvestmentCategory) => {
  if (cat === 'saham') return 'lot';
  if (cat === 'logam_mulia') return 'gram';
  return 'unit';
};

const getMultiplier = (cat: InvestmentCategory) => (cat === 'saham' ? 100 : 1);

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({ investments, setInvestments, accounts, setAccounts, marketPrices, setMarketPrices, onAddTransaction, showToast }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [category, setCategory] = useState<InvestmentCategory>('saham');
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averageBuyPrice, setAverageBuyPrice] = useState('');
  
  const [isTxOpen, setIsTxOpen] = useState(false);
  const [txType, setTxType] = useState<'buy' | 'sell'>('buy');
  const [txTargetId, setTxTargetId] = useState<string | null>(null);
  const [txQuantity, setTxQuantity] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txAccountId, setTxAccountId] = useState('');

  const [tickerQuery, setTickerQuery] = useState('');
  const [tickerResults, setTickerResults] = useState<any[]>([]);
  const [isSearchingTicker, setIsSearchingTicker] = useState(false);
  const [showTickerDropdown, setShowTickerDropdown] = useState(false);
  const [isTickerLocked, setIsTickerLocked] = useState(false);
  
  const [addAccountId, setAddAccountId] = useState('');

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as InvestmentCategory;
    setCategory(newCat);
    if (newCat === 'logam_mulia') {
      setTicker('ANTAM');
      setName('Emas Antam');
      setTickerQuery('ANTAM');
      setIsTickerLocked(true);
      fetchMarketPrice('ANTAM');
    } else {
      setIsTickerLocked(false);
      setTicker('');
      setName('');
      setTickerQuery('');
    }
  };

  const assetAccounts = accounts.filter(a => a.category === 'asset');

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (tickerQuery.trim().length >= 2 && (category === 'saham' || category === 'obligasi' || category === 'logam_mulia')) {
        setIsSearchingTicker(true);
        try {
          // If Indonesian stock, user might just type 'arto' without '.jk'
          let q = tickerQuery.trim();
          if (category === 'saham' && !q.includes('.') && q.length === 4) {
             q = q + '.JK';
          }
          
          const res = await fetch(`/api/search-ticker?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          if (data.success) {
            let results = data.results || [];
            
            // "pastikan saham yang boleh di input hanya saham yang ada di bei"
            if (category === 'saham') {
              results = results.filter((r: any) => r.exchange === 'JKT' || r.symbol.endsWith('.JK'));
            }
            
            setTickerResults(results);
            setShowTickerDropdown(true);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearchingTicker(false);
        }
      } else {
        setTickerResults([]);
        setShowTickerDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [tickerQuery, category]);

  const handleSelectTicker = async (selected: any) => {
    setTicker(selected.symbol);
    setName(selected.shortname || selected.symbol);
    setTickerQuery(selected.symbol);
    setShowTickerDropdown(false);
    setIsTickerLocked(true);
    
    // Auto-fetch current price
    try {
      const res = await fetch(`/api/market-price?ticker=${selected.symbol}`);
      const data = await res.json();
      if (data.success && data.price) {
        setAverageBuyPrice(data.price.toString());
        showToast(`Harga terkini ${selected.symbol} berhasil diambil`);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const refreshAllPrices = () => {
    investments.forEach(inv => {
      if (inv.ticker) fetchMarketPrice(inv.ticker);
    });
  };

  useEffect(() => {
    refreshAllPrices();
  }, []);

  const handleAddInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const mult = getMultiplier(category);
    const qty = parseFloat(quantity) || 0;
    const px = parseRpInput(averageBuyPrice) || 0;
    const totalValue = qty * px * mult;

    if (totalValue > 0 && !addAccountId) {
      showToast('Pilih rekening sumber dana untuk pembelian awal ini');
      return;
    }

    if (totalValue > 0) {
      const account = accounts.find(a => a.id === addAccountId);
      if (account && totalValue > account.balance) {
        showToast('Saldo rekening tidak mencukupi');
        return;
      }
    }
    
    let finalTicker = ticker.trim().toUpperCase();
    
    // "pastikan saham yang boleh di input hanya saham yang ada di bei"
    if (category === 'saham' && finalTicker) {
      if (!finalTicker.endsWith('.JK')) {
        showToast('Hanya saham BEI yang diperbolehkan. Ticker harus memiliki akhiran .JK (Pilih dari hasil pencarian).');
        return;
      }
    }

    const newInv: Investment = {
      id: generateId('inv'),
      category,
      name: name.trim(),
      ticker: finalTicker || undefined,
      quantity: qty,
      averageBuyPrice: px,
    };
    
    if (totalValue > 0 && addAccountId) {
      setAccounts(prev => prev.map(a => a.id === addAccountId ? { ...a, balance: a.balance - totalValue } : a));
      onAddTransaction({
        date: new Date().toISOString().substring(0, 10),
        amount: totalValue,
        type: 'expense',
        category: 'Investasi',
        accountId: addAccountId,
        payee: `Beli ${newInv.name}`,
        notes: category === 'saham'
          ? `Pembelian awal ${qty} lot (${qty * 100} lembar) ${newInv.name} @ ${formatRupiah(px)}/lembar`
          : `Pembelian awal ${qty} ${getUnitLabel(newInv.category)} ${newInv.name} @ ${formatRupiah(px)}`,
        status: 'cleared',
      });
    }
    
    setInvestments(prev => [...prev, newInv]);
    showToast(`Investasi ${newInv.name} berhasil ditambahkan`);
    if (newInv.ticker) fetchMarketPrice(newInv.ticker);
    
    setIsAdding(false);
    setName('');
    setTicker('');
    setTickerQuery('');
    setQuantity('');
    setAverageBuyPrice('');
    setAddAccountId('');
    setIsTickerLocked(false);
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txTargetId || !txAccountId) return;

    let qty = parseFloat(txQuantity) || 0;
    const px = parseRpInput(txPrice) || 0;
    if (qty <= 0) return;

    const account = accounts.find(a => a.id === txAccountId);
    if (!account) return;

    const inv = investments.find(i => i.id === txTargetId);
    if (!inv) return;

    const mult = getMultiplier(inv.category);
    let totalTransactionValue = qty * px * mult;

    if (txType === 'buy') {
      if (totalTransactionValue > account.balance) {
        // Can't afford
        showToast('Saldo rekening tidak mencukupi untuk pembelian ini');
        return;
      }
      setAccounts(prev => prev.map(a => a.id === txAccountId ? { ...a, balance: a.balance - totalTransactionValue } : a));
    } else {
      // Sell validation
      if (qty > inv.quantity) {
        showToast(`Kuantitas penjualan (${qty} ${getUnitLabel(inv.category)}) melebihi jumlah terkumpul (Maksimal: ${inv.quantity} ${getUnitLabel(inv.category)})`);
        return;
      }
      setAccounts(prev => prev.map(a => a.id === txAccountId ? { ...a, balance: a.balance + totalTransactionValue } : a));
    }

    onAddTransaction({
      date: new Date().toISOString().substring(0, 10),
      amount: totalTransactionValue,
      type: txType === 'buy' ? 'expense' : 'income',
      category: 'Investasi',
      accountId: txAccountId,
      payee: txType === 'buy' ? `Beli ${inv.name}` : `Jual ${inv.name}`,
      notes: `${txType === 'buy' ? 'Pembelian' : 'Penjualan'} ${qty} ${getUnitLabel(inv.category)}${inv.category === 'saham' ? ` (${qty * 100} lembar)` : ''} ${inv.name} @ ${formatRupiah(px)}${inv.category === 'saham' ? '/lembar' : ''}`,
      status: 'cleared',
    });

    setInvestments(prev => prev.map(invItem => {
      if (invItem.id !== txTargetId) return invItem;

      if (txType === 'buy') {
        const itemMult = getMultiplier(invItem.category);
        const totalValueOld = invItem.quantity * invItem.averageBuyPrice * itemMult;
        const totalValueNew = qty * px * itemMult;
        const newQty = invItem.quantity + qty;
        const newAvg = (totalValueOld + totalValueNew) / (newQty * itemMult);
        return { ...invItem, quantity: newQty, averageBuyPrice: newAvg };
      } else {
        const newQty = Math.max(0, invItem.quantity - qty);
        return { ...invItem, quantity: newQty };
      }
    }));

    if (txType === 'sell') {
      const remainingQty = Math.max(0, inv.quantity - qty);
      if (remainingQty === 0) {
        showToast(`Penjualan berhasil. Seluruh aset ${inv.name} telah terjual (Kuantitas & Valuasi Rp 0). Kamu sekarang dapat menghapus aset ini dari daftar portofolio jika diinginkan.`);
      } else {
        showToast(`Penjualan berhasil. Sisa kuantitas ${inv.name}: ${remainingQty} ${getUnitLabel(inv.category)}`);
      }
    } else {
      showToast('Setoran pembelian berhasil');
    }

    setIsTxOpen(false);
    setTxTargetId(null);
    setTxQuantity('');
    setTxPrice('');
    setTxAccountId('');
  };

  const handleDelete = (id: string) => {
    const target = investments.find(inv => inv.id === id);
    if (!target) return;

    const currentPrice = (target.ticker && marketPrices[target.ticker]?.price) ? marketPrices[target.ticker].price : target.averageBuyPrice;
    const mult = getMultiplier(target.category);
    const marketValuation = target.quantity * currentPrice * mult;

    // Strict validation: Can only delete if quantity is 0 AND valuation is 0
    if (target.quantity > 0 || marketValuation > 0) {
      showToast(
        `Aset "${target.name}" tidak dapat dihapus karena masih memiliki valuasi (${formatRupiah(marketValuation)}) dengan kepemilikan ${target.quantity.toLocaleString('id-ID')} ${getUnitLabel(target.category)}. Silakan lakukan 'Jual / Tarik' seluruh unit aset hingga valuasi menjadi Rp 0 terlebih dahulu.`
      );
      return;
    }

    if (window.confirm(`Konfirmasi Hapus: Apakah Kamu yakin ingin menghapus "${target.name}" (Valuasi Rp 0) dari daftar investasi?`)) {
      setInvestments(prev => prev.filter(inv => inv.id !== id));
      showToast(`Aset investasi "${target.name}" berhasil dihapus dari portofolio.`);
    }
  };

  const openTx = (id: string, type: 'buy' | 'sell') => {
    const target = investments.find(i => i.id === id);
    if (type === 'sell' && target && target.quantity <= 0) {
      showToast(`Kuantitas aset "${target.name}" sudah 0 (terjual habis / valuasi Rp 0). Kamu dapat langsung menghapus aset ini dari daftar portofolio.`);
      return;
    }
    setTxTargetId(id);
    setTxType(type);
    setTxQuantity('');
    setTxPrice('');
    setIsTxOpen(true);
  };

  const totalInvestmentValue = investments.reduce((sum, inv) => {
    const currentPrice = (inv.ticker && marketPrices[inv.ticker]?.price) ? marketPrices[inv.ticker].price : inv.averageBuyPrice;
    const mult = getMultiplier(inv.category);
    return sum + (inv.quantity * currentPrice * mult);
  }, 0);

  const totalCostBasis = investments.reduce((sum, inv) => {
    const mult = getMultiplier(inv.category);
    return sum + (inv.quantity * inv.averageBuyPrice * mult);
  }, 0);
  const totalReturn = totalInvestmentValue - totalCostBasis;
  const returnPercentage = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <TrendingUp className="text-amber-500 w-5 h-5" />
            Portofolio Investasi
          </h2>
          <p className="text-sm text-stone-400">Kelola dan pantau saham, reksadana, SBN, dan logam mulia Kamu.</p>
          <p className="text-xs text-stone-500 mt-1">
            Transaksi pembelian & penjualan akan otomatis tercatat di menu Riwayat Transaksi.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshAllPrices}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Harga
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Aset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <p className="text-sm text-stone-400 font-medium mb-1">Total Nilai Pasar</p>
          <p className="text-2xl lg:text-3xl font-extrabold text-stone-100 font-mono tracking-tight truncate">{formatRupiah(totalInvestmentValue)}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <p className="text-sm text-stone-400 font-medium mb-1">Total Modal Disetor</p>
          <p className="text-2xl lg:text-3xl font-extrabold text-stone-300 font-mono tracking-tight truncate">{formatRupiah(totalCostBasis)}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm">
          <p className="text-sm text-stone-400 font-medium mb-1">Total Return</p>
          <div className={`flex flex-wrap items-baseline gap-x-2 text-2xl lg:text-3xl font-extrabold font-mono tracking-tight ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className="truncate max-w-full">{totalReturn >= 0 ? '+' : ''}{formatRupiah(totalReturn)}</span>
            <span className="text-sm shrink-0">({returnPercentage.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-stone-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-stone-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                Tambah Aset Baru
              </h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-stone-400 hover:text-stone-200 transition-colors p-1 rounded-lg hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddInvestment} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Kategori Investasi</label>
                <select
                  value={category}
                  onChange={handleCategoryChange}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="saham">Saham</option>
                  <option value="reksadana">Reksadana</option>
                  <option value="obligasi">Obligasi/SBN</option>
                  <option value="logam_mulia">Logam Mulia (Emas/Perak)</option>
                </select>
              </div>

              {/* 1. TICKER SIMBOL / PILIHAN KODE ASET */}
              {category === 'logam_mulia' ? (
                <div>
                  <label className="text-xs text-stone-400 block mb-1">Ticker / Jenis Logam Mulia</label>
                  <select
                    value={ticker}
                    onChange={(e) => {
                      const newTicker = e.target.value;
                      setTicker(newTicker);
                      setName(newTicker === 'ANTAM' ? 'Emas Antam' : 'Perak Logam Mulia');
                      setTickerQuery(newTicker);
                      fetchMarketPrice(newTicker);
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                  >
                    <option value="ANTAM">ANTAM (Emas Antam)</option>
                    <option value="PERAK">PERAK (Perak Logam Mulia)</option>
                  </select>
                </div>
              ) : isTickerLocked ? (
                <div className="relative">
                  <label className="text-xs text-stone-400 block mb-1">Ticker Simbol Terpilih</label>
                  <div className="flex items-center justify-between bg-stone-950 border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400 font-mono text-base">{ticker}</span>
                      <span className="text-[10px] bg-amber-500/15 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                        {category === 'saham' ? 'Saham BEI' : 'Terhubung'}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { 
                        setIsTickerLocked(false); 
                        setTicker(''); 
                        setTickerQuery(''); 
                        setName(''); 
                      }} 
                      className="text-xs text-stone-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-stone-800"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Ganti Ticker</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <label className="text-xs text-stone-400 block mb-1">
                    Ticker Simbol {category === 'saham' ? '(Otomatis Cari Saham BEI)' : '(Otomatis Cek Harga)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={tickerQuery || ticker}
                      onChange={(e) => {
                        setTickerQuery(e.target.value);
                        setTicker(e.target.value);
                      }}
                      onFocus={() => {
                        if (tickerResults.length > 0) setShowTickerDropdown(true);
                      }}
                      onBlur={() => setTimeout(() => setShowTickerDropdown(false), 500)}
                      placeholder={category === 'saham' ? 'Ketik kode saham (misal: BBCA, BBRI, BMRI, ARTO...)' : 'misal: Ticker / Kode Produk...'}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500 uppercase font-mono"
                    />
                    {isSearchingTicker && (
                      <Loader2 className="w-4 h-4 text-stone-500 animate-spin absolute right-3 top-3.5" />
                    )}
                  </div>
                  
                  {showTickerDropdown && tickerResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {tickerResults.map((res, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectTicker(res)}
                          className="w-full text-left px-4 py-3 hover:bg-stone-800 border-b border-stone-800/50 last:border-0 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-amber-400 font-mono text-sm">{res.symbol}</span>
                            <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">{res.exchange}</span>
                          </div>
                          <p className="text-xs text-stone-300 truncate mt-0.5">{res.shortname}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. NAMA ASET (TERISI OTOMATIS) */}
              <div>
                <label className="text-xs text-stone-400 block mb-1">
                  Nama Aset {category === 'saham' ? '(Terisi Otomatis setelah Memilih Ticker)' : '(Reksadana / Saham / Emas)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={category === 'saham' ? 'Terisi otomatis setelah memilih Ticker di atas' : 'misal: BCA, Sucorinvest, ORI...'}
                  className={`w-full ${(isTickerLocked || category === 'saham' || category === 'logam_mulia') ? 'bg-stone-900/80 cursor-not-allowed text-stone-300' : 'bg-stone-950 text-stone-200'} border border-stone-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500`}
                  readOnly={category === 'saham' || category === 'logam_mulia'}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    Kuantitas ({getUnitLabel(category)}) {category === 'saham' && <span className="text-amber-400 text-[11px] font-medium">(1 lot = 100 lembar)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    Harga Beli per {category === 'saham' ? 'Lembar' : getUnitLabel(category)} (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={averageBuyPrice}
                    onChange={(e) => setAverageBuyPrice(formatRpInput(e.target.value))}
                    placeholder="0"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>
              </div>

              {quantity && averageBuyPrice && (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-stone-400">
                    Estimasi Total Pembelian {category === 'saham' ? `(${quantity} lot × 100 lembar)` : ''}:
                  </span>
                  <span className="font-bold text-amber-400 font-mono">
                    {formatRupiah((parseFloat(quantity) || 0) * (parseRpInput(averageBuyPrice) || 0) * (category === 'saham' ? 100 : 1))}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs text-stone-400 block mb-1">Rekening Sumber Dana Pembelian</label>
                <select
                  value={addAccountId}
                  onChange={(e) => setAddAccountId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required={parseFloat(quantity) > 0 && parseRpInput(averageBuyPrice) > 0}
                >
                  <option value="" disabled>Pilih Rekening...</option>
                  {assetAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatRupiah(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-colors shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {investments.map(inv => {
          const currentPrice = (inv.ticker && marketPrices[inv.ticker]?.price) ? marketPrices[inv.ticker].price : inv.averageBuyPrice;
          const isLoading = inv.ticker ? marketPrices[inv.ticker]?.loading : false;
          
          const mult = getMultiplier(inv.category);
          const marketValue = inv.quantity * currentPrice * mult;
          const costBasis = inv.quantity * inv.averageBuyPrice * mult;
          const unrealizedReturn = marketValue - costBasis;
          const returnPct = costBasis > 0 ? (unrealizedReturn / costBasis) * 100 : 0;
          const isProfit = unrealizedReturn >= 0;
          const unitLabel = getUnitLabel(inv.category);

          const isSoldOut = inv.quantity <= 0;

          return (
            <div key={inv.id} className={`border rounded-2xl p-5 shadow-sm transition-all relative group ${
              isSoldOut 
                ? 'bg-stone-900/60 border-stone-800/80' 
                : 'bg-stone-900 border-stone-800 hover:border-stone-700'
            }`}>
              {/* Delete Button */}
              <button 
                onClick={() => handleDelete(inv.id)}
                title={isSoldOut ? "Hapus aset dari daftar" : "Hanya dapat dihapus jika kuantitas & valuasi Rp 0 (sudah dijual habis)"}
                className={`absolute top-4 right-4 p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                  isSoldOut 
                    ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30' 
                    : 'text-stone-500 hover:text-rose-400 opacity-60 hover:opacity-100 hover:bg-stone-800'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {isSoldOut && <span className="hidden sm:inline">Hapus</span>}
              </button>
              
              <div className="flex justify-between items-start mb-4 pr-16">
                <div>
                  <h3 className="font-bold text-stone-100 flex items-center gap-2">
                    <span>{inv.name}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 capitalize">{inv.category.replace('_', ' ')}</span>
                    {inv.ticker && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono border border-amber-500/20">{inv.ticker}</span>
                    )}
                    {isSoldOut && (
                      <span className="px-2 py-0.5 rounded bg-stone-800/90 text-stone-400 border border-stone-700 text-[11px] font-medium">
                        Terjual Habis (Valuasi Rp 0)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-xs text-stone-500 mb-1">Nilai Pasar</p>
                  <p className={`font-mono font-bold ${isSoldOut ? 'text-stone-400' : 'text-stone-200'}`}>
                    {formatRupiah(marketValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">Return</p>
                  <p className={`font-mono font-bold ${isSoldOut ? 'text-stone-400' : isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isSoldOut ? 'Rp 0 (0.00%)' : `${isProfit ? '+' : ''}${formatRupiah(unrealizedReturn)} (${returnPct.toFixed(2)}%)`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">Avg Buy Price</p>
                  <p className="font-mono text-sm text-stone-300">
                    {formatRupiah(inv.averageBuyPrice)}{inv.category === 'saham' ? ' / lembar' : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1 flex items-center gap-1">
                    Market Price {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  </p>
                  <p className="font-mono text-sm text-stone-300">
                    {formatRupiah(currentPrice)}{inv.category === 'saham' ? ' / lembar' : ''}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-stone-500 mb-1">Kuantitas Terkumpul</p>
                  <p className="font-mono text-sm text-stone-300">
                    {inv.quantity.toLocaleString('id-ID')} {unitLabel}
                    {inv.category === 'saham' && (
                      <span className="text-stone-400 text-xs ml-1.5 font-sans">
                        ({(inv.quantity * 100).toLocaleString('id-ID')} lembar)
                      </span>
                    )}
                    {isSoldOut && (
                      <span className="text-amber-400 text-xs ml-2 font-sans font-medium">
                        (Dapat dihapus sekarang)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => openTx(inv.id, 'buy')}
                  className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-900 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" /> Beli / Setor
                </button>
                {isSoldOut ? (
                  <button 
                    onClick={() => handleDelete(inv.id)}
                    className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Aset (Rp 0)
                  </button>
                ) : (
                  <button 
                    onClick={() => openTx(inv.id, 'sell')}
                    className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" /> Jual / Tarik
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isTxOpen && (() => {
        const targetInv = investments.find(i => i.id === txTargetId);
        const unitLabel = targetInv ? getUnitLabel(targetInv.category) : 'unit';
        const isStock = targetInv?.category === 'saham';
        const mult = isStock ? 100 : 1;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-5 border-b border-stone-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-stone-100">
                    {txType === 'buy' ? 'Beli / Setor Investasi' : 'Jual / Tarik Investasi'}
                  </h3>
                  {targetInv && (
                    <p className="text-xs text-amber-400 font-medium">{targetInv.name}</p>
                  )}
                </div>
                <button
                  onClick={() => setIsTxOpen(false)}
                  className="text-stone-400 hover:text-stone-200 transition-colors p-1 rounded-lg hover:bg-stone-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleTransaction} className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    Pilih Rekening {txType === 'buy' ? 'Sumber Dana' : 'Tujuan Dana'}
                  </label>
                  <select
                    value={txAccountId}
                    onChange={(e) => setTxAccountId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    required
                  >
                    <option value="" disabled>Pilih Rekening Aset...</option>
                    {assetAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatRupiah(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-stone-400 block">
                      Kuantitas ({txType === 'buy' ? 'Beli' : 'Jual'}) ({unitLabel}) {isStock && <span className="text-amber-400 font-medium">(1 lot = 100 lembar)</span>}
                    </label>
                    {txType === 'sell' && targetInv && (
                      <span className="text-[11px] text-amber-400 font-medium">
                        Maks: {targetInv.quantity.toLocaleString('id-ID')} {unitLabel} {isStock && `(${(targetInv.quantity * 100).toLocaleString('id-ID')} lembar)`}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    max={txType === 'sell' && targetInv ? targetInv.quantity : undefined}
                    value={txQuantity}
                    onChange={(e) => setTxQuantity(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-stone-400 block mb-1">
                    Harga per {isStock ? 'Lembar' : unitLabel} (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={txPrice}
                    onChange={(e) => setTxPrice(formatRpInput(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                    required
                  />
                </div>

                {txQuantity && txPrice && (
                  <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 flex justify-between items-center text-sm">
                    <span className="text-stone-400">Estimasi Total Nilai {txType === 'buy' ? 'Pembelian' : 'Penjualan'}:</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {formatRupiah((parseFloat(txQuantity) || 0) * (parseRpInput(txPrice) || 0) * mult)}
                    </span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTxOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-colors shadow-sm"
                  >
                    Konfirmasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {investments.length === 0 && !isAdding && (
        <div className="text-center py-16 px-4 border-2 border-dashed border-stone-800 rounded-2xl">
          <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-stone-600" />
          </div>
          <h3 className="text-lg font-bold text-stone-200 mb-2">Belum ada portofolio investasi</h3>
          <p className="text-stone-500 max-w-sm mx-auto mb-6 text-sm">
            Mulai bangun kekayaan Kamu dengan menambahkan saham, reksadana, emas, atau obligasi.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 bg-amber-500 text-stone-950 font-bold px-5 py-2.5 rounded-xl hover:bg-amber-400 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Tambah Aset Pertama
          </button>
        </div>
      )}
    </div>
  );
};
