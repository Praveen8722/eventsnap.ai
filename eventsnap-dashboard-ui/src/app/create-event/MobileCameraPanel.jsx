"use client";

import { useRef, useState } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiOutlineCamera,
  HiOutlineChevronDown,
  HiOutlineDeviceMobile,
  HiOutlineRefresh,
} from "react-icons/hi";
import { Toggle } from "./CreateEventModal";
import { primaryBtn, secondaryBtn } from "./ModalShell";
import { useMobileCameraUpload } from "./useMobileCameraUpload";

// Event gallery → Mobile Camera Auto Upload: photos taken with this phone's
// camera upload to the event automatically (see useMobileCameraUpload).
// Separate from Camera Auto Upload and Direct Camera Auto Upload.

const isPhone = () =>
  typeof navigator !== "undefined" &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export function MobileCameraPanel({ event, onPhotosReceived }) {
  const m = useMobileCameraUpload(event.id, { onUploaded: onPhotosReceived });
  const inputRef = useRef(null);
  const [rejected, setRejected] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [phone] = useState(isPhone);

  const status = !m.enabled
    ? m.fatal
      ? { label: "Paused", tone: "bg-red-100 text-red-600" }
      : { label: "Off", tone: "bg-gray-100 text-gray-500" }
    : !m.online
      ? { label: "Offline", tone: "bg-amber-100 text-amber-700" }
      : m.counts.uploading || m.counts.waiting
        ? { label: "Uploading", tone: "bg-sky-100 text-sky-700" }
        : { label: "Ready", tone: "bg-green-100 text-green-700" };

  const take = async (files) => {
    setRejected(await m.addPhotos(files));
  };
  const recent = m.items.slice(-6).reverse();

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#1E1E1E] flex items-center gap-2">
          <HiOutlineDeviceMobile className="text-lg text-[#6C63FF]" />
          Mobile Camera Auto Upload
        </h2>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </div>
      <p className="text-sm text-gray-500 mt-1">Take photos with this phone&apos;s camera — each one uploads to this event automatically.</p>

      {!phone && !m.enabled && !m.items.length ? (
        <p className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
          Open this event on your phone (sign in to the dashboard there) to shoot and upload with its camera.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mt-4">
            <span className="text-sm font-medium text-gray-700">Upload photos I take on this device</span>
            <Toggle checked={m.enabled} onChange={m.setEnabled} label="Mobile Camera Auto Upload" />
          </div>
          {m.fatal && <p className="text-xs text-red-500 mt-2">{m.fatal}</p>}

          {m.enabled && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  take(e.target.files);
                  e.target.value = "";
                }}
              />
              <button type="button" onClick={() => inputRef.current?.click()} className={`${primaryBtn} w-full mt-3 py-3`}>
                <HiOutlineCamera className="text-xl" />
                Take photo
              </button>
              {!m.online && (
                <p className="text-xs text-amber-700 mt-2">
                  No internet — keep shooting; photos are saved on this phone and upload when you&apos;re back online.
                </p>
              )}
            </>
          )}

          {(m.enabled || m.items.length > 0) && (
            <div className="grid grid-cols-3 gap-2 text-center mt-3">
              <div className="rounded-lg border border-gray-100 py-2">
                <p className="text-lg font-bold text-green-600">{m.counts.done}</p>
                <p className="text-[11px] text-gray-500">Uploaded</p>
              </div>
              <div className="rounded-lg border border-gray-100 py-2">
                <p className="text-lg font-bold text-gray-700">{m.counts.waiting + m.counts.uploading}</p>
                <p className="text-[11px] text-gray-500">Waiting</p>
              </div>
              <div className="rounded-lg border border-gray-100 py-2">
                <p className={`text-lg font-bold ${m.counts.failed ? "text-red-500" : "text-gray-700"}`}>{m.counts.failed}</p>
                <p className="text-[11px] text-gray-500">Failed</p>
              </div>
            </div>
          )}

          {m.current && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 truncate">Uploading {m.current.name}…</p>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#6C63FF] transition-[width] duration-200" style={{ width: `${m.current.progress}%` }} />
              </div>
            </div>
          )}

          {m.counts.failed > 0 && (
            <button type="button" onClick={m.retryFailed} className={`${secondaryBtn} w-full mt-3`}>
              <HiOutlineRefresh className="text-lg" />
              Retry {m.counts.failed} failed
            </button>
          )}

          {rejected.length > 0 && (
            <ul className="mt-2 text-xs text-red-500 space-y-0.5">
              {rejected.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}

          {recent.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">This session</p>
                {m.counts.done > 0 && (
                  <button type="button" onClick={m.clearDone} className="text-xs text-gray-400 hover:text-gray-600">
                    Clear uploaded
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {recent.map((item) => (
                  <div key={item.id} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square" title={item.error || item.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                    {item.status === "done" && (
                      <span className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <HiCheckCircle className="text-2xl text-white drop-shadow" />
                      </span>
                    )}
                    {item.status === "failed" && (
                      <span className="absolute inset-0 bg-red-900/30 flex items-center justify-center">
                        <HiExclamationCircle className="text-2xl text-white drop-shadow" />
                      </span>
                    )}
                    {(item.status === "waiting" || item.status === "uploading") && (
                      <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                        <span className="block h-full bg-[#6C63FF]" style={{ width: `${item.progress}%` }} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="w-full flex items-center justify-between mt-3 text-sm font-semibold text-[#6C63FF]"
            aria-expanded={showHelp}
          >
            How it works on phones
            <HiOutlineChevronDown className={`transition-transform ${showHelp ? "rotate-180" : ""}`} />
          </button>
          {showHelp && (
            <ul className="mt-2 list-disc pl-4 space-y-1 text-xs text-gray-600">
              <li>
                Tap <span className="font-semibold">Take photo</span> — your phone&apos;s camera opens; the photo uploads as soon as
                you confirm it, at full quality. Works in Chrome on Android and Safari on iPhone/iPad.
              </li>
              <li>
                Photos taken in the phone&apos;s own Camera app aren&apos;t picked up automatically: phones don&apos;t let websites
                watch the photo gallery. For photos already on the phone, use Camera Auto Upload&apos;s &ldquo;Upload new
                photos&rdquo;.
              </li>
              <li>
                Keep this page open while shooting (the screen is kept on where supported). Phones pause web pages in the
                background; photos already taken are saved on the phone and upload when you come back.
              </li>
              <li>No signal? Keep shooting — waiting photos upload automatically when the connection returns.</li>
              <li>Photos up to 25 MB; the camera&apos;s original file is uploaded unchanged.</li>
            </ul>
          )}
        </>
      )}
    </div>
  );
}
