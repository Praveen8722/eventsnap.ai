"use client";

import { useRef, useState } from "react";
import { HiCheckCircle, HiOutlineDeviceMobile, HiOutlinePhotograph, HiOutlineRefresh, HiOutlineShare } from "react-icons/hi";
import { primaryBtn, secondaryBtn } from "./ModalShell";
import { getShareTarget, setShareTarget } from "./usePhoneUpload";

const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// Camera Auto Upload on phones (and browsers that can't watch a folder).
// The camera's own app (Canon Camera Connect, Nikon SnapBridge, Sony Imaging
// Edge Mobile, Fujifilm XApp, …) transfers photos into the phone's gallery
// over camera Wi-Fi, Bluetooth or USB; from there they reach this event by
// "Upload new photos" or, on Android, Share → EventSnap.
export function PhoneUploadSection({ event, phone, bridgeHelp }) {
  const inputRef = useRef(null);
  const [isTarget, setIsTarget] = useState(() => getShareTarget() === event.id);
  const [showBridge, setShowBridge] = useState(false);
  const s = phone.state;
  const forThisEvent = s.eventId === event.id && (s.busy || s.total > 0);
  const android = isAndroid();
  const ios = isIOS();

  return (
    <div className="mt-2 space-y-3 text-sm">
      <p className="text-gray-600">
        Connect the camera to this phone with its app (Camera Connect, SnapBridge, Imaging Edge Mobile, …) over camera
        Wi-Fi, Bluetooth or USB so photos arrive in the gallery. Then send them here — photos already uploaded are
        always skipped.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="Choose photos to upload from the gallery"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length) phone.upload(event, files, "gallery");
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={s.busy}
        className={`${primaryBtn} w-full`}
      >
        <HiOutlinePhotograph className="text-lg" />
        {s.busy && s.eventId === event.id ? "Uploading…" : "Upload new photos"}
      </button>
      <p className="text-xs text-gray-400 -mt-1">Tip: select all of today&apos;s photos — only new ones are uploaded.</p>

      {forThisEvent && (
        <div className="rounded-lg border border-gray-100 p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">{s.uploaded}</p>
              <p className="text-[11px] text-gray-500">Uploaded</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-700">{s.skipped}</p>
              <p className="text-[11px] text-gray-500">Already there</p>
            </div>
            <div>
              <p className={`text-lg font-bold ${s.failed.length ? "text-red-500" : "text-gray-700"}`}>{s.failed.length}</p>
              <p className="text-[11px] text-gray-500">Failed</p>
            </div>
          </div>
          {s.busy && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#6C63FF] transition-[width] duration-200" style={{ width: `${s.progress}%` }} />
            </div>
          )}
          {!s.busy && (
            <p className="text-xs text-gray-500">
              {s.uploaded + s.skipped} of {s.total} done{s.source === "share" ? " (shared photos)" : ""}
              {s.error ? ` — ${s.error}` : ""}
            </p>
          )}
          {s.failed.length > 0 && !s.busy && (
            <>
              <ul className="max-h-24 overflow-y-auto text-xs space-y-0.5">
                {s.failed.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                    <span className="truncate text-gray-700">{f.name}</span>
                    <span className="shrink-0 text-red-500">{f.error}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => phone.retryFailed(event)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6C63FF] hover:underline"
              >
                <HiOutlineRefresh />
                Retry failed
              </button>
            </>
          )}
        </div>
      )}

      {!ios && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
          <p className="font-semibold text-gray-700 flex items-center gap-1.5">
            <HiOutlineShare className="text-[#6C63FF]" />
            Share straight from the camera app {android ? "" : "(Android)"}
          </p>
          <p className="text-xs text-gray-600">
            Install EventSnap (browser menu → <span className="font-semibold">Install app</span> /{" "}
            <span className="font-semibold">Add to Home screen</span>), then in the camera app or gallery tap{" "}
            <span className="font-semibold">Share → EventSnap</span>. Shared photos upload to the event chosen here.
          </p>
          {isTarget ? (
            <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
              <HiCheckCircle /> Photos shared to EventSnap go to this event
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShareTarget(event.id);
                setIsTarget(true);
              }}
              className={`${secondaryBtn} w-full !py-2`}
            >
              Send shared photos to this event
            </button>
          )}
        </div>
      )}
      {ios && (
        <p className="text-xs text-gray-500">
          On iPhone, use <span className="font-semibold">Upload new photos</span> after the camera app has saved them —
          iOS doesn&apos;t let web apps receive shared photos.
        </p>
      )}

      <p className="text-xs text-gray-500 flex items-start gap-1.5">
        <HiOutlineDeviceMobile className="shrink-0 mt-0.5 text-gray-400" />
        Fully automatic background upload on Android: use the EventSnap Camera app (eventsnap-camera-android).
      </p>

      {!android && !ios && (
        <>
          <button
            type="button"
            onClick={() => setShowBridge((v) => !v)}
            className="text-xs font-semibold text-gray-500 hover:text-[#6C63FF]"
          >
            {showBridge ? "Hide" : "On a computer? Use the"} desktop bridge
          </button>
          {showBridge && bridgeHelp}
        </>
      )}
    </div>
  );
}
