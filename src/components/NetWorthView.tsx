import React, { useState } from 'react';
import { Account, NetWorthSnapshot, formatRupiah } from '../types';
import { 
  TrendingUp, 
  Plus, 
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface NetWorthViewProps {
  accounts: Account[];
  snapshots: NetWorthSnapshot[];
  onAddSnapshot: (snapshot: Omit<NetWorthSnapshot, 'id'>) => void;
  onDeleteSnapshot: (id: string) => void;
}

export const NetWorthView: React.FC<NetWorthViewProps> = ({
  accounts,
  snapshots,
  onAddSnapshot,
  onDeleteSnapshot,
}) => {
  const [notes, setNotes] = useState('');

  const totalAssets = accounts
    .filter((a) => a.category === 'asset')
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.category === 'liability')
    .reduce((sum, a) => sum + a.balance, 0);

  const currentNetWorth = totalAssets - totalLiabilities;

  const handleLogSnapshot = () => {
    const todayYYYYMM = new Date().toISOString().substring(0, 7);
    onAddSnapshot({
      date: todayYYYYMM,
      totalAssets,
      totalLiabilities,
      netWorth: currentNetWorth,
      notes: notes.trim() || undefined,
    });
    setNotes('');
  };

  const sortedSnapshots = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-stone-100">Grafik & Rekap Kekayaan Bersih (Net Worth)</h2>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl">
            Pantau pertumbuhan total kekayaan Anda dari waktu ke waktu dengan mencatat rekap bulanan aset dikurangi kewajiban/utang.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan snapshot (opsional)..."
            className="bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 sm:py-2 text-sm sm:text-xs text-stone-200 focus:outline-none focus:border-amber-500 w-full sm:w-48"
          />
          <button
            onClick={handleLogSnapshot}
            className="px-4 py-3 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Catat Rekap Bulanan</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-stone-400 font-semibold uppercase">Total Bank & Simpanan</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
            {formatRupiah(totalAssets)}
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-stone-400 font-semibold uppercase">Total Hutang</span>
          <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
            {formatRupiah(totalLiabilities)}
          </div>
        </div>

        <div className="bg-stone-900 border border-amber-500/40 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-amber-400 font-semibold uppercase">Kekayaan Bersih Saat Ini</span>
          <div className="text-2xl font-extrabold text-stone-100 font-mono mt-1">
            {formatRupiah(currentNetWorth)}
          </div>
        </div>
      </div>

      {/* Historical Net Worth Area Chart */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-stone-100 text-base">Tren Pertumbuhan Kekayaan Bersih</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedSnapshots} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#78716c" fontSize={11} tickLine={false} />
              <YAxis stroke="#78716c" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1c1917', borderColor: '#44403c', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: number) => formatRupiah(val)}
              />
              <Area type="monotone" dataKey="netWorth" name="Kekayaan Bersih" stroke="#f59e0b" fillOpacity={1} fill="url(#nwGrad)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Snapshot Logs Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-stone-850/90 border-b border-stone-800">
          <h3 className="font-bold text-stone-100 text-sm">Riwayat Catatan Snapshot Kekayaan</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 font-semibold uppercase border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Bulan</th>
                <th className="py-3 px-4">Total Aset</th>
                <th className="py-3 px-4">Total Utang</th>
                <th className="py-3 px-4">Kekayaan Bersih</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              {sortedSnapshots.map((s) => (
                <tr key={s.id} className="hover:bg-stone-850/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-stone-200">{s.date}</td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{formatRupiah(s.totalAssets)}</td>
                  <td className="py-3 px-4 font-mono text-rose-400">{formatRupiah(s.totalLiabilities)}</td>
                  <td className="py-3 px-4 font-mono font-extrabold text-amber-400">{formatRupiah(s.netWorth)}</td>
                  <td className="py-3 px-4 text-stone-400">{s.notes || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onDeleteSnapshot(s.id)}
                      className="p-1 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded transition-colors"
                      title="Hapus Snapshot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

