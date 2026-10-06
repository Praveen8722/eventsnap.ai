"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineShare } from "react-icons/hi";
import { primaryBtn, secondaryBtn } from "./ModalShell";
import { getShareTarget, setShareTarget } from "./usePhoneUpload";

// Photos shared to EventSnap from another app (Android "Share → EventSnap").
// public/share-target-sw.js keeps them in Cache Storage; this shows them on
// the Create Event page and uploads them to the chosen event. If an event
// was already chosen for shared photos, they upload automatically on
// arrival. Photos stay in the inbox until uploaded (or discarded), so nothing
// is lost if the photographer had to sign in first.

const CACHE = "eventsnap-shared-photos";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const registerShareTarget = () => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(`${BASE_PATH}/share-target-sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
};

const readInbox = async () => {
  if (typeof caches === "undefined") return [];
  const cache = await caches.open(CACHE);
  const items = [];
  for (const request of await cache.keys()) {
    const res = await cache.match(request);
    if (!res) continue;
    const blob = await res.blob();
    items.push({
      request,
      file: new File([blob], decodeURIComponent(res.headers.get("X-File-Name") || "photo.jpg"), {
        type: blob.type,
        lastModified: Number(res.headers.get("X-Last-Modified")) || Date.now(),
      }),
    });
  }
  return items;
};

const removeFromInbox = async (requests) => {
  const cache = await caches.open(CACHE);
  await Promise.all(requests.map((r) => cache.delete(r)));
};

export function SharedPhotosInbox({ events, phone, onOpenEvent }) {
  const [pending, setPending] = useState([]);
  const [targetId, setTargetId] = useState("");
  const [summary, setSummary] = useState(null); // { eventId, eventName, uploaded, skipped, failed }
  const autoStarted = useRef(false);

  useEffect(() => {
    let active = true;
    readInbox()
      .then((items) => active && setPending(items))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Default to the event chosen before for shared photos (if it still exists).
  const savedTarget = getShareTarget();
  const effectiveTarget = targetId || (events.some((e) => e.id === savedTarget) ? savedTarget : "");

  const uploadNow = useCallback(
    async (eventId) => {
      const event = events.find((e) => e.id === eventId);
      if (!event || !pending.length) return;
      setShareTarget(event.id);
      const result = await phone.upload(event, pending.map((p) => p.file), "share");
      if (!result) return;
      const finished = pending.filter((p) => result.done.has(p.file));
      await removeFromInbox(finished.map((p) => p.request)).catch(() => {});
      setPending((prev) => prev.filter((p) => !result.done.has(p.file)));
      setSummary({ eventId: event.id, eventName: event.name, uploaded: result.uploaded, skipped: result.skipped, failed: result.failed });
      if (typeof window !== "undefined" && window.location.search.includes("shared=")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    },
    [events, pending, phone]
  );

  // Arrived via Share with an event already chosen → upload straight away.
  useEffect(() => {
    if (autoStarted.current || !pending.length || !events.length) return;
    if (!window.location.search.includes("shared=")) return;
    const target = getShareTarget();
    if (!events.some((e) => e.id === target)) return;
    autoStarted.current = true;
    queueMicrotask(() => uploadNow(target));
  }, [pending.length, events, uploadNow]);

  const discard = async () => {
    await removeFromInbox(pending.map((p) => p.request)).catch(() => {});
    setPending([]);
  };

  const busy = phone.state.busy && phone.state.source === "share";

  if (!pending.length && !busy && !summary) return null;

  return (
    <div className="mb-4 rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 p-4 text-sm">
      {busy ? (
        <>
          <p className="font-semibold text-gray-800">
            Uploading shared photos to {phone.state.eventName}… {phone.state.uploaded + phone.state.skipped} of{" "}
            {phone.state.total}
          </p>
          <div className="mt-2 h-1.5 rounded-full bg-white overflow-hidden">
            <div className="h-full rounded-full bg-[#6C63FF] transition-[width] duration-200" style={{ width: `${phone.state.progress}%` }} />
          </div>
        </>
      ) : pending.length ? (
        <>
          <p className="font-semibold text-gray-800 flex items-center gap-2">
            <HiOutlineShare className="text-[#6C63FF]" />
            {pending.length} photo{pending.length === 1 ? "" : "s"} shared to EventSnap
          </p>
          {summary?.failed > 0 && (
            <p className="text-xs text-red-500 mt-1">
              {summary.failed} couldn&apos;t be uploaded{phone.state.error ? ` — ${phone.state.error}` : ""}. Try again below.
            </p>
          )}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <select
              aria-label="Event for shared photos"
              value={effectiveTarget}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#6C63FF]"
            >
              <option value="" disabled>
                Choose an event…
              </option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => uploadNow(effectiveTarget)} disabled={!effectiveTarget} className={primaryBtn}>
              Upload to event
            </button>
            <button type="button" onClick={discard} className={secondaryBtn}>
              Discard
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Next time, photos you share go to this event automatically.</p>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-gray-800">
            <span className="font-semibold">{summary.uploaded}</span> shared photo{summary.uploaded === 1 ? "" : "s"} uploaded to{" "}
            <span className="font-semibold">{summary.eventName}</span>
            {summary.skipped > 0 && <span className="text-gray-500"> · {summary.skipped} already there</span>}
          </p>
          <span className="flex gap-3">
            <button type="button" onClick={() => onOpenEvent(summary.eventId)} className="font-semibold text-[#6C63FF] hover:underline">
              View event
            </button>
            <button type="button" onClick={() => setSummary(null)} className="font-semibold text-gray-500 hover:underline">
              Dismiss
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
