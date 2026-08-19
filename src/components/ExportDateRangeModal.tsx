import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';

interface ExportDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  transactions: Transaction[];
  exportType: 'pdf' | 'csv';
}

export const ExportDateRangeModal: React.FC<ExportDateRangeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  transactions,
  exportType
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Default to last 30 days or earliest transaction if less
      const today = new Date();
      let start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      
      let earliestDateStr = start.toISOString().split('T')[0];
      
      if (transactions.length > 0) {
        const sortedDates = [...transactions].map(t => t.date).sort();
        const earliestTxDate = sortedDates[0];
        // max 1 year ago
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
        
        if (earliestTxDate < oneYearAgoStr) {
          earliestDateStr = oneYearAgoStr;
        } else {
          earliestDateStr = earliestTxDate;
        }
      }
      
      setStartDate(earliestDateStr);
      setEndDate(today.toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, transactions]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!startDate || !endDate) {
      setError('Pilih rentang tanggal.');
      return;
    }
    if (startDate > endDate) {
      setError('Tanggal mulai tidak boleh lebih dari tanggal akhir.');
      return;
    }
    
    // Check max 1 year range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 366) {
      setError('Rentang tanggal maksimal 1 tahun (365 hari).');
      return;
    }

    onConfirm(startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-800">
          <h2 className="text-lg font-bold text-stone-200">
            {exportType === 'pdf' ? 'Cetak Laporan PDF' : 'Ekspor Google Sheets'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-400">
            Pilih rentang tanggal untuk data yang akan diekspor (maksimal 1 tahun atau sejak akun dibuat).
          </p>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tanggal Mulai</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 appearance-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tanggal Akhir</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-stone-200 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-800 bg-stone-850/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
              exportType === 'pdf' 
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <span>{exportType === 'pdf' ? 'Cetak Sekarang' : 'Ekspor CSV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
