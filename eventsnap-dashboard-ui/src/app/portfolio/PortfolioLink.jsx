"use client";

import { useState } from 'react';
import { Copy, Check, ExternalLink, Globe } from 'lucide-react';
import { usePortfolioData } from './portfolioStore';
import { publicPortfolioUrl, displayUrl } from '@/lib/portfolioQr';

export function PortfolioLink() {
  const p = usePortfolioData();
  const [copied, setCopied] = useState(null);
  // This photographer's live public portfolio — the same URL the QR encodes.
  const publicUrl = publicPortfolioUrl(p.slug);

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const LINKS = [
    { key: 'full', label: 'Full Portfolio URL', value: publicUrl, desc: 'Your complete portfolio URL' },
    // Same live URL without "https://" (there is no separate short-link
    // domain); Copy still copies the full, openable URL.
    { key: 'short', label: 'Short URL', value: displayUrl(publicUrl), copy: publicUrl, desc: 'Shortened version for print and social' },
  ];

  const SHARE = [
    { label: 'Instagram', bg: '#E1306C', emoji: '📸', text: `Check out my photography portfolio! ${publicUrl}` },
    { label: 'Facebook', bg: '#1877F2', emoji: '👥', text: `View my photography portfolio at ${publicUrl}` },
    { label: 'WhatsApp', bg: '#25D366', emoji: '💬', text: `Hi! Here's my photography portfolio: ${publicUrl}` },
    { label: 'Email', bg: '#6C63FF', emoji: '✉️', text: `mailto:?subject=My Photography Portfolio&body=${publicUrl}` },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1E1E1E]">Portfolio Link</h2>
        <p className="text-gray-500 text-sm mt-0.5">Share your portfolio URL with potential clients</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4 cursor-pointer dashboard-card">
        {LINKS.map(link => (
          <div key={link.key}>
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1.5">{link.label}</label>
            <p className="text-xs text-gray-400 mb-2">{link.desc}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <Globe size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-mono flex-1 truncate">{link.value}</span>
              </div>
              <button onClick={() => handleCopy(link.copy ?? link.value, link.key)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${copied === link.key ? 'bg-green-50 border-green-200 text-green-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {copied === link.key ? <Check size={14} /> : <Copy size={14} />}
                {copied === link.key ? 'Copied!' : 'Copy'}
              </button>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm cursor-pointer dashboard-card">
        <h3 className="font-semibold text-[#1E1E1E] mb-4">Share on Social Media</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SHARE.map(s => (
            <button key={s.label} onClick={() => handleCopy(s.text, s.label)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: `${s.bg}15` }}>
                {s.emoji}
              </div>
              <span className="text-sm font-medium text-gray-700">{s.label}</span>
              {copied === s.label && <span className="text-xs text-green-500">Copied!</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Custom domain banner */}
      <div className="bg-gradient-to-r from-[#6C63FF]/10 to-[#FF675D]/10 rounded-xl border border-[#6C63FF]/20 p-5 flex flex-wrap items-center gap-4 cursor-pointer dashboard-card">
        <div className="w-10 h-10 bg-[#6C63FF] rounded-xl flex items-center justify-center flex-shrink-0">
          <Globe size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-[#1E1E1E] text-sm">Custom Domain</div>
          <div className="text-xs text-gray-500 mt-0.5">Connect your own domain like <span className="font-mono text-[#6C63FF]">yourname.com</span> to your portfolio.</div>
        </div>
        <button className="flex-shrink-0 bg-[#6C63FF] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#5B52EE] transition-colors">Upgrade</button>
      </div>
    </div>
  );
}
