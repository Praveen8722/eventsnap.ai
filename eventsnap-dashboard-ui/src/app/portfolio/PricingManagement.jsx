"use client";

import { Plus, Check } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';
import { INPUT, TEXTAREA } from './styles';

export function PricingManagement() {
  const { data, scheduleSave } = usePortfolioDataStore();
  const packages = data.pricing;
  const setPackages = (updater) =>
    scheduleSave({ ...data, pricing: typeof updater === 'function' ? updater(packages) : updater });

  const addPackage = () => setPackages(p => [
    ...p,
    { id: Date.now().toString(), name: '', price: '', description: '', features: [''], popular: false },
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Pricing</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage your photography packages and pricing</p>
        </div>
        <button onClick={addPackage} className="flex items-center gap-2 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5B52EE] transition-colors">
          <Plus size={16} />
          Add Package
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 @max-[700px]:grid-cols-1 gap-5">
        {packages.map(pkg => (
          <div key={pkg.id} className={`cursor-pointer dashboard-card bg-white rounded-xl border-2 p-5 shadow-sm relative ${pkg.popular ? 'border-[#6C63FF]' : 'border-gray-100'}`}>
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#6C63FF] to-[#FF675D] text-white text-[10px] font-bold px-3 py-0.5 rounded-full">Most Popular</div>
            )}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Package Name</label>
                <input className={INPUT} value={pkg.name} onChange={e => setPackages(p => p.map(x => x.id === pkg.id ? { ...x, name: e.target.value } : x))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Price</label>
                <input className={INPUT} value={pkg.price} onChange={e => setPackages(p => p.map(x => x.id === pkg.id ? { ...x, price: e.target.value } : x))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
                <textarea className={TEXTAREA} rows={2} value={pkg.description} onChange={e => setPackages(p => p.map(x => x.id === pkg.id ? { ...x, description: e.target.value } : x))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">Features</label>
                <div className="space-y-2">
                  {pkg.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2">
                      <Check size={13} className="text-[#6C63FF] flex-shrink-0" />
                      <input className={`${INPUT} flex-1`} value={f} onChange={e => setPackages(p => p.map(x => x.id === pkg.id ? { ...x, features: x.features.map((xf, xi) => xi === fi ? e.target.value : xf) } : x))} />
                    </div>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 pt-1">
                <input type="checkbox" checked={pkg.popular} onChange={e => setPackages(p => p.map(x => x.id === pkg.id ? { ...x, popular: e.target.checked } : x))} className="rounded text-[#6C63FF]" />
                Mark as Most Popular
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
