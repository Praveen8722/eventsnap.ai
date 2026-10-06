"use client";

import { useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiCheck,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineArrowsExpand,
  HiOutlineCalendar,
  HiOutlineCamera,
  HiOutlineClipboardCopy,
  HiOutlineCloudDownload,
  HiOutlineCloudUpload,
  HiOutlineEye,
  HiOutlineGlobeAlt,
  HiOutlineLocationMarker,
  HiOutlinePhotograph,
  HiOutlineQrcode,
  HiOutlineStar,
  HiOutlineSwitchHorizontal,
  HiOutlineTrash,
  HiStar,
  HiX,
} from "react-icons/hi";
import { PortfolioQrCode } from "@/app/portfolio/PortfolioQrCode";
import { displayUrl } from "@/lib/portfolioQr";
import { STATUS_STYLES, formatEventDate, photoCount, publicGalleryUrl } from "./mockData";
import { primaryBtn, secondaryBtn } from "./ModalShell";
import { useCopy } from "./ShareQrModal";
import { useCoverPicker } from "./CoverPhoto";
import { GuestAccessPanel } from "./GuestAccessPanel";
import { CameraAutoUploadPanel } from "./CameraAutoUploadPanel";

function Lightbox({ photos, index, onIndex, onClose }) {
  const photo = photos[index];
  const prev = () => onIndex((index - 1 + photos.length) % photos.length);
  const next = () => onIndex((index + 1) % photos.length);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, photos.length, onIndex, onClose]);

  if (!photo) return null;
  const navBtn =
    "absolute top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur transition-colors";

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 text-white/80 text-sm">
        <span>
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <HiX className="text-xl" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-10rem)] max-h-[calc(100vh-8rem)] object-contain rounded-lg shadow-2xl"
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className={`${navBtn} left-2 sm:left-6`}
          >
            <HiChevronLeft className="text-2xl" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className={`${navBtn} right-2 sm:right-6`}
          >
            <HiChevronRight className="text-2xl" />
          </button>
        </>
      )}
    </div>
  );
}

export function EventGallery({ event, onBack, onUpload, onShare, onRemovePhoto, onSetCover, onSetCoverPhoto, onUpdateSettings, coverBusy, camera, phone, faceProgress }) {
  const url = publicGalleryUrl(event.slug);
  const coverPicker = useCoverPicker(onSetCover);
  const isCover = (photo) => event.cover && (event.cover === photo.src || event.cover === photo.thumb);
  const count = photoCount(event);
  const { copied, copy } = useCopy();
  const [lightbox, setLightbox] = useState(null);

  const stats = [
    { label: "Photos", value: count, icon: HiOutlinePhotograph },
    { label: "Guest views", value: event.views || 0, icon: HiOutlineEye },
    { label: "Downloads", value: event.downloads || 0, icon: HiOutlineCloudDownload },
  ];

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#6C63FF] transition-colors"
      >
        <HiArrowLeft />
        All events
      </button>

      {/* Cover photo */}
      {coverPicker.input}
      {event.cover ? (
        <div className="relative mt-3 h-36 sm:h-48 lg:h-60 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.cover} alt={`${event.name} cover`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={coverPicker.open}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow hover:bg-white transition-colors"
            >
              <HiOutlineSwitchHorizontal className="text-sm" />
              Change cover
            </button>
            <button
              type="button"
              onClick={() => onSetCover(null)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-500 shadow hover:bg-white transition-colors"
            >
              <HiOutlineTrash className="text-sm" />
              Remove
            </button>
          </div>
          {coverBusy && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center" aria-label="Saving cover photo">
              <span className="w-7 h-7 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={coverPicker.open}
          disabled={coverBusy}
          className="mt-3 w-full h-28 sm:h-36 flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/[0.03] px-4 transition-colors"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
            <HiOutlineCamera className="text-lg text-[#6C63FF]" />
            {coverBusy ? "Saving cover…" : "Add a cover photo"}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Upload one, or use <HiOutlineStar className="inline -mt-0.5" /> on any photo below
          </span>
        </button>
      )}

      {/* Header */}
      <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1E1E1E] break-words">{event.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                STATUS_STYLES[event.status] || STATUS_STYLES.Draft
              }`}
            >
              {event.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <HiOutlineCalendar />
              {formatEventDate(event.date)}
            </span>
            {event.location && (
              <span className="inline-flex items-center gap-1.5">
                <HiOutlineLocationMarker />
                {event.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <HiOutlinePhotograph />
              {count.toLocaleString("en-IN")} photo{count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
          <button type="button" onClick={onShare} className={secondaryBtn}>
            <HiOutlineQrcode className="text-lg" />
            Share QR
          </button>
          <button type="button" onClick={onUpload} className={primaryBtn}>
            <HiOutlineCloudUpload className="text-lg" />
            Upload Photos
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* QR + link panel: above the photos on small screens, beside them on large */}
        <aside className="lg:order-2 space-y-4">
          {camera && <CameraAutoUploadPanel event={event} camera={camera} phone={phone} />}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
            <h2 className="font-bold text-[#1E1E1E]">Event QR Code</h2>
            <p className="text-sm text-gray-500 mt-0.5">Print it or display it at the venue.</p>
            <div className="flex lg:flex-col items-center gap-4 mt-4">
              <button
                type="button"
                onClick={onShare}
                title="Open QR"
                className="shrink-0 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm hover:shadow-md transition-shadow [&>svg]:w-full [&>svg]:h-full w-28 h-28 sm:w-32 sm:h-32 lg:w-44 lg:h-44"
              >
                <PortfolioQrCode url={url} size={176} />
              </button>
              <div className="flex-1 min-w-0 w-full">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <HiOutlineGlobeAlt className="text-sm" />
                  Public gallery link
                </p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 font-mono truncate">
                  {displayUrl(url)}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => copy(url)}
                    className={`${secondaryBtn} !px-2 !py-2 ${copied ? "!bg-green-50 !border-green-200 !text-green-700" : ""}`}
                  >
                    {copied ? <HiCheck /> : <HiOutlineClipboardCopy />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button type="button" onClick={onShare} className={`${secondaryBtn} !px-2 !py-2`}>
                    <HiOutlineQrcode />
                    Share QR
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border-2 border-gray-200 p-3 text-center">
                <Icon className="mx-auto text-xl text-[#6C63FF]" />
                <p className="text-lg font-bold text-[#1E1E1E] mt-1">{value.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {event.settings && (
            <GuestAccessPanel
              key={`${event.id}:${JSON.stringify(event.settings)}`}
              settings={event.settings}
              onSave={onUpdateSettings}
              faceStatus={{
                indexed: Math.min(event.faceIndexedCount || 0, event.photoCount),
                total: event.photoCount,
                working: faceProgress?.eventId === event.id,
              }}
            />
          )}
        </aside>

        {/* Photo grid */}
        <section className="lg:order-1 lg:col-span-2 bg-white rounded-2xl border-2 border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#1E1E1E]">Gallery</h2>
            {event.photos?.length > 0 && (
              <p className="text-xs text-gray-400">
                Showing {event.photos.length} of {count.toLocaleString("en-IN")}
              </p>
            )}
          </div>

          {!event.photos ? (
            <div className="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading photos">
              <span className="w-7 h-7 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
            </div>
          ) : event.photos.length === 0 ? (
            <button
              type="button"
              onClick={onUpload}
              className="w-full flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/[0.03] px-6 py-16 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 text-[#6C63FF] flex items-center justify-center mb-3">
                <HiOutlineCloudUpload className="text-3xl" />
              </div>
              <p className="font-semibold text-gray-800">No photos yet</p>
              <p className="text-sm text-gray-500 mt-1">Upload photos to publish this gallery for your guests.</p>
              <span className={`${primaryBtn} mt-4`}>Upload Photos</span>
            </button>
          ) : (
            <div className="columns-2 sm:columns-3 xl:columns-4 2xl:columns-5 gap-3">
              {event.photos.map((photo, i) => (
                <div key={photo.id} className="group relative mb-3 break-inside-avoid rounded-xl overflow-hidden bg-gray-100">
                  <button type="button" onClick={() => setLightbox(i)} className="block w-full" aria-label="View photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumb}
                      alt=""
                      loading="lazy"
                      className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </button>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isCover(photo) && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#6C63FF] px-2 py-0.5 text-[11px] font-semibold text-white shadow">
                      <HiStar className="text-xs" />
                      Cover
                    </span>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!isCover(photo) && (
                      <button
                        type="button"
                        onClick={() => onSetCoverPhoto(photo.id)}
                        disabled={coverBusy}
                        aria-label="Set as cover photo"
                        title="Set as cover photo"
                        className="w-8 h-8 rounded-full bg-white/90 text-[#6C63FF] flex items-center justify-center shadow hover:bg-white"
                      >
                        <HiOutlineStar />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLightbox(i)}
                      aria-label="Expand photo"
                      className="w-8 h-8 rounded-full bg-white/90 text-gray-700 flex items-center justify-center shadow hover:bg-white"
                    >
                      <HiOutlineArrowsExpand />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemovePhoto(photo.id)}
                      aria-label="Remove photo"
                      className="w-8 h-8 rounded-full bg-white/90 text-red-500 flex items-center justify-center shadow hover:bg-white"
                    >
                      <HiOutlineTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {lightbox !== null && event.photos && (
        <Lightbox photos={event.photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
