"use client";

import { useState } from "react";
import {
  HiOutlineCamera,
  HiOutlineFolderOpen,
  HiOutlineRefresh,
  HiOutlineStop,
  HiOutlineTerminal,
} from "react-icons/hi";
import { primaryBtn, secondaryBtn } from "./ModalShell";
import { PhoneUploadSection } from "./PhoneUploadSection";

const STATUS = {
  idle: { label: "Off", tone: "bg-gray-100 text-gray-500" },
  watching: { label: "Watching", tone: "bg-green-100 text-green-700" },
  stopped: { label: "Stopped", tone: "bg-gray-100 text-gray-600" },
  error: { label: "Needs attention", tone: "bg-red-100 text-red-600" },
};

const timeAgo = (at) => {
  const s = Math.max(1, Math.round((Date.now() - at) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`;
};

// Event gallery → Camera Auto Upload. `camera` is useCameraAutoUpload()'s
// result (kept at page level so watching continues while browsing events).
// `phone` is usePhoneUpload()'s result — used where a folder can't be
// watched (phones, Firefox, Safari).
export function CameraAutoUploadPanel({ event, camera, phone }) {
  const { state, remembered, start, resume, stop, retryFailed, reset, supported } = camera;
  const [includeExisting, setIncludeExisting] = useState(false);
  const [showBridge, setShowBridge] = useState(false);

  const busyElsewhere = state.status === "watching" && state.eventId !== event.id;
  const forThisEvent = state.eventId === event.id;
  // This event is the remembered target (e.g. after a refresh) but isn't being watched now.
  const pausedHere = remembered?.eventId === event.id && !(forThisEvent && state.status !== "idle");
  const targetElsewhere = remembered && remembered.eventId !== event.id && !busyElsewhere;
  const status = !supported
    ? phone?.state.busy && phone.state.eventId === event.id
      ? { label: "Uploading", tone: "bg-green-100 text-green-700" }
      : { label: "Phone", tone: "bg-[#6C63FF]/10 text-[#6C63FF]" }
    : forThisEvent
      ? STATUS[state.status]
      : pausedHere
        ? { label: "Paused", tone: "bg-amber-100 text-amber-700" }
        : STATUS.idle;

  const bridgeHelp = (
    <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600 space-y-1.5">
      <p className="font-semibold text-gray-700">Desktop bridge (any browser, Windows/Mac/Linux)</p>
      <p>With Node.js 20+, from the eventsnap-dashboard-backend folder run:</p>
      <code className="block rounded bg-white border border-gray-200 px-2 py-1.5 font-mono text-[11px] text-gray-800 break-all">
        node tools/camera-auto-upload.mjs --folder &quot;C:\Photos\Tethered&quot; --event {event.slug}
      </code>
      <p>It signs in with your EventSnap account and uploads new photos from that folder to this event.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#1E1E1E] flex items-center gap-2">
          <HiOutlineCamera className="text-lg text-[#6C63FF]" />
          Camera Auto Upload
        </h2>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${status.tone}`}>
          {forThisEvent && state.status === "watching" && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          )}
          {status.label}
        </span>
      </div>

      {!supported ? (
        phone ? (
          <PhoneUploadSection event={event} phone={phone} bridgeHelp={bridgeHelp} />
        ) : (
          <>
            <p className="text-sm text-gray-500 mt-2">
              Watching a camera folder needs <span className="font-semibold">Chrome or Edge on a computer</span>.
              Phones and other browsers can&apos;t watch folders — use the desktop bridge instead.
            </p>
            {bridgeHelp}
          </>
        )
      ) : busyElsewhere ? (
        <div className="mt-2 text-sm text-gray-600">
          <p>
            Auto upload is running for <span className="font-semibold">{state.eventName}</span>. Stop it there to use
            it for this event.
          </p>
          <button type="button" onClick={stop} className={`${secondaryBtn} w-full mt-3`}>
            <HiOutlineStop className="text-lg" />
            Stop auto upload
          </button>
        </div>
      ) : forThisEvent && state.status !== "idle" ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
            <p className="flex items-center gap-1.5 text-gray-700 min-w-0">
              <HiOutlineFolderOpen className="shrink-0 text-gray-400" />
              <span className="truncate font-medium" title={state.folder}>
                {state.folder}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {state.status === "watching"
                ? state.uploading
                  ? "Uploading new photos…"
                  : "Watching for new photos (checks every few seconds)"
                : state.status === "stopped"
                  ? "Stopped — new photos aren't being uploaded"
                  : state.error}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-gray-100 py-2">
              <p className="text-lg font-bold text-green-600">{state.uploaded}</p>
              <p className="text-[11px] text-gray-500">Uploaded</p>
            </div>
            <div className="rounded-lg border border-gray-100 py-2">
              <p className="text-lg font-bold text-gray-700">{state.waiting}</p>
              <p className="text-[11px] text-gray-500">Waiting</p>
            </div>
            <div className="rounded-lg border border-gray-100 py-2">
              <p className={`text-lg font-bold ${state.failed.length ? "text-red-500" : "text-gray-700"}`}>
                {state.failed.length}
              </p>
              <p className="text-[11px] text-gray-500">Failed</p>
            </div>
          </div>

          {state.uploading && (
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#6C63FF] transition-[width] duration-200" style={{ width: `${state.progress}%` }} />
            </div>
          )}

          {state.lastUploaded && (
            <p className="text-xs text-gray-500 truncate" title={state.lastUploaded.name}>
              Last: {state.lastUploaded.name} · {timeAgo(state.lastUploaded.at)}
            </p>
          )}
          {state.skipped > 0 && (
            <p className="text-xs text-gray-400">
              {state.skipped} photo{state.skipped === 1 ? "" : "s"} skipped (already in the folder at start or already in
              this event).
            </p>
          )}

          {state.failed.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50/50 p-2.5">
              <ul className="space-y-1 max-h-28 overflow-y-auto text-xs">
                {state.failed.map((f) => (
                  <li key={f.path} className="flex justify-between gap-2">
                    <span className="truncate text-gray-700" title={f.path}>
                      {f.path}
                    </span>
                    <span className="shrink-0 text-red-500">{f.error}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={retryFailed}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6C63FF] hover:underline"
              >
                <HiOutlineRefresh />
                Retry failed
              </button>
            </div>
          )}

          {state.status === "watching" ? (
            <button type="button" onClick={stop} className={`${secondaryBtn} w-full`}>
              <HiOutlineStop className="text-lg" />
              Stop auto upload
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={reset} className={secondaryBtn}>
                Done
              </button>
              <button type="button" onClick={resume} className={primaryBtn}>
                Resume
              </button>
            </div>
          )}
          {state.status === "watching" && (
            <p className="text-[11px] text-gray-400">Keep this tab open while shooting.</p>
          )}
        </div>
      ) : (
        <div className="mt-2">
          {pausedHere && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="text-amber-800">
                Auto upload to this event from <span className="font-semibold">{remembered.folder}</span> is paused.
                Resume to upload new photos (including any taken while it was paused) — nothing is uploaded twice.
              </p>
              <button type="button" onClick={resume} className={`${primaryBtn} w-full mt-2`}>
                <HiOutlineRefresh className="text-lg" />
                Resume auto upload
              </button>
            </div>
          )}
          {targetElsewhere && (
            <p className="mb-3 text-xs text-gray-500">
              Auto upload is set to <span className="font-semibold">{remembered.eventName}</span>. Starting here makes
              this event the upload target instead.
            </p>
          )}
          <ol className="text-sm text-gray-600 space-y-1.5 list-decimal pl-4">
            <li>
              Connect the camera (USB, camera Wi-Fi or Bluetooth) with its app — e.g. EOS Utility, NX Tether /
              SnapBridge, Imaging Edge — set to save photos into a folder on this computer.
            </li>
            <li>Choose that folder. New JPG/PNG/HEIC/WebP photos upload to this event automatically.</li>
          </ol>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeExisting}
              onChange={(e) => setIncludeExisting(e.target.checked)}
              className="accent-[#6C63FF]"
            />
            Also upload photos already in the folder
          </label>
          <button type="button" onClick={() => start(event, { includeExisting })} className={`${primaryBtn} w-full mt-3`}>
            <HiOutlineFolderOpen className="text-lg" />
            {pausedHere ? "Choose a different folder" : "Choose folder & start"}
          </button>
          <button
            type="button"
            onClick={() => setShowBridge((v) => !v)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#6C63FF]"
          >
            <HiOutlineTerminal />
            {showBridge ? "Hide" : "Use the"} desktop bridge instead
          </button>
          {showBridge && bridgeHelp}
        </div>
      )}
    </div>
  );
}
