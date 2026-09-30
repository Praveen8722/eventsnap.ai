"use client";

import { useState } from 'react';
import {
  Globe, QrCode, BarChart2, Eye,
  Copy, Download, Share2, CheckCircle, Circle,
  ChevronRight, Zap
} from 'lucide-react';
import { usePortfolioData } from './portfolioStore';
import { photoSrc } from './portfolioPhoto';
import { PortfolioQrCode } from './PortfolioQrCode';
import { publicPortfolioUrl, displayUrl, downloadQr, shareQrLink } from '@/lib/portfolioQr';

export function PortfolioOverview({ onNavigate }) {
  const [copied, setCopied] = useState(false);
  // The photographer's live, saved portfolio (same source Edit / Preview use).
  const portfolio = usePortfolioData();
  // The Public Portfolio card / copy button show the current live link.
  const liveUrl = publicPortfolioUrl(portfolio.slug);
  const publicUrl = displayUrl(liveUrl);
  // The QR encodes the pinned, permanent URL — unchanged by content/slug edits
  // (falls back to the live URL until the pin is generated). See portfolioStore.
  const qrUrl = portfolio.qrUrl || liveUrl;
  // Saved photo URLs (uploads) are used as-is; only seeded Unsplash ids get the host prefix.
  const coverSrc = photoSrc(portfolio.coverImage, 'w=600&h=220&fit=crop&auto=format');

  // Completion is derived from what the portfolio actually contains.
  const completionItems = [
    {
      key: 'profile',
      label: 'Profile Information',
      done: !!(portfolio.name && (portfolio.tagline || portfolio.bio)),
    },
    { key: 'about', label: 'About', done: !!portfolio.about },
    { key: 'services', label: 'Services', done: (portfolio.services?.length || 0) > 0 },
    { key: 'gallery', label: 'Gallery', done: (portfolio.gallery?.length || 0) > 0 },
    { key: 'pricing', label: 'Pricing', done: (portfolio.pricing?.length || 0) > 0 },
    { key: 'testimonials', label: 'Testimonials', done: (portfolio.testimonials?.length || 0) > 0 },
    { key: 'faq', label: 'FAQ', done: (portfolio.faqs?.length || 0) > 0 },
    {
      key: 'contact',
      label: 'Contact Information',
      done: !!(portfolio.phone && portfolio.email),
    },
  ];
  const doneCount = completionItems.filter(i => i.done).length;
  const pct = Math.round((doneCount / completionItems.length) * 100);

  const handleCopy = () => {
    navigator.clipboard?.writeText(liveUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Portfolio Overview</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage and track your public photography portfolio</p>
        </div>
        <button
          onClick={() => onNavigate('preview')}
          className="flex items-center gap-2 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5B52EE] transition-colors"
        >
          <Eye size={16} />
          Preview Portfolio
        </button>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Portfolio Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm cursor-pointer dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-[#6C63FF]" />
              </div>
              <span className="font-semibold text-[#1E1E1E]">Portfolio Status</span>
            </div>
            <span className="text-[#6C63FF] font-bold text-lg">{pct}%</span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#8B82FF] transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="space-y-2">
            {completionItems.map(item => (
              <li key={item.key} className="flex items-center gap-2.5 text-sm">
                {item.done
                  ? <CheckCircle size={16} className="text-[#10B981] flex-shrink-0" />
                  : <Circle size={16} className="text-gray-300 flex-shrink-0" />}
                <span className={item.done ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
              </li>
            ))}
          </ul>

          {pct < 100 && (
            <button
              onClick={() => onNavigate('edit')}
              className="mt-4 w-full flex items-center justify-center gap-2 border border-[#6C63FF] text-[#6C63FF] rounded-lg py-2 text-sm hover:bg-[#EEF0FF] transition-colors"
            >
              Complete Portfolio
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Public Portfolio */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm cursor-pointer dashboard-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#EEF0FF] rounded-lg flex items-center justify-center">
              <Globe size={16} className="text-[#6C63FF]" />
            </div>
            <span className="font-semibold text-[#1E1E1E]">Public Portfolio</span>
          </div>

          <div
            className="rounded-xl overflow-hidden mb-4 relative"
            style={{ height: 110, background: coverSrc ? `url("${coverSrc}") center/cover` : undefined }}
          >
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
              <img
                src={photoSrc(portfolio.profilePhoto, 'w=48&h=48&fit=crop&auto=format')}
                className="w-10 h-10 rounded-full border-2 border-white object-cover"
                alt={portfolio.name}
              />
              <span className="text-white text-xs font-medium">{portfolio.name}</span>
            </div>
            <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">● Live</div>
          </div>

          <p className="text-xs text-gray-500 mb-2">Your professional photography website is live and ready to share.</p>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
            <Globe size={13} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-700 flex-1 truncate font-mono">{publicUrl}</span>
            <button onClick={handleCopy} className="flex-shrink-0">
              {copied
                ? <CheckCircle size={14} className="text-green-500" />
                : <Copy size={14} className="text-gray-400 hover:text-gray-600" />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onNavigate('preview')}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-xs text-gray-600"
            >
              <Eye size={14} />
              View
            </button>
            <button
              onClick={() => onNavigate('edit')}
              className="flex flex-col items-center gap-1 py-2 rounded-lg bg-[#6C63FF] hover:bg-[#5B52EE] transition-colors text-xs text-white"
            >
              <Globe size={14} />
              Edit
            </button>
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-xs text-gray-600"
            >
              <Copy size={14} />
              Copy
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm cursor-pointer dashboard-card">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#FFF0EF] rounded-lg flex items-center justify-center">
              <QrCode size={16} className="text-[#FF675D]" />
            </div>
            <span className="font-semibold text-[#1E1E1E]">Portfolio QR Code</span>
          </div>

          <p className="text-xs text-gray-500 mb-4">Clients can scan this QR code to instantly view your photography portfolio.</p>

          {/* Real QR code for this photographer's own public portfolio */}
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white border-2 border-gray-200 rounded-xl inline-block cursor-pointer dashboard-card">
              <PortfolioQrCode url={qrUrl} size={120} />
            </div>
          </div>

          <p className="text-[10px] text-center text-gray-400 mb-4 font-mono break-all">{displayUrl(qrUrl)}</p>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => downloadQr(qrUrl, { slug: portfolio.slug, format: "png", px: 200 }).catch(() => alert("Download failed"))} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-xs text-gray-600">
              <Download size={13} />
              Download QR
            </button>
            <button onClick={() => shareQrLink(qrUrl, portfolio.name)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#FF675D] hover:bg-[#EE564C] transition-colors text-xs text-white">
              <Share2 size={13} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 @max-[700px]:grid-cols-2 @max-[420px]:grid-cols-1 gap-3">
        {[
          { label: 'Edit Portfolio', sub: 'edit', icon: Globe, color: '#6C63FF' },
          { label: 'Manage Gallery', sub: 'gallery', icon: Eye, color: '#FF675D' },
          { label: 'Update Pricing', sub: 'pricing', icon: BarChart2, color: '#10B981' },
          { label: 'View QR Code', sub: 'qrcode', icon: QrCode, color: '#F59E0B' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.sub}
              onClick={() => onNavigate(item.sub)}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}15` }}>
                <Icon size={18} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[#1E1E1E] block">{item.label}</span>
              </div>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
