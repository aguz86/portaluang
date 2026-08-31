import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Edit2, Trash2, Save, X, Loader2, Check } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'duration';
  discountValue: number;
  validUntil: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
}

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Coupon | null>(null);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCoupons(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveToBackend = async (newCoupons: Coupon[]) => {
    try {
      await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ coupons: newCoupons })
      });
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan ke server');
    }
  };

  const handleAdd = () => {
    setEditForm({
      id: Date.now().toString(),
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxUses: 100,
      usedCount: 0,
      isActive: true
    });
    setIsEditing(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditForm({ ...coupon });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kupon ini?')) return;
    const newCoupons = coupons.filter(c => c.id !== id);
    setCoupons(newCoupons);
    await saveToBackend(newCoupons);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    
    // Normalize code to uppercase without spaces
    const normalizedForm = { ...editForm, code: editForm.code.toUpperCase().replace(/\s+/g, '') };

    const existingIndex = coupons.findIndex(c => c.id === normalizedForm.id);
    let newCoupons = [...coupons];
    
    if (existingIndex >= 0) {
      newCoupons[existingIndex] = normalizedForm;
    } else {
      newCoupons.push(normalizedForm);
    }
    setCoupons(newCoupons);
    setIsEditing(false);
    setEditForm(null);
    await saveToBackend(newCoupons);
  };

  const toggleStatus = async (id: string) => {
    const newCoupons = coupons.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c);
    setCoupons(newCoupons);
    await saveToBackend(newCoupons);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Manajemen Kupon</h1>
          <p className="text-sm text-stone-400 mt-1">Buat dan kelola kode promo atau kupon diskon.</p>
        </div>
        {!isEditing && (
          <button onClick={handleAdd} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Kupon Baru
          </button>
        )}
      </div>

      {isEditing && editForm ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-100">
              {coupons.find(c => c.id === editForm.id) ? 'Edit Kupon' : 'Buat Kupon Baru'}
            </h2>
            <button type="button" onClick={() => setIsEditing(false)} className="p-2 text-stone-400 hover:text-stone-100"><X className="w-5 h-5"/></button>
          </div>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Kode Kupon</label>
                <input 
                  type="text" 
                  value={editForm.code}
                  onChange={e => setEditForm({...editForm, code: e.target.value.toUpperCase()})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500 uppercase"
                  placeholder="Contoh: PROMO50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Tipe Kupon</label>
                <select 
                  value={editForm.discountType}
                  onChange={e => setEditForm({...editForm, discountType: e.target.value as any})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="percentage">Diskon Persentase (%)</option>
                  <option value="fixed">Diskon Nominal (Rp)</option>
                  <option value="duration">Gratis Durasi (Hari)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">
                  {editForm.discountType === 'percentage' ? 'Persentase Diskon (%)' : 
                   editForm.discountType === 'fixed' ? 'Nominal Potongan (Rp)' : 'Durasi Gratis (Hari)'}
                </label>
                <input 
                  type="number" 
                  value={editForm.discountValue}
                  onChange={e => setEditForm({...editForm, discountValue: Number(e.target.value)})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Batas Maksimal Penggunaan</label>
                <input 
                  type="number" 
                  value={editForm.maxUses}
                  onChange={e => setEditForm({...editForm, maxUses: Number(e.target.value)})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Durasi Berlaku Sampai</label>
                <input 
                  type="date" 
                  value={editForm.validUntil.split('T')[0]}
                  onChange={e => setEditForm({...editForm, validUntil: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
              <div className="flex items-center gap-3 md:mt-8">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-3 text-sm font-medium text-stone-300">Status Aktif</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-stone-800 mt-6">
              <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl border border-stone-700 text-stone-300 text-sm font-medium hover:bg-stone-800 transition-colors">
                Batal
              </button>
              <button type="submit" className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors">
                <Save className="w-4 h-4"/> Simpan Kupon
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleEdit(coupon)} className="p-1.5 bg-stone-800 hover:bg-stone-700 text-rose-500 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                 <button onClick={() => handleDelete(coupon.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
               </div>
               
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-rose-500">
                   <Ticket className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-stone-100 tracking-wider">{coupon.code}</h3>
                   <div className="flex items-center gap-2 mt-1">
                     <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${coupon.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-400'}`}>
                       {coupon.isActive ? 'AKTIF' : 'TIDAK AKTIF'}
                     </span>
                   </div>
                 </div>
               </div>
               
               <div className="space-y-2 mt-4">
                 <div className="flex justify-between text-sm">
                   <span className="text-stone-500">Nilai Promo</span>
                   <span className="font-bold text-stone-200">
                     {coupon.discountType === 'percentage' && `${coupon.discountValue}%`}
                     {coupon.discountType === 'fixed' && `Rp ${coupon.discountValue.toLocaleString('id-ID')}`}
                     {coupon.discountType === 'duration' && `+${coupon.discountValue} Hari`}
                   </span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-stone-500">Masa Berlaku</span>
                   <span className="font-medium text-amber-400">
                     {new Date(coupon.validUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                   </span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-stone-500">Penggunaan</span>
                   <span className="font-medium text-stone-300">
                     {coupon.usedCount} / {coupon.maxUses}
                   </span>
                 </div>
               </div>
               
               <div className="mt-5 pt-4 border-t border-stone-800 flex justify-between items-center">
                  <span className="text-xs text-stone-500">Tipe: {coupon.discountType.toUpperCase()}</span>
                  <button 
                    onClick={() => toggleStatus(coupon.id)}
                    className={`text-xs font-semibold hover:underline ${coupon.isActive ? 'text-stone-400' : 'text-emerald-400'}`}
                  >
                    {coupon.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
               </div>
            </div>
          ))}
          {coupons.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-stone-800 rounded-2xl">
              <Ticket className="w-12 h-12 text-stone-700 mb-3" />
              <p className="text-stone-400 font-medium">Belum ada kupon yang dibuat</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
