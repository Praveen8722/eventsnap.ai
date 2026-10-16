"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiCheck,
  HiOutlineChevronDown,
  HiOutlineClipboardCopy,
  HiOutlineExclamation,
  HiOutlineKey,
  HiOutlineStatusOnline,
} from "react-icons/hi";
import {
  disableDirectCamera,
  enableDirectCamera,
  getDirectCamera,
  regenerateDirectCameraPassword,
} from "@/api/directCameraApi";
import { Toggle } from "./CreateEventModal";
import { secondaryBtn } from "./ModalShell";
import { apiError } from "./mockData";

// Event gallery → Direct Camera Auto Upload. Separate from the folder-based
// Camera Auto Upload: a compatible camera uploads new photos straight to the
// EventSnap FTPS service (no computer or phone relaying them). Everything
// shown here comes from the server — the status only reflects what the
// service actually recorded (sign-ins, uploads), never just "enabled".
// onPhotosReceived() runs when new photos have arrived, to refresh the gallery.

const POLL_MS = 15000;

const timeAgo = (value) => {
  if (!value) return "";
  const s = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const newer = (a, b) => !!a && (!b || new Date(a) > new Date(b));

// Status from evidence only.
const statusOf = (config) => {
  if (!config?.enabled) return { label: "Off", tone: "bg-gray-100 text-gray-500" };
  if (newer(config.lastFailedLoginAt, config.lastLoginAt)) {
    return { label: "Sign-in failed", tone: "bg-red-100 text-red-600", note: "The last sign-in attempt used a wrong username or password." };
  }
  if (config.lastUploadAt) {
    return { label: "Receiving photos", tone: "bg-green-100 text-green-700", note: `Last photo received ${timeAgo(config.lastUploadAt)}.` };
  }
  if (config.lastLoginAt) {
    return { label: "Camera signed in", tone: "bg-sky-100 text-sky-700", note: `Camera signed in ${timeAgo(config.lastLoginAt)} — no photos received yet.` };
  }
  return { label: "Waiting for camera", tone: "bg-amber-100 text-amber-700", note: "Set up the camera below; nothing has been received yet." };
};

const UPLOAD_STATUS = {
  stored: { label: "Added", tone: "text-green-600" },
  duplicate: { label: "Already received", tone: "text-gray-500" },
  rejected: { label: "Rejected", tone: "text-red-500" },
  failed: { label: "Failed", tone: "text-red-500" },
};

function CopyField({ label, value, secret = false }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        <span className={`truncate text-sm font-mono ${secret ? "text-[#6C63FF] font-semibold" : "text-gray-800"}`}>{value}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="shrink-0 w-7 h-7 rounded-md text-gray-400 hover:text-[#6C63FF] hover:bg-[#6C63FF]/10 flex items-center justify-center"
        >
          {copied ? <HiCheck className="text-green-600" /> : <HiOutlineClipboardCopy />}
        </button>
      </span>
    </div>
  );
}

export function DirectCameraPanel({ event, onPhotosReceived }) {
  const [data, setData] = useState(null); // { service, config, recent }
  const [password, setPassword] = useState(""); // only right after enable/regenerate
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const received = useRef(null);
  const notify = useRef(onPhotosReceived);
  useEffect(() => {
    notify.current = onPhotosReceived;
  }, [onPhotosReceived]);

  const apply = useCallback((payload) => {
    const count = payload.config?.stats?.received ?? 0;
    if (received.current !== null && count > received.current) notify.current?.();
    received.current = count;
    setData(payload);
  }, []);

  const load = useCallback(async () => {
    try {
      apply((await getDirectCamera(event.id)).data);
    } catch (err) {
      setError(apiError(err, "Couldn't load Direct Camera settings."));
    }
  }, [event.id, apply]);

  useEffect(() => {
    received.current = null;
    // Fetch on open (state is only set once the request resolves).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // While it's on, check for new activity every few seconds.
  const enabled = !!data?.config?.enabled;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, load]);

  const run = async (request, { keepPassword = false } = {}) => {
    setBusy(true);
    setError("");
    try {
      const res = await request();
      apply(res.data);
      if (res.data.password) {
        setPassword(res.data.password);
        setShowSetup(true);
      } else if (!keepPassword) {
        setPassword("");
      }
    } catch (err) {
      setError(apiError(err, "Something went wrong. Please try again."));
    }
    setBusy(false);
  };

  const toggle = (on) =>
    run(() => (on ? enableDirectCamera(event.id) : disableDirectCamera(event.id)), { keepPassword: on });
  const regenerate = () => {
    if (!window.confirm("Create a new camera password? The camera will stop uploading until you enter the new password on it.")) return;
    run(() => regenerateDirectCameraPassword(event.id));
  };

  const service = data?.service;
  const config = data?.config;
  const status = statusOf(config);

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#1E1E1E] flex items-center gap-2">
          <HiOutlineStatusOnline className="text-lg text-[#6C63FF]" />
          Direct Camera Auto Upload
        </h2>
        {service?.available && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.tone}`}>{status.label}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-1">
        Automatically transfer photos from compatible cameras directly to this event&apos;s gallery.
      </p>

      {!data ? (
        error ? (
          <p className="text-xs text-red-500 mt-3">{error}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-3">Loading…</p>
        )
      ) : !service.available ? (
        <p className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
          Direct camera uploads aren&apos;t available yet — the EventSnap camera upload service hasn&apos;t been set up on the server.
          Use <span className="font-semibold">Camera Auto Upload</span> above in the meantime.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mt-4">
            <span className="text-sm font-medium text-gray-700">Allow camera uploads for this event</span>
            <Toggle checked={enabled} onChange={toggle} label="Direct Camera Auto Upload" disabled={busy} />
          </div>
          {enabled && status.note && <p className="text-xs text-gray-500 mt-2">{status.note}</p>}
          {config?.lastError?.message && enabled && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 mt-2">
              <HiOutlineExclamation className="shrink-0 mt-0.5" />
              {config.lastError.message} ({timeAgo(config.lastError.at)})
            </p>
          )}

          {enabled && config && (
            <>
              <div className="grid grid-cols-4 gap-1.5 text-center mt-3">
                {[
                  ["Received", config.stats.received, "text-green-600"],
                  ["Repeats", config.stats.duplicates, "text-gray-700"],
                  ["Rejected", config.stats.rejected, config.stats.rejected ? "text-red-500" : "text-gray-700"],
                  ["Failed", config.stats.failed, config.stats.failed ? "text-red-500" : "text-gray-700"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="rounded-lg border border-gray-100 py-2">
                    <p className={`text-lg font-bold ${tone}`}>{value}</p>
                    <p className="text-[11px] text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              {password && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Save this password now (copy it into the camera) — for security it won&apos;t be shown again.
                </p>
              )}
              <div className="mt-3 rounded-lg border border-gray-200 px-3 py-1">
                <CopyField label="Server" value={service.host} />
                <CopyField label="Port" value={service.port} />
                <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Type</span>
                  <span className="text-sm text-gray-800">FTPS (explicit TLS) · Passive on</span>
                </div>
                <CopyField label="Username" value={config.username} />
                {password ? (
                  <CopyField label="Password" value={password} secret />
                ) : (
                  <div className="flex items-center justify-between gap-2 py-1.5">
                    <span className="text-xs text-gray-500">Password</span>
                    <span className="text-xs text-gray-400">Hidden — set {timeAgo(config.credentialsCreatedAt)}</span>
                  </div>
                )}
              </div>
              <button type="button" onClick={regenerate} disabled={busy} className={`${secondaryBtn} w-full mt-2`}>
                <HiOutlineKey className="text-lg" />
                New camera password
              </button>

              <button
                type="button"
                onClick={() => setShowSetup((v) => !v)}
                className="w-full flex items-center justify-between mt-3 text-sm font-semibold text-[#6C63FF]"
                aria-expanded={showSetup}
              >
                Camera setup &amp; troubleshooting
                <HiOutlineChevronDown className={`transition-transform ${showSetup ? "rotate-180" : ""}`} />
              </button>
              {showSetup && (
                <div className="mt-2 space-y-3 text-xs text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-700">Which cameras work</p>
                    <p className="mt-1">
                      Cameras with a built-in <span className="font-semibold">FTP transfer</span> feature that supports{" "}
                      <span className="font-semibold">FTPS</span> (secure FTP) — for example Nikon Z8 / Z9, Sony Alpha models with
                      &ldquo;FTP Transfer&rdquo;, and Canon EOS models with FTP transfer. Check your model&apos;s manual: some need
                      a firmware update, Canon&apos;s app, or a wireless transmitter. Cameras that only connect to the
                      maker&apos;s phone app can&apos;t send here directly — use Camera Auto Upload instead.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Set up the camera (once)</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                      <li>Connect the camera to Wi-Fi or a phone hotspot that has internet.</li>
                      <li>In its network / FTP settings, add an FTP server with the details above.</li>
                      <li>Choose FTPS (or &ldquo;secure&rdquo; / &ldquo;FTPES&rdquo;) and turn Passive mode on. Plain FTP is refused.</li>
                      <li>
                        If the camera asks about the server certificate, import the root certificate or trust the server, as
                        its manual describes.
                      </li>
                      <li>Turn on automatic transfer, for JPEG photos.</li>
                      <li>Take a photo — it appears in this gallery within a moment of the camera sending it.</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Files</p>
                    <p className="mt-1">
                      {service.formats.join(", ")} up to {service.maxFileMb} MB, sent at full quality. RAW files are refused (a
                      web gallery can&apos;t show them) — transfer JPEGs, or RAW+JPEG with JPEG transfer only. Photos the camera
                      sends twice are only added once. The camera keeps its own copies.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Troubleshooting</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li>&ldquo;Sign-in failed&rdquo;: re-enter the username and password (or create a new password).</li>
                      <li>Stays &ldquo;Waiting for camera&rdquo;: check the server, port, FTPS and Passive mode settings and that the camera has internet.</li>
                      <li>Photos rejected: make sure the camera sends JPEG/HEIF files under the size limit.</li>
                      <li>
                        No signal at the venue: most FTP cameras retry or queue photos when the connection returns — check your
                        camera&apos;s manual.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {data.recent.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Recent uploads</p>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {data.recent.map((u, i) => {
                      const s = UPLOAD_STATUS[u.status] || UPLOAD_STATUS.failed;
                      return (
                        <li key={`${u.at}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-gray-700" title={u.reason || u.fileName}>
                            {u.fileName}
                          </span>
                          <span className={`shrink-0 font-medium ${s.tone}`} title={u.reason}>
                            {s.label} · {timeAgo(u.at)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </>
      )}
    </div>
  );
}
