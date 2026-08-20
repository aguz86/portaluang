import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingDown, ReceiptText, ArrowUpRight, ArrowDownRight, Activity, CheckCircle2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) return;

        const usersRes = await fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (usersRes.ok) {
          const data = await usersRes.json();
          if (data.success && data.users) {
            setUsers(data.users);
            setUserCount(data.users.length);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    { label: 'Total Users', value: loading ? '...' : userCount.toString(), change: '+0%', isPositive: true, icon: <Users className="w-5 h-5" /> },
    { label: 'MRR', value: 'Rp 0', change: '0%', isPositive: true, icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Churn Rate', value: '0%', change: '0%', isPositive: true, icon: <TrendingDown className="w-5 h-5" /> },
    { label: "Today's TX", value: '0', change: '0%', isPositive: true, icon: <ReceiptText className="w-5 h-5" /> },
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
            <div className={`mt-4 flex items-center text-xs font-semibold ${stat.isPositive ? 'text-emerald-400' : 'text-stone-500'}`}>
              <Activity className="w-3 h-3 mr-1" />
              Real-time Tracker
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-stone-100 mb-4">Recent Registrations</h3>
           <div className="space-y-4">
             {loading ? (
               <p className="text-sm text-stone-500 text-center py-4">Memuat data...</p>
             ) : users.length === 0 ? (
               <p className="text-sm text-stone-500 text-center py-4">Belum ada pengguna terdaftar.</p>
             ) : (
               users.slice(0, 5).map((user: any, i: number) => (
                 <div key={i} className="flex items-center justify-between pb-4 border-b border-stone-800 last:border-0 last:pb-0">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400 uppercase">
                       {user.id ? user.id.substring(0, 1) : 'U'}
                     </div>
                     <div>
                       <p className="text-sm font-medium text-stone-200">{user.id || 'Unknown User'}</p>
                       <p className="text-xs text-stone-500">Free Plan</p>
                     </div>
                   </div>
                   <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-stone-800 text-stone-300">Active</span>
                 </div>
               ))
             )}
           </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-bold text-stone-100 mb-4">System Alerts</h3>
           <div className="space-y-4">
             <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
               <div className="mt-0.5 text-emerald-500">
                 <CheckCircle2 className="w-5 h-5" />
               </div>
               <div>
                 <p className="text-sm font-bold text-emerald-400">Semua Sistem Normal</p>
                 <p className="text-xs text-stone-400 mt-1">Tidak ada peringatan atau error di server saat ini.</p>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
