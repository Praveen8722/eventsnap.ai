"use client";

import { Plus, Star, Trash2 } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';
import { INPUT, TEXTAREA } from './styles';

export function TestimonialsManagement() {
  const { data, scheduleSave } = usePortfolioDataStore();
  const testimonials = data.testimonials;
  const setTestimonials = (updater) =>
    scheduleSave({ ...data, testimonials: typeof updater === 'function' ? updater(testimonials) : updater });

  const update = (id, field, val) => {
    setTestimonials(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));
  };
  const addTestimonial = () => setTestimonials(t => [
    ...t,
    { id: Date.now().toString(), clientName: '', eventType: '', rating: 5, review: '', date: '' },
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Testimonials</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage client reviews displayed on your portfolio</p>
        </div>
        <button onClick={addTestimonial} className="flex items-center gap-2 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5B52EE] transition-colors">
          <Plus size={16} />
          Add Testimonial
        </button>
      </div>
      <div className="space-y-4">
        {testimonials.map((t, idx) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm cursor-pointer dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#FF675D] flex items-center justify-center text-white font-bold text-sm">
                  {(t.clientName || '?').charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm text-[#1E1E1E]">{t.clientName || `Client ${idx + 1}`}</div>
                  <div className="text-xs text-gray-400">{t.eventType} · {t.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => update(t.id, 'rating', n)}>
                      <Star size={14} fill={n <= t.rating ? '#F59E0B' : 'none'} className={n <= t.rating ? 'text-[#F59E0B]' : 'text-gray-200'} />
                    </button>
                  ))}
                </div>
                <button onClick={() => setTestimonials(ts => ts.filter(x => x.id !== t.id))} className="text-gray-300 hover:text-red-400 transition-colors ml-2">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 @max-[560px]:grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Client Name</label>
                <input className={INPUT} value={t.clientName} onChange={e => update(t.id, 'clientName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Event Type</label>
                <input className={INPUT} value={t.eventType} onChange={e => update(t.id, 'eventType', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Date</label>
                <input className={INPUT} value={t.date} onChange={e => update(t.id, 'date', e.target.value)} />
              </div>
              <div className="sm:col-span-3 @max-[560px]:col-span-1 space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Review</label>
                <textarea className={TEXTAREA} rows={2} value={t.review} onChange={e => update(t.id, 'review', e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
