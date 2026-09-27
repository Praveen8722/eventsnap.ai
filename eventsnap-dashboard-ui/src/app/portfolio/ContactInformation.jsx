"use client";

import { useState } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';
import { INPUT } from './styles';

export function ContactInformation() {
  const { data, setData, save, saving } = usePortfolioDataStore();
  const [form, setForm] = useState(() => ({
    phone: data.phone,
    email: data.email,
    location: data.location,
    serviceArea: data.serviceArea,
    instagram: data.social?.instagram || '',
    facebook: data.social?.facebook || '',
    youtube: data.social?.youtube || '',
    whatsapp: data.social?.whatsapp || '',
  }));
  const [status, setStatus] = useState('idle'); // idle | saved | error

  const handleSave = async () => {
    const merged = {
      ...data,
      phone: form.phone,
      email: form.email,
      location: form.location,
      serviceArea: form.serviceArea,
      social: {
        ...data.social,
        instagram: form.instagram,
        facebook: form.facebook,
        youtube: form.youtube,
        whatsapp: form.whatsapp,
      },
    };
    setData(merged);
    const res = await save(merged);
    setStatus(res.ok ? 'saved' : 'error');
    if (res.ok) setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1E1E1E]">Contact Information</h2>
        <p className="text-gray-500 text-sm mt-0.5">Update the contact details shown on your portfolio</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h3 className="font-semibold text-[#1E1E1E]">Contact Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000' },
            { key: 'email', label: 'Email Address', placeholder: 'hello@yourname.com' },
            { key: 'location', label: 'Location', placeholder: 'City, State' },
            { key: 'serviceArea', label: 'Service Area', placeholder: 'Areas you serve' },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{f.label}</label>
              <input className={INPUT} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h3 className="font-semibold text-[#1E1E1E]">Social Media</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
            { key: 'facebook', label: 'Facebook', placeholder: 'yourpage' },
            { key: 'youtube', label: 'YouTube', placeholder: 'YourChannel' },
            { key: 'whatsapp', label: 'WhatsApp', placeholder: '+1 (555) 000-0000' },
          ].map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{f.label}</label>
              <input className={INPUT} value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} placeholder={f.placeholder} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${
            status === 'saved'
              ? 'bg-green-500 text-white'
              : status === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-[#6C63FF] text-white hover:bg-[#5B52EE]'
          }`}
        >
          {status === 'saved' ? (
            <><Check size={14} />Saved</>
          ) : status === 'error' ? (
            <><AlertCircle size={14} />Retry</>
          ) : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
