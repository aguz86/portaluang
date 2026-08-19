import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Shield, ShieldOff, Star, Edit, Ban, CheckCircle2 } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.users) {
          // Parse data assuming it comes as an array of user objects
          const formattedUsers = data.users.map((u: any) => ({
            id: u.id,
            name: u.name || 'Unknown',
            email: u.email || u.id,
            city: u.city || '-',
            plan: u.subscription?.planId === 'free_trial' ? 'free' : 'pro',
            status: u.subscription?.status === 'active' ? 'active' : 'expired',
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '-',
            lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID') : '-'
          }));
          // Sort by latest created/login
          formattedUsers.sort((a: any, b: any) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime());
          setUsers(formattedUsers);
        }
      })
      .catch(e => console.error('Error fetching users', e));
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">User Management</h1>
          <p className="text-sm text-stone-400 mt-1">Manage user accounts, subscriptions, and access.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-stone-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-stone-800 rounded-xl leading-5 bg-stone-900 text-stone-300 placeholder-stone-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 sm:text-sm transition-colors"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-800">
            <thead className="bg-stone-950/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">City</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Plan</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Joined</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">Last Login</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-stone-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-stone-900 divide-y divide-stone-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-stone-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : null}
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-stone-850/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-stone-800 rounded-full flex items-center justify-center font-bold text-stone-300">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-stone-200">{user.name}</div>
                        <div className="text-sm text-stone-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-300">
                    {user.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.plan === 'pro' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-stone-800 text-stone-400 border border-stone-700'}`}>
                      {user.plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                      {user.status === 'active' ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-400">
                    {user.joined}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-400/90 font-medium">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                       {user.plan !== 'pro' && (
                         <button className="p-1.5 text-stone-400 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors" title="Upgrade to Pro">
                           <Star className="w-4 h-4" />
                         </button>
                       )}
                       {user.status === 'active' ? (
                         <button className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="Ban User">
                           <Ban className="w-4 h-4" />
                         </button>
                       ) : (
                         <button className="p-1.5 text-stone-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" title="Unban User">
                           <CheckCircle2 className="w-4 h-4" />
                         </button>
                       )}
                       <button className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded transition-colors" title="Edit User">
                         <Edit className="w-4 h-4" />
                       </button>
                    </div>
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
