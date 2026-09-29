"use client";

import { Plus, Trash2 } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';
import { INPUT, TEXTAREA } from './styles';

export function FAQManagement() {
  const { data, scheduleSave } = usePortfolioDataStore();
  const faqs = data.faqs;
  const setFaqs = (updater) =>
    scheduleSave({ ...data, faqs: typeof updater === 'function' ? updater(faqs) : updater });

  const update = (id, field, val) => {
    setFaqs(f => f.map(x => x.id === id ? { ...x, [field]: val } : x));
  };
  const add = () => setFaqs(f => [...f, { id: Date.now().toString(), question: '', answer: '' }]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">FAQ</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage frequently asked questions on your portfolio</p>
        </div>
        <button onClick={add} className="flex items-center gap-2 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5B52EE] transition-colors">
          <Plus size={16} />
          Add Question
        </button>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div key={faq.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Question {idx + 1}</span>
              <button onClick={() => setFaqs(f => f.filter(x => x.id !== faq.id))} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Question</label>
                <input className={INPUT} value={faq.question} onChange={e => update(faq.id, 'question', e.target.value)} placeholder="Frequently asked question..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Answer</label>
                <textarea className={TEXTAREA} rows={3} value={faq.answer} onChange={e => update(faq.id, 'answer', e.target.value)} placeholder="Your answer..." />
              </div>
            </div>
          </div>
        ))}
        <button onClick={add} className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#6C63FF] hover:text-[#6C63FF] transition-colors">
          <Plus size={16} />Add Question
        </button>
      </div>
    </div>
  );
}
