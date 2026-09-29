"use client";

import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { usePortfolioData } from './portfolioStore';
import { PortfolioQrCode } from './PortfolioQrCode';
import { publicPortfolioUrl, displayUrl, downloadQr, shareQrLink } from '@/lib/portfolioQr';

export function QRCodePage() {
  const p = usePortfolioData();
  const [format, setFormat] = useState('png');
  const [size, setSize] = useState('medium');

  const sizeMap = { small: 140, medium: 200, large: 260 };
  const qrSize = sizeMap[size];
  // This photographer's own live public portfolio URL — what the QR encodes.
  const url = publicPortfolioUrl(p.slug);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1E1E1E]">QR Code</h2>
        <p className="text-gray-500 text-sm mt-0.5">Share and download your portfolio QR code</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm flex flex-col items-center gap-5 cursor-pointer dashboard-card">
          <div className="p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm cursor-pointer dashboard-card">
            <PortfolioQrCode url={url} size={qrSize} />
          </div>
          <div className="text-center">
            <div className="font-semibold text-[#1E1E1E] text-sm mb-1">{p.name}</div>
            <div className="text-xs text-gray-400 font-mono break-all">{displayUrl(url)}</div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4 cursor-pointer dashboard-card">
            <h3 className="font-semibold text-[#1E1E1E]">Download Options</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Format</label>
              <div className="flex gap-2">
                {['png', 'svg', 'pdf'].map(f => (
                  <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all uppercase ${format === f ? 'bg-[#6C63FF] border-[#6C63FF] text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Size</label>
              <div className="flex gap-2">
                {['small', 'medium', 'large'].map(s => (
                  <button key={s} onClick={() => setSize(s)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all capitalize ${size === s ? 'bg-[#6C63FF] border-[#6C63FF] text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => downloadQr(url, { slug: p.slug, format, px: qrSize }).catch(() => alert("Download failed"))} className="flex items-center justify-center gap-2 py-2.5 bg-[#6C63FF] text-white rounded-lg text-sm font-medium hover:bg-[#5B52EE] transition-colors">
                <Download size={14} />
                Download QR
              </button>
              <button onClick={() => shareQrLink(url, p.name)} className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>

          <div className="bg-[#EEF0FF] rounded-xl p-4 border border-[#6C63FF]/20 cursor-pointer dashboard-card">
            <div className="text-sm font-semibold text-[#6C63FF] mb-1">Permanent QR Code</div>
            <p className="text-xs text-[#6C63FF]/70 leading-relaxed">Your QR code is permanent and always points to the same portfolio URL. Even if you update your name, photos, or services, the QR code continues to work perfectly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
          