"use client";

import { ToggleLeft, ToggleRight, Bell, Lock, Palette, Globe, Settings } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';

const ToggleRow = ({ label, desc, settingKey, settings, toggle }) => {
  const val = settings[settingKey];

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-[#1E1E1E]">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
      </div>
      <button onClick={() => toggle(settingKey)} className="flex-shrink-0 ml-4">
        {val
          ? <ToggleRight size={28} className="text-[#6C63FF]" />
          : <ToggleLeft size={28} className="text-gray-300" />}
      </button>
    </div>
  );
};

export function PortfolioSettings() {
  const { data, scheduleSave, save } = usePortfolioDataStore();
  const settings = data.settings;

  const toggle = (key) => {
    scheduleSave({ ...data, settings: { ...settings, [key]: !settings[key] } });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1E1E1E]">Portfolio Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Configure your portfolio visibility and behavior</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center"><Globe size={16} className="text-[#6C63FF]" /></div>
          <h3 className="font-semibold text-[#1E1E1E]">Visibility</h3>
        </div>
        <ToggleRow settings={settings} toggle={toggle} settingKey="published" label="Portfolio Published" desc="Your portfolio is visible to the public at your portfolio URL" />
        <ToggleRow settings={settings} toggle={toggle} settingKey="allowInquiries" label="Allow Client Inquiries" desc="Show the contact form so clients can send you inquiries" />
        <ToggleRow settings={settings} toggle={toggle} settingKey="passwordProtected" label="Password Protection" desc="Require a password to view your portfolio" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center"><Settings size={16} className="text-[#6C63FF]" /></div>
          <h3 className="font-semibold text-[#1E1E1E]">Sections</h3>
        </div>
        <ToggleRow settings={settings} toggle={toggle} settingKey="showPricing" label="Show Pricing" desc="Display your pricing packages on the portfolio" />
        <ToggleRow settings={settings} toggle={toggle} settingKey="showTestimonials" label="Show Testimonials" desc="Display client reviews and testimonials" />
        <ToggleRow settings={settings} toggle={toggle} settingKey="showFAQ" label="Show FAQ" desc="Display the frequently asked questions section" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center"><Palette size={16} className="text-[#6C63FF]" /></div>
          <h3 className="font-semibold text-[#1E1E1E]">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Portfolio Theme</label>
            <div className="flex flex-wrap gap-3">
              {[{ value: 'dark', label: 'Dark', preview: 'bg-[#0D0B1E]' }, { value: 'light', label: 'Light', preview: 'bg-gray-50' }, { value: 'minimal', label: 'Minimal', preview: 'bg-white' }].map(t => (
                <button key={t.value} onClick={() => scheduleSave({ ...data, theme: t.value })} className={`flex-1 flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${data.theme === t.value ? 'border-[#6C63FF]' : 'border-gray-200'}`}>
                  <div className={`h-12 rounded-lg ${t.preview} border border-gray-200`} />
                  <span className="text-xs font-medium text-gray-700 text-center">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Accent Color</label>
            <div className="flex flex-wrap items-center gap-3">
              {['#6C63FF', '#FF675D', '#10B981', '#F59E0B', '#3B82F6', '#EC4899'].map(c => (
                <button key={c} onClick={() => scheduleSave({ ...data, accent: c })} className={`w-8 h-8 rounded-full transition-all ${data.accent === c ? 'ring-2 ring-offset-2' : ''}`} style={{ background: c, ringColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center"><Bell size={16} className="text-[#6C63FF]" /></div>
          <h3 className="font-semibold text-[#1E1E1E]">Advanced</h3>
        </div>
        <ToggleRow settings={settings} toggle={toggle} settingKey="analytics" label="Portfolio Analytics" desc="Track views, QR scans, and client inquiries" />
        <ToggleRow settings={settings} toggle={toggle} settingKey="seoOptimized" label="SEO Optimization" desc="Optimize your portfolio for search engines" />
      </div>

      <div className="flex justify-between items-center pt-2 pb-8">
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <Lock size={14} />
          <button className="hover:underline">Delete Portfolio</button>
        </div>
        <button onClick={() => save()} className="bg-[#6C63FF] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5B52EE] transition-colors">
          Save Settings
        </button>
      </div>
    </div>
  );
}
