import React, { useState } from 'react';
import { Search, Eye, Filter } from 'lucide-react';
import { formatRupiah } from '../../types';

export const AdminTransactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const transactions = [
    { id: 'TX-1001', user: 'budi@example.com', type: 'expense', amount: 50000, category: 'Food', date: '2026-07-30', status: 'completed' },
    { id: 'TX-1002', user: 'siti@example.com', type: 'income', amount: 5000000, category: 'Salary', date: '2026-07-30', status: 'completed' },
    { id: 'TX-1003', user: 'agus@example.com', type: 'expense', amount: 150000, category: 'Transport', date: '2026-07-29', status: 'completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Global Transactions</h1>
          <p className="text-sm text-stone-400 mt-1">Monitor user transactions for auditing and support.</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="px-3 py-2 border border-stone-800 rounded-xl bg-stone-900 text-stone-300 hover:bg-stone-800 transition-colors flex items-center gap-2 text-sm font-medium">
             <Filter className="w-4 h-4" /> Filter
           </button>
           <div className="relative w-full sm:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-stone-500" />
             </div>
             <input
               type="text"
               className="block w-full pl-10 pr-3 py-2 border border-stone-800 rounded-xl leading-5 bg-stone-900 text-stone-300 placeholder-stone-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 sm:text-sm transition-colors"
               placeholder="Search TX ID or Email..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-800">
            <thead className="bg-stone-950/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">TX ID / Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-stone-900 divide-y divide-stone-800">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-stone-850/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-stone-200">{tx.id}</div>
                    <div className="text-xs text-stone-500">{tx.date}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-300">
                    {tx.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-800 text-stone-300 border border-stone-700">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-stone-200'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded transition-colors" title="View Details">
                      <Eye className="w-4 h-4" />
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
