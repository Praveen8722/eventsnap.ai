"use client";

import { useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { usePortfolioData } from './portfolioStore';

export function QRCodePage() {
  const p = usePortfolioData();
  const [format, setFormat] = useState('png');
  const [size, setSize] = useState('medium');

  const sizeMap = { small: 140, medium: 200, large: 260 };
  const qrSize = sizeMap[size];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#1E1E1E]">QR Code</h2>
        <p className="text-gray-500 text-sm mt-0.5">Share and download your portfolio QR code</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm flex flex-col items-center gap-5">
          <div className="p-5 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
            <svg width={qrSize} height={qrSize} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="32" height="32" rx="3" fill="#1E1E1E"/>
              <rect x="10" y="10" width="20" height="20" rx="1" fill="white"/>
              <rect x="14" y="14" width="12" height="12" rx="1" fill="#1E1E1E"/>
              <rect x="84" y="4" width="32" height="32" rx="3" fill="#1E1E1E"/>
              <rect x="90" y="10" width="20" height="20" rx="1" fill="white"/>
              <rect x="94" y="14" width="12" height="12" rx="1" fill="#1E1E1E"/>
              <rect x="4" y="84" width="32" height="32" rx="3" fill="#1E1E1E"/>
              <rect x="10" y="90" width="20" height="20" rx="1" fill="white"/>
              <rect x="14" y="94" width="12" height="12" rx="1" fill="#1E1E1E"/>
              {/* Data pattern */}
              {Array.from({ length: 48 }, (_, i) => {
                const col = Math.floor(i / 8);
                const row = i % 8;
                const x = 44 + col * 6;
                const y = 4 + row * 6;
                const skip = (x < 44 || x > 116) || (y > 40 && y < 84 && x < 44);
                if (skip || (i * 7 + 13) % 3 === 0) return null;
                return <rect key={i} x={x} y={y} width="5" height="5" rx="0.5" fill="#1E1E1E" />;
              })}
              {Array.from({ length: 32 }, (_, i) => {
                const col = i % 7;
                const row = Math.floor(i / 7);
                const x = 4 + col * 6;
                const y = 44 + row * 6;
                if ((i * 3 + 7) % 2 === 0) return null;
                return <rect key={`b${i}`} x={x} y={y} width="5" height="5" rx="0.5" fill="#1E1E1E" />;
              })}
              <rect x="50" y="50" width="20" height="20" rx="4" fill="#6C63FF"/>
              <text x="60" y="64" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">ES</text>
            </svg>
          </div>
          <div className="text-center">
            <div className="font-semibold text-[#1E1E1E] text-sm mb-1">{p.name}</div>
            <div className="text-xs text-gray-400 font-mono">eventsnap.ai/p/{p.slug}</div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
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
              <button className="flex items-center justify-center gap-2 py-2.5 bg-[#6C63FF] text-white rounded-lg text-sm font-medium hover:bg-[#5B52EE] transition-colors">
                <Download size={14} />
                Download QR
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Share2 size={14} />
                Share
              </button>
            </div>
          </div>

          <div className="bg-[#EEF0FF] rounded-xl p-4 border border-[#6C63FF]/20">
            <div className="text-sm font-semibold text-[#6C63FF] mb-1">Permanent QR Code</div>
            <p className="text-xs text-[#6C63FF]/70 leading-relaxed">Your QR code is permanent and always points to the same portfolio URL. Even if you update your name, photos, or services, the QR code continues to work perfectly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
          