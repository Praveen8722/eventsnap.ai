"use client";

import { useEffect, useRef, useState } from "react";
import { HiOutlineClipboardCopy, HiOutlineDownload, HiOutlineExternalLink, HiOutlineShare, HiCheck } from "react-icons/hi";
import { PortfolioQrCode } from "@/app/portfolio/PortfolioQrCode";
import { displayUrl, downloadQr } from "@/lib/portfolioQr";
import { ModalShell, primaryBtn, secondaryBtn } from "./ModalShell";
import { formatEventDate, publicGalleryUrl } from "./mockData";

// Copies `text`, flipping `copied` on for a moment. Shared by the QR modal
// and the gallery's link preview.
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy the gallery link:", text);
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

export function ShareQrModal({ event, onClose }) {
  const url = publicGalleryUrl(event.slug);
  const { copied, copy } = useCopy();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadQr(url, { slug: event.slug, format: "png", px: 256 });
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // Native share sheet where available (mostly mobile), else copy the link.
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.name, text: `View and download photos from ${event.name}`, url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    copy(url);
  };

  return (
    <ModalShell title="Share QR Code" subtitle="Guests scan to view and download photos" size="sm" onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="rounded-2xl bg-gradient-to-br from-[#6C63FF]/10 via-white to-[#FF5555]/10 p-4 sm:p-5 w-full">
          <div className="mx-auto w-fit rounded-xl bg-white p-3 shadow-sm border border-gray-100">
            <div className="w-[200px] h-[200px] sm:w-[232px] sm:h-[232px] [&>svg]:w-full [&>svg]:h-full">
              <PortfolioQrCode url={url} size={232} />
            </div>
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#1E1E1E]">{event.name}</h3>
          <p className="text-sm text-gray-500">{formatEventDate(event.date)}</p>
        </div>

        <div className="w-full mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 text-left mb-1.5">
            Public gallery link
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 pl-3 pr-1.5 py-1.5">
            <span className="flex-1 min-w-0 truncate text-sm text-gray-700 text-left font-mono">{displayUrl(url)}</span>
            <button
              type="button"
              onClick={() => copy(url)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                copied ? "bg-green-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {copied ? <HiCheck /> : <HiOutlineClipboardCopy />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open public link"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <HiOutlineExternalLink />
              Open
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full mt-4">
          <button type="button" onClick={download} disabled={downloading} className={secondaryBtn}>
            <HiOutlineDownload className="text-lg" />
            {downloading ? "Preparing…" : "Download QR"}
          </button>
          <button type="button" onClick={share} className={primaryBtn}>
            <HiOutlineShare className="text-lg" />
            Share QR
          </button>
        </div>

        <p className="text-[11px] text-gray-400 mt-4">
          Guests can open this link or scan the QR — no login needed.
        </p>
      </div>
    </ModalShell>
  );
}
