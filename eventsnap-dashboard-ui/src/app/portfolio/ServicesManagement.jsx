"use client";

import { Plus, Trash2 } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';
import { INPUT, TEXTAREA } from './styles';

export function ServicesManagement() {
  const { data, scheduleSave } = usePortfolioDataStore();
  const services = data.services;
  const commit = (next) => scheduleSave({ ...data, services: next });

  const addService = () => {
    commit([...services, { id: Date.now().toString(), title: '', description: '', duration: '', price: '' }]);
  };
  const removeService = (id) => commit(services.filter(x => x.id !== id));
  const updateService = (id, field, val) => {
    commit(services.map(svc => svc.id === id ? { ...svc, [field]: val } : svc));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Services</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage the photography services shown on your portfolio</p>
        </div>
        <button onClick={addService} className="flex items-center gap-2 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5B52EE] transition-colors">
          <Plus size={16} />
          Add Service
        </button>
      </div>
      <div className="space-y-4">
        {services.map((svc, idx) => (
          <div key={svc.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500">Service {idx + 1}</span>
              <button onClick={() => removeService(svc.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 @max-[560px]:grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Service Name</label>
                <input className={INPUT} value={svc.title} onChange={e => updateService(svc.id, 'title', e.target.value)} placeholder="e.g. Wedding Photography" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Duration</label>
                <input className={INPUT} value={svc.duration} onChange={e => updateService(svc.id, 'duration', e.target.value)} placeholder="e.g. 8–12 hours" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Starting Price</label>
                <input className={INPUT} value={svc.price} onChange={e => updateService(svc.id, 'price', e.target.value)} placeholder="e.g. From ₹3,800" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
                <textarea className={TEXTAREA} rows={2} value={svc.description} onChange={e => updateService(svc.id, 'description', e.target.value)} placeholder="Brief description..." />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addService} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors">
          <Plus size={16} />Add Service
        </button>
      </div>
    </div>
  );
}
