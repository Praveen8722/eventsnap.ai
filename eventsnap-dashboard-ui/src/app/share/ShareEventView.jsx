"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiCheck,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineCalendar,
  HiOutlineDownload,
  HiOutlineLocationMarker,
  HiOutlinePhotograph,
  HiX,
} from "react-icons/hi";
import {
  createEventAssetUrl,
  downloadEventPhoto,
  getPublicEvent,
  recordEventView,
} from "@/api/createEventApi";
import { formatEventDate } from "@/app/create-event/mockData";
import { SelfieSearch } from "./SelfieSearch";

// Public guest page for a Create Event — /share/<shareId> (QR / share link).
// No login. Loads the event by its permanent share id, records one guest
// view, and lets guests download photos when the event allows it.

// One guest view per browser per event every 30 minutes: refreshes and
// re-renders within that window aren't counted again.
const VIEW_WINDOW_MS = 30 * 60 * 1000;
const viewKey = (shareId) => `eventsnap-share-view:${shareId}`;
const viewInFlight = new Set();

// onOwnerVisit runs when the backend recognises the signed-in photographer
// as this event's owner (their own visits aren't counted). The "viewed" mark
// is only stored for a visit the backend actually counted.
const recordViewOnce = (shareId, onOwnerVisit) => {
  try {
    const last = Number(localStorage.getItem(viewKey(shareId)));
    if (last && Date.now() - last < VIEW_WINDOW_MS) return;
  } catch {
    // Storage unavailable (private mode) — fall back to the in-flight guard.
  }
  if (viewInFlight.has(shareId)) return;
  viewInFlight.add(shareId);
  recordEventView(shareId)
    .then((res) => {
      if (!res.data?.counted) return onOwnerVisit?.();
      try {
        localStorage.setItem(viewKey(shareId), String(Date.now()));
      } catch {}
    })
    .catch(() => {})
    .finally(() => viewInFlight.delete(shareId));
};

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// The server's message from a failed blob request.
const downloadError = async (error) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message;
    } catch {}
  }
  return data?.message || "Download failed. Please try again.";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Pause between files of a multi-download so browsers don't drop any.
const BETWEEN_DOWNLOADS_MS = 400;

const DOWNLOAD_NOTE = {
  free: { text: "Tap any photo to download it", tone: "bg-green-50 text-green-700 border-green-100" },
  paid: { text: "Photo downloads for this event will be available soon", tone: "bg-[#6C63FF]/5 text-[#6C63FF] border-[#6C63FF]/15" },
  disabled: { text: "Photos can be viewed but not downloaded", tone: "bg-amber-50 text-amber-700 border-amber-100" },
};

function Spinner() {
  return <span className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />;
}

export default function ShareEventView({ shareId }) {
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState(shareId ? "loading" : "error"); // loading | ready | error
  const [lightbox, setLightbox] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  // Ids of the photos ticked for "Download Selected".
  const [selected, setSelected] = useState([]);
  // { done, total } while a multi-download runs.
  const [bulk, setBulk] = useState(null);
  const [notice, setNotice] = useState(null); // { text, tone }
  // The photographer viewing their own event while signed in.
  const [ownerPreview, setOwnerPreview] = useState(false);
  // Face Search: the selfie search result ({ matches, indexed, total }), null
  // until the guest has searched.
  const [faceResult, setFaceResult] = useState(null);
  const noticeTimer = useRef(null);

  useEffect(() => {
    if (!shareId) return;
    let active = true;
    getPublicEvent(shareId)
      .then((res) => {
        if (!active) return;
        setEvent(res.data.event);
        setStatus("ready");
        recordViewOnce(shareId, () => setOwnerPreview(true));
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [shareId]);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const showNotice = (text, tone) => {
    setNotice({ text, tone });
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  const canDownload = event?.photoDownload === "free";
  // With Face Search on, guests see only the photos matched to their selfie.
  const faceMode = !!event?.guestAccess?.faceSearch;
  const photos = faceMode ? faceResult?.matches || [] : event?.photos || [];

  const busy = !!downloadingId || !!bulk;
  const selectedSet = new Set(selected);
  const selecting = selected.length > 0;

  const toggleSelect = (photoId) =>
    setSelected((prev) => (prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]));
  const selectAll = () => setSelected(photos.map((p) => p.id));
  const clearSelection = () => setSelected([]);

  // Downloads one photo through the backend (which checks the event's
  // download setting, that the photo belongs to this event, and counts it)
  // and saves it. Throws on failure.
  const fetchAndSave = async (photo, index) => {
    const res = await downloadEventPhoto(shareId, photo.id);
    const ext = (res.data.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "");
    saveBlob(res.data, `${shareId}-${index + 1}.${ext}`);
  };

  const download = async (photo, index) => {
    if (busy) return;
    setDownloadingId(photo.id);
    try {
      await fetchAndSave(photo, index);
      showNotice("Photo downloaded", "success");
    } catch (error) {
      showNotice(await downloadError(error), "error");
    } finally {
      setDownloadingId(null);
    }
  };

  // One request per selected photo, in gallery order — each successful one
  // is counted by the backend. Photos that fail stay selected for a retry;
  // if downloads get switched off (403) the rest are skipped.
  const downloadSelected = async () => {
    if (busy || !selecting) return;
    const queue = photos
      .map((photo, index) => ({ photo, index }))
      .filter(({ photo }) => selectedSet.has(photo.id));
    const failed = [];
    let lastError = "";
    setBulk({ done: 0, total: queue.length });
    for (let i = 0; i < queue.length; i++) {
      const { photo, index } = queue[i];
      setDownloadingId(photo.id);
      try {
        await fetchAndSave(photo, index);
      } catch (error) {
        failed.push(photo.id);
        lastError = await downloadError(error);
        if (error?.response?.status === 403) {
          failed.push(...queue.slice(i + 1).map((q) => q.photo.id));
          break;
        }
      }
      setBulk({ done: i + 1, total: queue.length });
      if (i < queue.length - 1) await sleep(BETWEEN_DOWNLOADS_MS);
    }
    setDownloadingId(null);
    setBulk(null);
    const ok = queue.length - failed.length;
    setSelected(failed);
    if (!failed.length) {
      showNotice(`${ok} photo${ok === 1 ? "" : "s"} downloaded`, "success");
    } else {
      showNotice(`${ok} of ${queue.length} downloaded — ${lastError}`, "error");
    }
  };

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") setLightbox((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setLightbox((i) => (i + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (status === "error" || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gray-50">
        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm text-[#6C63FF] flex items-center justify-center mb-4">
          <HiOutlinePhotograph className="text-3xl" />
        </div>
        <p className="text-gray-800 font-semibold">This event isn&apos;t available</p>
        <p className="text-gray-500 text-sm mt-1">The link may be incorrect, or the event was removed.</p>
      </div>
    );
  }

  const cover = createEventAssetUrl(event.coverPhoto);
  const note = DOWNLOAD_NOTE[event.photoDownload] || DOWNLOAD_NOTE.disabled;
  const current = lightbox !== null ? photos[lightbox] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <header className="relative h-64 sm:h-80 lg:h-96 overflow-hidden bg-gradient-to-br from-[#6C63FF] to-[#A23EFF]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 text-sm font-bold">
          <span className="text-[#FF5555]">
            Event<span className="text-blue-300">Snap</span>
            <span className="text-white">.AI</span>
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 max-w-6xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8 text-white">
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight break-words">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-white/85">
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
              {event.photoCount.toLocaleString("en-IN")} photo{event.photoCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {ownerPreview && (
          <p className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">Owner preview.</span> You&apos;re signed in as this
            event&apos;s photographer, so your own visits and downloads aren&apos;t counted in Guest Views or
            Downloads. Open the link in a private window (or another device) to see it as a guest.
          </p>
        )}
        {faceMode && (
          <SelfieSearch
            shareId={shareId}
            eventName={event.name}
            result={faceResult}
            onResult={(result) => {
              setSelected([]);
              setLightbox(null);
              setFaceResult(result);
            }}
          />
        )}
        {photos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${note.tone}`}>
              {canDownload && <HiOutlineDownload />}
              {note.text}
            </p>
            {canDownload && (
              <div className="flex items-center gap-1 text-sm">
                {selecting && (
                  <span className="mr-2 font-semibold text-gray-700">{selected.length} selected</span>
                )}
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={busy || selected.length === photos.length}
                  className="rounded-lg px-3 py-1.5 font-semibold text-[#6C63FF] hover:bg-[#6C63FF]/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Select All
                </button>
                {selecting && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={busy}
                    className="rounded-lg px-3 py-1.5 font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {faceMode && photos.length === 0 ? null : photos.length === 0 ? (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center">
            <HiOutlinePhotograph className="mx-auto text-4xl text-[#6C63FF]" />
            <p className="font-semibold text-gray-800 mt-3">Photos are on their way</p>
            <p className="text-sm text-gray-500 mt-1">Check back soon — the photographer hasn&apos;t shared any photos yet.</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 mt-5">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className={`group relative mb-3 break-inside-avoid rounded-xl overflow-hidden bg-gray-100 ${
                  selectedSet.has(photo.id) ? "ring-[3px] ring-[#6C63FF] ring-offset-2 ring-offset-gray-50" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => (canDownload && selecting ? toggleSelect(photo.id) : setLightbox(i))}
                  className="block w-full"
                  aria-label={canDownload && selecting ? `Select photo ${i + 1}` : `View photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={createEventAssetUrl(photo.url)}
                    alt=""
                    loading="lazy"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>
                {canDownload && selectedSet.has(photo.id) && (
                  <div className="pointer-events-none absolute inset-0 bg-[#6C63FF]/15" />
                )}
                {canDownload && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selectedSet.has(photo.id)}
                    aria-label={`Select photo ${i + 1}`}
                    onClick={() => toggleSelect(photo.id)}
                    disabled={!!bulk}
                    className={`absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center shadow transition-opacity ${
                      selectedSet.has(photo.id)
                        ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                        : "bg-white/80 border-white text-transparent hover:text-gray-400"
                    } ${selecting ? "" : "sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"}`}
                  >
                    <HiCheck className="text-sm" />
                  </button>
                )}
                {canDownload && (
                  <button
                    type="button"
                    onClick={() => download(photo, i)}
                    disabled={busy}
                    aria-label={`Download photo ${i + 1}`}
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 text-gray-800 flex items-center justify-center shadow hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:cursor-wait"
                  >
                    {downloadingId === photo.id ? (
                      <span className="w-4 h-4 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    ) : (
                      <HiOutlineDownload />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <p className={`text-center text-xs text-gray-400 mt-10 ${canDownload && selecting ? "pb-20" : ""}`}>
          Shared with EventSnap.AI
        </p>
      </main>

      {/* Lightbox */}
      {current && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-2 p-4 text-white/80 text-sm">
            <span>
              {lightbox + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-2">
              {canDownload && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    download(current, lightbox);
                  }}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-wait"
                >
                  <HiOutlineDownload />
                  {downloadingId === current.id ? "Downloading…" : "Download"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Close"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <HiX className="text-xl" />
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={createEventAssetUrl(current.url)}
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
                  setLightbox((lightbox - 1 + photos.length) % photos.length);
                }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <HiChevronLeft className="text-2xl" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox + 1) % photos.length);
                }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <HiChevronRight className="text-2xl" />
              </button>
            </>
          )}
        </div>
      )}

      {canDownload && selecting && lightbox === null && (
        <div className="fixed z-50 inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-800">
              {bulk ? `Downloading ${Math.min(bulk.done + 1, bulk.total)} of ${bulk.total}…` : `${selected.length} selected`}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={downloadSelected}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6C63FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5B52EE] disabled:opacity-60 disabled:cursor-wait transition-colors"
              >
                <HiOutlineDownload className="text-lg" />
                Download Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`fixed z-[70] ${canDownload && selecting ? "bottom-20" : "bottom-6"} left-1/2 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium shadow-xl ${
            notice.tone === "error" ? "bg-red-600 text-white" : "bg-[#1E1E1E] text-white"
          }`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}
