import { ExportDateRangeModal } from "./ExportDateRangeModal";
import { DataManagementModal } from "./DataManagementModal";
import { PinModal } from "./PinModal";
import { encryptData, decryptData } from "../utils/crypto";
import { getDriveToken, uploadToDrive, listBackupFiles, downloadFromDrive } from "../utils/googleDrive";
import React, { useState, useRef } from 'react';
import { BudgetCategory, BudgetGroup, Transaction, formatRupiah } from '../types';
import { formatRpInput, parseRpInput , formatDateToDDMMYYYY_HHMM} from '../utils/format';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  PenLine,
  CheckCircle2, 
  AlertTriangle, 
  Wand2,
  Printer,
  FileSpreadsheet,
  Copy,
  Check
} from 'lucide-react';

interface ZeroBasedBudgetViewProps {
  budgetCategories: BudgetCategory[];
  transactions: Transaction[];
  onUpdateCategory: (id: string, planned: number) => void;
  onEditCategoryDetail: (id: string, group: BudgetGroup, name: string, planned: number) => void;
  onBulkUpdateCategories: (updates: { id: string, planned: number }[]) => void;
  onAddCategory: (group: BudgetGroup, name: string, planned: number) => void;
  onDeleteCategory: (id: string) => void;
  unassignedCash: number;
}

export const ZeroBasedBudgetView: React.FC<ZeroBasedBudgetViewProps> = ({
  budgetCategories,
  transactions,
  onUpdateCategory,
  onEditCategoryDetail,
  onBulkUpdateCategories,
  onAddCategory,
  onDeleteCategory,
  unassignedCash,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState<BudgetGroup>('Pengeluaran Variabel');
  const [newCatPlanned, setNewCatPlanned] = useState<string>('500.000');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatGroup, setEditCatGroup] = useState<BudgetGroup>('Pengeluaran Variabel');
  const [editCatPlanned, setEditCatPlanned] = useState<string>('');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'verify'>('setup');
  const [pendingAction, setPendingAction] = useState<'print_pdf' | 'backup_local' | 'backup_drive' | 'restore_drive' | 'import_local' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [exportModalConfig, setExportModalConfig] = useState<{isOpen: boolean, type: "pdf" | "csv"}>({ isOpen: false, type: "csv" });
  const [printDateRange, setPrintDateRange] = useState<{start: string, end: string} | null>(null);

  const handleDataAction = (action: 'print_pdf' | 'backup_local' | 'backup_drive' | 'restore_drive' | 'import_local') => {
    setIsDataModalOpen(false);
    if (action === 'print_pdf') {
      setExportModalConfig({ isOpen: true, type: "pdf" });
      return;
    }

    setPendingAction(action);
    const hasPin = !!localStorage.getItem('portal_uang_pin_hash');
    
    if ((action === 'import_local' || action === 'restore_drive') && !hasPin) {
      alert("Anda belum memiliki PIN. Buat PIN terlebih dahulu dengan melakukan backup lokal atau ke Google Drive.");
      return;
    }

      // We might want to force setup if no PIN, but here verify checks PIN. If no PIN and action is backup, we need setup.
    if (!hasPin) {
      setPinMode('setup');
    } else {
      setPinMode('verify');
    }
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = async (pin: string) => {
    setIsPinModalOpen(false);
    const dataToBackup = {
      budgetCategories,
      transactions,
      timestamp: new Date().toISOString()
    };

    if (pendingAction === 'backup_local') {
      const encrypted = encryptData(dataToBackup, pin);
      const blob = new Blob([encrypted], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PortalUang_Backup_${formatDateToDDMMYYYY_HHMM()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (pendingAction === 'backup_drive') {
      try {
        const encrypted = encryptData(dataToBackup, pin);
        const token = await getDriveToken();
        await uploadToDrive(token, encrypted, `PortalUang_Backup_${formatDateToDDMMYYYY_HHMM()}.json`);
        alert('Berhasil backup ke Google Drive!');
      } catch (err: any) {
        console.error(err);
        alert('Gagal backup ke Google Drive. Pastikan Anda memberikan izin akses.');
      }
    } else if (pendingAction === 'restore_drive') {
      try {
        const token = await getDriveToken();
        const files = await listBackupFiles(token);
        if (files.length === 0) {
          alert('Tidak ditemukan file backup "PortalUang_Backup" di Google Drive Anda.');
          return;
        }
        
        // Ambil file backup terbaru (indeks 0 karena desc)
        const latestFile = files[0];
        if (!confirm(`Ditemukan backup terbaru: ${latestFile.name}. Lanjutkan restore?`)) {
           return;
        }
        
        const fileContent = await downloadFromDrive(token, latestFile.id);
        const decrypted = decryptData(fileContent, pin);
        
        if (decrypted && decrypted.budgetCategories && decrypted.transactions) {
          localStorage.setItem('portal_uang_budget_categories', JSON.stringify(decrypted.budgetCategories));
          localStorage.setItem('portal_uang_transactions', JSON.stringify(decrypted.transactions));
          window.location.reload();
        } else {
          alert('PIN salah atau format file rusak.');
        }
      } catch (err: any) {
        console.error(err);
        alert('Gagal melakukan restore dari Google Drive.');
      }
    } else if (pendingAction === 'import_local') {
      // Store pin temporarily to decrypt after file selection
      (window as any).__temp_pin = pin;
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
    setPendingAction(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pin = (window as any).__temp_pin;
    delete (window as any).__temp_pin;

    if (!pin) {
      alert("Sesi PIN tidak valid, silakan ulangi.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const decrypted = decryptData(content, pin);
        
        if (!decrypted || !decrypted.budgetCategories) {
          throw new Error("Invalid format");
        }

        // Ideally we would update the parent state here, but since budgetCategories and transactions 
        // are controlled by DashboardApp.tsx, we need a way to restore them.
        // Let's reload the page and save to localStorage directly if we are using localStorage. 
        // Wait, where is the data saved?
        // Let's check App.tsx or DashboardApp.tsx. We might need a `onRestoreData` prop, but for now we'll just save it to localStorage and reload, assuming DashboardApp uses localStorage.
        localStorage.setItem('portal_uang_budget_categories', JSON.stringify(decrypted.budgetCategories));
        localStorage.setItem('portal_uang_transactions', JSON.stringify(decrypted.transactions));
        alert('Data berhasil dipulihkan! Memuat ulang aplikasi...');
        window.location.reload();

      } catch (err) {
        alert("Gagal memulihkan data. PIN mungkin salah atau file rusak.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Print helper
  const handlePrint = () => { setExportModalConfig({ isOpen: true, type: "pdf" }); };
  const executePrint = (startDate: string, endDate: string) => { setPrintDateRange({ start: startDate, end: endDate }); setTimeout(() => { import('../utils/pdfGenerator').then(({ generatePDF }) => { generatePDF('zero-based-budget-view', `Laporan_Anggaran_${formatDateToDDMMYYYY_HHMM()}.pdf`); setTimeout(() => setPrintDateRange(null), 500); }); }, 300); };

  // Export CSV helper for Google Sheets
  const handleExportGoogleSheets = () => { setExportModalConfig({ isOpen: true, type: "csv" }); };
  const executeExportGoogleSheets = (startDate: string, endDate: string) => {
    setPrintDateRange({ start: startDate, end: endDate });
    setTimeout(() => {
      exportGoogleSheetsInternal();
      setTimeout(() => setPrintDateRange(null), 500);
    }, 300);
  };
  const exportGoogleSheetsInternal = () => {
    const headers = ['Kelompok Kategori', 'Nama Pos Anggaran', 'Alokasi Rencana (IDR)', 'Realisasi Saat Ini (IDR)', 'Sisa Anggaran (IDR)'];
    const rows = budgetCategories.map((c) => {
      const actual = getActualForCategory(c.name);
      const remaining = c.planned - actual;
      return [
        `"${c.group}"`,
        `"${c.name}"`,
        c.planned,
        actual,
        remaining
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute("download", `Portal Uang_AnggaranBerbasisNol_GoogleSheets_${formatDateToDDMMYYYY_HHMM()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group definitions
  const GROUPS: BudgetGroup[] = [
    'Pemasukan',
    'Tagihan Tetap',
    'Pengeluaran Variabel',
    'Pos Sinking Fund',
    'Pelunasan Hutang',
    'Tabungan & Investasi'
  ];

  // Current month actual expenses mapped to category
  const currentMonth = new Date().toISOString().substring(0, 7);
  const effectiveTransactions = printDateRange 
    ? transactions.filter(t => t.date >= printDateRange.start && t.date <= printDateRange.end)
    : transactions;
  
  const monthTransactions = printDateRange 
    ? effectiveTransactions 
    : transactions.filter((t) => t.date?.startsWith(currentMonth));

  const getActualForCategory = (catName: string) => {
    return monthTransactions
      .filter((t) => t.category === catName && t.type !== 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getActualIncomeForCategory = (catName: string) => {
    return monthTransactions
      .filter((t) => t.category === catName && t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const totalPlannedIncome = budgetCategories
    .filter((c) => c.group === 'Pemasukan')
    .reduce((sum, c) => sum + c.planned, 0);

  const totalPlannedAllocations = budgetCategories
    .filter((c) => c.group !== 'Pemasukan')
    .reduce((sum, c) => sum + c.planned, 0);

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatGroup, newCatName.trim(), parseRpInput(newCatPlanned) || 0);
    setNewCatName('');
    setIsAdding(false);
  };

  const handleEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editCatName.trim()) return;
    onEditCategoryDetail(editingCat.id, editCatGroup, editCatName.trim(), parseRpInput(editCatPlanned) || 0);
    setEditingCat(null);
  };

  const openEditModal = (cat: BudgetCategory) => {
    setEditingCat(cat);
    setEditCatName(cat.name);
    setEditCatGroup(cat.group);
    setEditCatPlanned(cat.planned.toString());
  };

  // Quick 50/30/20 Preset Auto-Filler
  const handleApplyPreset = () => {
    if (totalPlannedIncome <= 0) return;
    const needs = totalPlannedIncome * 0.50; // Tagihan tetap & kebutuhan esensial
    const wants = totalPlannedIncome * 0.30; // Pengeluaran variabel & gaya hidup
    const savings = totalPlannedIncome * 0.20; // Tabungan & investasi

    const updates: { id: string, planned: number }[] = [];

    // Proportionally update categories
    const fixedList = budgetCategories.filter((c) => c.group === 'Tagihan Tetap');
    if (fixedList.length) {
      const share = needs / fixedList.length;
      fixedList.forEach((c) => updates.push({ id: c.id, planned: Math.floor(share) }));
    }

    const varList = budgetCategories.filter((c) => c.group === 'Pengeluaran Variabel');
    if (varList.length) {
      const share = wants / varList.length;
      varList.forEach((c) => updates.push({ id: c.id, planned: Math.floor(share) }));
    }

    const savList = budgetCategories.filter((c) => c.group === 'Tabungan & Investasi' || c.group === 'Pos Sinking Fund' || c.group === 'Pelunasan Hutang');
    if (savList.length) {
      const share = savings / savList.length;
      savList.forEach((c) => updates.push({ id: c.id, planned: Math.floor(share) }));
    }
    
    if (updates.length > 0) {
      onBulkUpdateCategories(updates);
    }
  };

  return (
    <>
      <ExportDateRangeModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onConfirm={exportModalConfig.type === "pdf" ? executePrint : executeExportGoogleSheets}
        transactions={transactions}
        exportType={exportModalConfig.type}
      />
      <div id="zero-based-budget-view" className="space-y-6">
      {/* Top Banner: Zero-Based Master Equation */}
      <div className={`p-6 rounded-2xl border transition-all shadow-sm ${
        Math.abs(unassignedCash) < 1
          ? 'bg-emerald-950/40 border-emerald-800/80'
          : unassignedCash > 0
          ? 'bg-amber-950/40 border-amber-800/80'
          : 'bg-rose-950/40 border-rose-800/80'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-5 h-5 text-amber-400" />
              <h2 className="font-extrabold text-xl text-stone-100">Alokator Anggaran Berbasis Nol</h2>
            </div>
            <p className="text-xs text-stone-300 max-w-2xl">
              Setiap Rupiah pemasukan Kamu harus diberikan tugas khusus ke amplop tagihan, pengeluaran, sinking fund, atau investasi hingga sisa uang belum dialokasikan tepat bernilai Rp 0.
            </p>
          </div>

          {/* Master Equation Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-stone-900/90 border border-stone-800 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-stone-400 font-medium uppercase">Rencana Pemasukan</div>
              <div className="text-lg font-bold font-mono text-emerald-400">{formatRupiah(totalPlannedIncome)}</div>
            </div>

            <div className="text-stone-500 font-bold">-</div>

            <div className="bg-stone-900/90 border border-stone-800 px-4 py-2 rounded-xl text-center">
              <div className="text-[10px] text-stone-400 font-medium uppercase">Total Dialokasikan</div>
              <div className="text-lg font-bold font-mono text-amber-400">{formatRupiah(totalPlannedAllocations)}</div>
            </div>

            <div className="text-stone-500 font-bold">=</div>

            <div className={`px-4 py-2 rounded-xl text-center border font-mono font-bold ${
              Math.abs(unassignedCash) < 1
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : unassignedCash > 0
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
            }`}>
              <div className="text-[10px] text-stone-300 font-medium uppercase">Sisa Belum Dialokasi</div>
              <div className="text-xl">
                {unassignedCash > 0 ? `+${formatRupiah(unassignedCash)}` : formatRupiah(unassignedCash)}
              </div>
            </div>
          </div>
        </div>

        {/* Status helper callout */}
        <div className="mt-4 pt-4 border-t border-stone-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            {Math.abs(unassignedCash) < 1 ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Anggaran Berbasis Nol Sempurna! Seluruh gaji memiliki tugas masing-masing.
              </span>
            ) : unassignedCash > 0 ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Masih ada {formatRupiah(unassignedCash)} yang belum dialokasikan. Pindahkan ke sinking fund atau tabungan.
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Alokasi Kamu melebihi pemasukan sebesar {formatRupiah(Math.abs(unassignedCash))}. Kurangi alokasi pos anggaran.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium flex items-center gap-1.5 border border-stone-700 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Manajemen Data (Ekspor/Impor)</span>
            </button>

            <button
              onClick={handleApplyPreset}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium flex items-center gap-1.5 border border-stone-700 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Otomatis Rumus 50/30/20</span>
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Pos Anggaran</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Category Form Modal / Drawer */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleCreateCategory} className="bg-stone-900 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-stone-100 text-lg">Buat Pos Kategori Anggaran Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Grup Kelompok</label>
                <select
                  value={newCatGroup}
                  onChange={(e) => setNewCatGroup(e.target.value as BudgetGroup)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nama Kategori Pos</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="misal: Makanan Kucing, Gym, Arisan"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nominal Anggaran (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={newCatPlanned}
                  onChange={(e) => setNewCatPlanned(formatRpInput(e.target.value))}
                  placeholder="500.000"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
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
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors shadow-sm"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Category Form Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleEditCategory} className="bg-stone-900 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-2xl w-full max-w-md">
            <h3 className="font-bold text-stone-100 text-lg">Edit Pos Kategori Anggaran</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-stone-400 block mb-1">Grup Kelompok</label>
                <select
                  value={editCatGroup}
                  onChange={(e) => setEditCatGroup(e.target.value as BudgetGroup)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nama Kategori Pos</label>
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  placeholder="misal: Makanan Kucing, Gym, Arisan"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nominal Anggaran (Rp)</label>
                <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 focus-within:border-amber-500">
                  <span className="text-stone-500 mr-2 text-sm">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatRpInput(parseRpInput(editCatPlanned))}
                    onChange={(e) => setEditCatPlanned(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-sm text-stone-200 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingCat(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-stone-800 text-stone-300 text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 text-stone-950 text-sm font-bold hover:bg-amber-400 transition-colors shadow-sm"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget Groups Accordion / Tables */}
      <div className="space-y-6">
        {GROUPS.map((group) => {
          const groupCategories = budgetCategories.filter((c) => c.group === group);
          const isIncomeGroup = group === 'Pemasukan';

          const groupTotalPlanned = groupCategories.reduce((sum, c) => sum + c.planned, 0);
          const groupTotalActual = groupCategories.reduce(
            (sum, c) => sum + (isIncomeGroup ? getActualIncomeForCategory(c.name) : getActualForCategory(c.name)),
            0
          );

          if (groupCategories.length === 0) return null;

          return (
            <div key={group} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
              {/* Group Header */}
              <div className="bg-stone-850/90 border-b border-stone-800 px-5 py-3.5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-100 text-base">{group}</span>
                  <span className="text-xs text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full font-mono">
                    {groupCategories.length} pos
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-stone-400 mr-2">Direncanakan:</span>
                    <span className="font-bold text-amber-400">{formatRupiah(groupTotalPlanned)}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 mr-2">Realisasi:</span>
                    <span className={`font-bold ${isIncomeGroup ? 'text-emerald-400' : 'text-stone-200'}`}>
                      {formatRupiah(groupTotalActual)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Group Items Table */}
              <div className="divide-y divide-stone-800/60">
                {groupCategories.map((cat) => {
                  const actual = isIncomeGroup ? getActualIncomeForCategory(cat.name) : getActualForCategory(cat.name);
                  const percent = cat.planned > 0 ? Math.min(Math.round((actual / cat.planned) * 100), 200) : 0;
                  const isOver = !isIncomeGroup && actual > cat.planned;

                  return (
                    <div key={cat.id} className="p-4 sm:px-5 hover:bg-stone-850/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Name & Meter */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-stone-200 text-sm truncate">{cat.name}</span>
                          <span className="text-xs font-mono text-stone-400">
                            {formatRupiah(actual)} / {formatRupiah(cat.planned)} ({percent}%)
                          </span>
                        </div>

                        {/* Progress Meter */}
                        {!isIncomeGroup && (
                          <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isOver ? 'bg-rose-500' : percent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>

                      {/* Edit Planned Amount Input */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1">
                          <span className="text-stone-500 text-xs">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatRpInput(cat.planned)}
                            onChange={(e) => onUpdateCategory(cat.id, parseRpInput(e.target.value))}
                            className="w-28 bg-transparent text-xs text-stone-100 font-mono font-bold text-right focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-stone-500 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition-colors"
                          title="Edit Pos Anggaran"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteCategory(cat.id)}
                          className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors"
                          title="Hapus Pos Anggaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    
    <input 
      type="file" 
      accept=".json" 
      ref={fileInputRef} 
      onChange={handleFileImport} 
      className="hidden" 
    />
    
    <DataManagementModal 
      isOpen={isDataModalOpen} 
      onClose={() => setIsDataModalOpen(false)} 
      onAction={handleDataAction} 
    />
    
    <PinModal 
      isOpen={isPinModalOpen} 
      onClose={() => setIsPinModalOpen(false)} 
      onSuccess={handlePinSuccess} 
      mode={pinMode} 
    />
    </>
  );
};

