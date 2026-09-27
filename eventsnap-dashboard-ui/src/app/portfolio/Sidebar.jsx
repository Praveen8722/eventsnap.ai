"use client";

import {
  LayoutDashboard, Edit3, Eye, Image, Briefcase, DollarSign,
  Star, HelpCircle, Phone, Link2, QrCode, Settings,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { usePortfolioData } from './portfolioStore';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'edit', label: 'Edit Portfolio', icon: Edit3 },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'pricing', label: 'Pricing', icon: DollarSign },
  { id: 'testimonials', label: 'Testimonials', icon: Star },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contact', label: 'Contact Information', icon: Phone },
  { id: 'link', label: 'Portfolio Link', icon: Link2 },
  { id: 'qrcode', label: 'QR Code', icon: QrCode },
  { id: 'settings', label: 'Portfolio Settings', icon: Settings },
];

export function Sidebar({ active, setActive, sidebarOpen, setSidebarOpen }) {
  const { slug } = usePortfolioData();
  return (
    <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} flex-shrink-0 bg-white border-r border-gray-100 flex flex-col transition-all duration-200`}>
      <div className="sticky top-[72px] h-[calc(100vh-72px)] flex flex-col">
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
          {sidebarOpen && (
            <div>
              <div className="text-xs font-bold text-[#6C63FF] uppercase tracking-widest">Portfolio</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(o => !o)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ml-auto">
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all text-left ${
                  isActive
                    ? 'bg-[#EEF0FF] text-[#6C63FF]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {sidebarOpen && <span className={`text-sm font-medium truncate ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>}
                {isActive && sidebarOpen && <div className="ml-auto w-1 h-4 bg-[#6C63FF] rounded-full flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="p-3 border-t border-gray-100">
            <div className="bg-gradient-to-br from-[#6C63FF] to-[#FF675D] rounded-xl p-3 text-white">
              <p className="text-xs font-semibold mb-1">Portfolio Live</p>
              <p className="text-[10px] opacity-80 mb-2">Your portfolio is public and accepting inquiries.</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                <span className="text-[10px] opacity-90">eventsnap.ai/p/{slug || 'your-portfolio'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
