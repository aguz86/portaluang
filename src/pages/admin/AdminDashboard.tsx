import React from 'react';
import { Users, DollarSign, TrendingDown, ReceiptText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Total Users', value: '1,248', change: '+12%', isPositive: true, icon: <Users className="w-5 h-5" /> },
    { label: 'MRR', value: 'Rp 48.500.000', change: '+8.4%', isPositive: true, icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Churn Rate', value: '2.1%', change: '-0.4%', isPositive: true, icon: <TrendingDown className="w-5 h-5" /> },
    { label: "Today's TX", value: '342', change: '+24%', isPositive: true, icon: <ReceiptText className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Overview</h1>
        <p className="text-sm text-stone-400 mt-1">Key metrics and system status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-stone-400">{stat.label}</p>
                <p className="text-2xl font-bold text-stone-100 mt-2">{stat.value}</p>
              </div>
              <div className="p-2 bg-stone-800 rounded-xl text-stone-400">
                {stat.icon}
              </div>
            </div>
            <div className={`mt-4 flex items-center text-xs font-semibold ${stat.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stat.isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
              {stat.change} <span className="text-stone-500 font-medium ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-stone-100 mb-4">Recent Registrations</h3>
           <div className="space-y-4">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="flex items-center justify-between pb-4 border-b border-stone-800 last:border-0 last:pb-0">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">
                     U{i}
                   </div>
                   <div>
                     <p className="text-sm font-medium text-stone-200">user{i}@example.com</p>
                     <p className="text-xs text-stone-500">Free Plan • 2 mins ago</p>
                   </div>
                 </div>
                 <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-stone-800 text-stone-300">New</span>
               </div>
             ))}
           </div>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-stone-100 mb-4">System Alerts</h3>
           <div className="space-y-4">
             <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
               <div className="mt-0.5 text-amber-500">
                 <Users className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm font-bold text-amber-400">High API Usage</p>
                 <p className="text-xs text-stone-400 mt-1">OpenAI token usage has reached 80% of daily limit.</p>
               </div>
             </div>
             <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
               <div className="mt-0.5 text-emerald-500">
                 <DollarSign className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm font-bold text-emerald-400">Payouts Processed</p>
                 <p className="text-xs text-stone-400 mt-1">Affiliate payouts for this week have been successfully transferred.</p>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
