"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCamera,
  HiOutlineCloudUpload,
  HiOutlineDotsVertical,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineLink,
  HiOutlineLocationMarker,
  HiOutlinePhotograph,
  HiOutlineQrcode,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";
import { PortfolioQrCode } from "@/app/portfolio/PortfolioQrCode";
import { downloadQr } from "@/lib/portfolioQr";
import { STATUS_STYLES, formatEventDate, photoCount, publicGalleryUrl } from "./mockData";
import { primaryBtn, secondaryBtn } from "./ModalShell";
import { useCoverPicker } from "./CoverPhoto";

// Small "More options" dropdown; closes on outside click or Escape.
function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        aria-expanded={open}
        className={`${secondaryBtn} !px-2.5 h-full`}
      >
        <HiOutlineDotsVertical className="text-lg" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-20 w-48 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
          {items.map(({ label, icon: Icon, onClick, danger }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${
                danger ? "text-red-500 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="text-base shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventCard({ event, onOpen, onUpload, onShare, onCopyLink, onDelete, onSetCover, coverBusy }) {
  const cover = event.cover;
  const coverPicker = useCoverPicker(onSetCover);
  const count = photoCount(event);
  const url = publicGalleryUrl(event.slug);

  return (
    <article className="dashboard-card flex flex-col bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
      {coverPicker.input}
      <div className="group relative">
        <button
          type="button"
          onClick={onOpen}
          className="relative block w-full aspect-[16/10] bg-gray-100 overflow-hidden text-left"
          aria-label={`Open ${event.name} gallery`}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#6C63FF]/15 via-white to-[#FF5555]/10 text-[#6C63FF]">
              <HiOutlineCamera className="text-4xl" />
              <span className="text-xs font-semibold text-gray-500">No cover photo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
              STATUS_STYLES[event.status] || STATUS_STYLES.Draft
            }`}
          >
            {event.status === "Live" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 align-middle" />}
            {event.status}
          </span>
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
            <HiOutlinePhotograph className="text-sm" />
            {count.toLocaleString("en-IN")} photo{count === 1 ? "" : "s"}
          </span>
          {event.views > 0 && (
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
              <HiOutlineEye className="text-sm" />
              {event.views.toLocaleString("en-IN")}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={coverPicker.open}
          title={cover ? "Change cover photo" : "Add cover photo"}
          className={`absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:bg-white transition-opacity ${
            cover ? "sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100" : ""
          }`}
        >
          <HiOutlineCamera className="text-sm" />
          {cover ? "Change cover" : "Add cover"}
        </button>
        {coverBusy && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center" aria-label="Saving cover photo">
            <span className="w-7 h-7 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#1E1E1E] text-base leading-snug truncate" title={event.name}>
              {event.name}
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <HiOutlineCalendar className="shrink-0" />
              {formatEventDate(event.date)}
            </p>
            {event.location && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5 min-w-0">
                <HiOutlineLocationMarker className="shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onShare}
            title="Show QR code"
            className="shrink-0 rounded-lg border border-gray-200 bg-white p-1 hover:border-[#6C63FF]/50 hover:shadow-sm transition"
          >
            <PortfolioQrCode url={url} size={56} />
          </button>
        </div>

        <div className="mt-auto pt-4">
          <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
            <button type="button" onClick={onOpen} className={`${primaryBtn} !px-2`}>
              <HiOutlinePhotograph className="text-lg shrink-0" />
              <span className="truncate">Open Gallery</span>
            </button>
            <button type="button" onClick={onUpload} className={`${secondaryBtn} !px-2`}>
              <HiOutlineCloudUpload className="text-lg shrink-0" />
              <span className="truncate">Upload Photos</span>
            </button>
            <div className="col-span-2 flex gap-2">
              <button type="button" onClick={onShare} className={`${secondaryBtn} flex-1 !px-2`}>
                <HiOutlineQrcode className="text-lg shrink-0" />
                <span className="truncate">Share QR</span>
              </button>
              <MoreMenu
                items={[
                  {
                    label: cover ? "Change cover photo" : "Add cover photo",
                    icon: HiOutlineCamera,
                    onClick: coverPicker.open,
                  },
                  ...(cover
                    ? [{ label: "Remove cover photo", icon: HiOutlineX, onClick: () => onSetCover(null) }]
                    : []),
                  { label: "Copy gallery link", icon: HiOutlineLink, onClick: onCopyLink },
                  {
                    label: "Download QR",
                    icon: HiOutlineDownload,
                    onClick: () => downloadQr(url, { slug: event.slug, px: 256 }).catch(() => alert("Download failed")),
                  },
                  { label: "Delete event", icon: HiOutlineTrash, onClick: onDelete, danger: true },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
