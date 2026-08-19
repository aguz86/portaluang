import { formatDateToDDMMYYYY_HHMM } from '../utils/format';
import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, ShieldCheck, CheckCircle2, FileSpreadsheet, Printer } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullData: any;
  onImportData: (importedData: any) => void;
  onResetData: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  fullData,
  onImportData,
  onResetData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute("download", `Portal Uang_Backup_${formatDateToDDMMYYYY_HHMM()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setSuccessMsg('Full JSON backup downloaded successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExportCSV = () => {
    const txs = fullData.transactions || [];
    const headers = ['Tanggal', 'Penerima/Keterangan', 'Kategori', 'Rekening ID', 'Jumlah (IDR)', 'Jenis', 'Status', 'Catatan'];
    const rows = txs.map((t: any) => [
      t.date,
      `"${(t.payee || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${t.accountId || ''}"`,
      t.amount,
      t.type,
      t.status,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute("download", `Portal Uang_SemuaTransaksi_GoogleSheets_${formatDateToDDMMYYYY_HHMM()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMsg('File CSV Google Sheets berhasil diunduh!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handlePrint = () => {
    import('../utils/pdfGenerator').then(({ generatePDF }) => {
      generatePDF('main-app-container', `Portal Uang_Backup_Report_${formatDateToDDMMYYYY_HHMM()}.pdf`);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.accounts && parsed.transactions) {
            onImportData(parsed);
            setSuccessMsg('Backup restored successfully!');
            setTimeout(() => {
              setSuccessMsg(null);
              onClose();
            }, 1500);
          } else {
            alert('Invalid backup file structure.');
          }
        } catch (err) {
          alert('Failed to parse JSON file.');
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fadeIn">
        <div className="bg-stone-850 border-b border-stone-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-stone-100 text-base">Backup & Data Management</h3>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-stone-400">
            Portal Uang stores your data securely. You can still export regular JSON backups if needed.
          </p>

          {successMsg && (
            <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            {/* Download JSON */}
            <button
              onClick={handleExportJSON}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Backup Lengkap (.JSON)</span>
            </button>

            {/* Export CSV for Google Sheets */}
            <button
              onClick={handleExportCSV}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-950 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 border border-emerald-800 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Format Google Sheets (.CSV)</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={handlePrint}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak / Simpan Laporan PDF</span>
            </button>

            {/* Import JSON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Pulihkan Backup (.JSON)</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            {/* Reset */}
            <button
              onClick={() => {
                onResetData();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-800/60 transition-colors mt-4"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset to Sample Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
