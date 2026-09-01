import React, { useState } from 'react';
import { X, FileText, Database, UploadCloud, Download, ShieldAlert } from 'lucide-react';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'print_pdf' | 'backup_local' | 'backup_drive' | 'restore_drive' | 'import_local') => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose, onAction }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <h2 className="text-lg font-bold text-stone-200">Manajemen Data & Ekspor</h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-400 mb-2">
            Pilih metode ekspor atau backup data Anda. File backup akan diproteksi menggunakan enkripsi PIN demi keamanan privasi finansial Anda.
          </p>

          <div className="grid gap-3">
            <button
              onClick={() => onAction('print_pdf')}
              className="flex items-center gap-4 p-4 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 hover:border-amber-500/50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-200 text-sm">Cetak PDF Laporan</h3>
                <p className="text-xs text-stone-500 mt-0.5">Format HTML untuk dicetak ke PDF (tanpa PIN)</p>
              </div>
            </button>

            <button
              onClick={() => onAction('backup_drive')}
              className="flex items-center gap-4 p-4 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 hover:border-emerald-500/50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-200 text-sm">Backup ke Google Drive</h3>
                <p className="text-xs text-stone-500 mt-0.5">Simpan backup terenkripsi ke GDrive</p>
              </div>
            </button>

            <button
              onClick={() => onAction('backup_local')}
              className="flex items-center gap-4 p-4 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 hover:border-blue-500/50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-200 text-sm">Download Backup Lokal</h3>
                <p className="text-xs text-stone-500 mt-0.5">Simpan file terenkripsi (.json) ke perangkat</p>
              </div>
            </button>
            
            <button
              onClick={() => onAction('restore_drive')}
              className="flex items-center gap-4 p-4 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 hover:border-emerald-500/50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-200 text-sm">Restore dari GDrive</h3>
                <p className="text-xs text-stone-500 mt-0.5">Pulihkan backup dari Google Drive</p>
              </div>
            </button>
            <button
              onClick={() => onAction('import_local')}
              className="flex items-center gap-4 p-4 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 hover:border-purple-500/50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-200 text-sm">Restore Data (Import)</h3>
                <p className="text-xs text-stone-500 mt-0.5">Pulihkan dari file backup lokal (.json)</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
