import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X, Check, Loader2 } from 'lucide-react';
import { SUBSCRIPTION_PLANS, syncSubscriptionPlans } from '../../utils/subscription';

interface Plan {
  id: string;
  name: string;
  price: number;
  users: number; // mock metric
  features: string[];
}

export const AdminSubscriptions: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setPlans(data.data);
      } else {
        // Default initial data if none, mapping from actual app plans
        const defaultPlans = SUBSCRIPTION_PLANS.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          users: Math.floor(Math.random() * 500),
          features: p.features
        }));
        setPlans(defaultPlans);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveToBackend = async (newPlans: Plan[]) => {
    try {
      await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ plans: newPlans })
      });
      // Sync globally
      await syncSubscriptionPlans();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan ke server");
    }
  };

  const handleAdd = () => {
    setEditForm({
      id: Date.now().toString(),
      name: '',
      price: 0,
      users: 0,
      features: ['']
    });
    setIsEditing(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditForm({ ...plan, features: [...plan.features] });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus plan ini?')) return;
    const newPlans = plans.filter(p => p.id !== id);
    setPlans(newPlans);
    await saveToBackend(newPlans);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    // Filter out empty features
    const cleanedFeatures = editForm.features.filter(f => f.trim() !== '');
    const planToSave = { ...editForm, features: cleanedFeatures };

    const existingIndex = plans.findIndex(p => p.id === planToSave.id);
    let newPlans = [...plans];
    
    if (existingIndex >= 0) {
      newPlans[existingIndex] = planToSave;
    } else {
      newPlans.push(planToSave);
    }

    setPlans(newPlans);
    setIsEditing(false);
    setEditForm(null);
    await saveToBackend(newPlans);
  };

  const updateFeature = (index: number, value: string) => {
    if (!editForm) return;
    const newFeatures = [...editForm.features];
    newFeatures[index] = value;
    setEditForm({ ...editForm, features: newFeatures });
  };

  const addFeatureRow = () => {
    if (!editForm) return;
    setEditForm({ ...editForm, features: [...editForm.features, ''] });
  };

  const removeFeatureRow = (index: number) => {
    if (!editForm) return;
    const newFeatures = editForm.features.filter((_, i) => i !== index);
    setEditForm({ ...editForm, features: newFeatures });
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-stone-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Subscription Plans</h1>
          <p className="text-sm text-stone-400 mt-1">Manage pricing tiers and packages.</p>
        </div>
        {!isEditing && (
          <button onClick={handleAdd} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        )}
      </div>

      {isEditing && editForm ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-stone-100">
              {plans.find(p => p.id === editForm.id) ? 'Edit Plan' : 'Add New Plan'}
            </h2>
            <button onClick={() => setIsEditing(false)} className="p-2 text-stone-400 hover:text-stone-100"><X className="w-5 h-5"/></button>
          </div>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Plan Name</label>
                <input 
                  type="text" 
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Price (Rp)</label>
                <input 
                  type="number" 
                  value={editForm.price}
                  onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Features</label>
              <div className="space-y-2">
                {editForm.features.map((feature, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text"
                      value={feature}
                      onChange={e => updateFeature(idx, e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                      placeholder="Feature description"
                    />
                    <button type="button" onClick={() => removeFeatureRow(idx)} className="p-2 text-stone-500 hover:text-rose-500 bg-stone-950 border border-stone-800 rounded-xl">
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addFeatureRow} className="mt-3 text-sm text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1">
                <Plus className="w-4 h-4"/> Add Feature
              </button>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl border border-stone-700 text-stone-300 text-sm font-medium hover:bg-stone-800 transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl flex items-center gap-2 transition-colors">
                <Save className="w-4 h-4"/> Save Plan
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => handleEdit(plan)} className="p-1.5 bg-stone-800 hover:bg-stone-700 text-amber-500 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                 <button onClick={() => handleDelete(plan.id)} className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
               </div>
               
               <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-amber-500 mb-4">
                 <Package className="w-6 h-6" />
               </div>
               
               <h3 className="text-xl font-bold text-stone-100">{plan.name}</h3>
               
               <div className="mt-2 flex items-baseline gap-1">
                 <span className="text-2xl font-extrabold text-stone-100">Rp {plan.price.toLocaleString('id-ID')}</span>
                 <span className="text-stone-500 text-sm">/ {plan.price > 100000 ? 'year' : 'month'}</span>
               </div>
               
               <p className="mt-4 text-sm font-medium text-emerald-400">{plan.users} active subscribers</p>
               
               <ul className="mt-6 space-y-2">
                 {plan.features.map((feature, idx) => (
                   <li key={idx} className="text-sm text-stone-400 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                     {feature}
                   </li>
                 ))}
               </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
