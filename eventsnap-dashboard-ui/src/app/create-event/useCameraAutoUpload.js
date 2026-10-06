"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getEventPhotos, uploadEventPhotos } from "@/api/createEventApi";
import { apiError } from "./mockData";

// Camera Auto Upload ("watched folder"). Browsers can't talk to a camera over
// USB (PTP/MTP), camera Wi-Fi or Bluetooth, so the camera's own software
// (EOS Utility, NX Tether / SnapBridge, Imaging Edge, gphoto2, …) saves each
// new shot into a folder on this computer, and this hook watches that folder
// through the File System Access API (Chrome / Edge on desktop) and uploads
// new photos to the event with the normal photo upload API.
//
// Duplicates are prevented by: a per-event record (localStorage) of every
// file already uploaded from a folder; skipping files whose name + size match
// a photo already in the event; queueing each file only once; and only
// uploading a file once its size/modified time is unchanged between two
// scans (so a photo still being written by the camera software isn't sent
// half-finished).

const POLL_MS = 3000;
export const MAX_SIZE = 25 * 1024 * 1024; // backend per-file limit
const BATCH_MAX_FILES = 10;
const BATCH_MAX_BYTES = 40 * 1024 * 1024;
const MAX_DEPTH = 4; // sub-folders (e.g. DCIM/100CANON)
const MAX_REMEMBERED = 20000;
// Browser-viewable formats only. RAW files (CR3/NEF/ARW/…) are skipped —
// shoot RAW+JPEG and the JPEG is uploaded.
export const IMAGE_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export const cameraAutoUploadSupported = () =>
  typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";

const storeKey = (eventId) => `eventsnap-camera-uploaded:${eventId}`;
export const loadUploaded = (eventId) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(storeKey(eventId)) || "[]"));
  } catch {
    return new Set();
  }
};
export const saveUploaded = (eventId, keys) => {
  try {
    localStorage.setItem(storeKey(eventId), JSON.stringify([...keys].slice(-MAX_REMEMBERED)));
  } catch {
    // Storage full / unavailable — in-memory dedupe still applies.
  }
};

// Files skipped when watching started (already in the folder) — remembered
// so resuming later (after a refresh) still never uploads them.
const skipKey = (eventId) => `eventsnap-camera-skipped:${eventId}`;
const loadSkipped = (eventId) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(skipKey(eventId)) || "[]"));
  } catch {
    return new Set();
  }
};
const saveSkipped = (eventId, keys) => {
  try {
    localStorage.setItem(skipKey(eventId), JSON.stringify([...keys].slice(-MAX_REMEMBERED)));
  } catch {}
};

// The current target — { eventId, eventName, handle, active } — kept in
// IndexedDB (which can store the folder handle) so it survives refreshes and
// browser restarts until the photographer chooses another event or "Done".
const WATCH_DB = "eventsnap-camera";
const WATCH_STORE = "watch";
const watchStore = async (mode, action) => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(WATCH_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(WATCH_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WATCH_STORE, mode);
    const req = action(tx.objectStore(WATCH_STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};
const loadWatch = () => watchStore("readonly", (st) => st.get("current")).catch(() => null);
// Writes run strictly in order, so a quick Stop → Start on another event can
// never leave the older target saved last.
let watchWrites = Promise.resolve();
const queueWrite = (write) => (watchWrites = watchWrites.then(write, write).catch(() => {}));
const saveWatch = (value) => queueWrite(() => watchStore("readwrite", (st) => st.put(value, "current")));
const forgetWatch = () => queueWrite(() => watchStore("readwrite", (st) => st.delete("current")));

const fileKey = (path, file) => `${path}|${file.size}|${file.lastModified}`;
export const photoKey = (name, size) => `${name}|${size}`;

// Every supported image under `dir` (hidden files/folders skipped).
const listImages = async (dir, prefix = "", depth = 0, out = []) => {
  for await (const [name, handle] of dir.entries()) {
    if (name.startsWith(".")) continue;
    if (handle.kind === "directory") {
      if (depth < MAX_DEPTH) await listImages(handle, `${prefix}${name}/`, depth + 1, out);
      continue;
    }
    const type = IMAGE_TYPES[name.split(".").pop().toLowerCase()];
    if (!type) continue;
    const file = await handle.getFile();
    out.push({ path: `${prefix}${name}`, file, type });
  }
  return out;
};

export const toBatches = (list) => {
  const batches = [];
  let current = [];
  let bytes = 0;
  for (const item of list) {
    if (current.length && (current.length >= BATCH_MAX_FILES || bytes + item.file.size > BATCH_MAX_BYTES)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += item.file.size;
  }
  if (current.length) batches.push(current);
  return batches;
};

// Some systems give HEIC etc. an empty type; send the extension's type.
const uploadable = ({ file, type }) => (file.type ? file : new File([file], file.name, { type, lastModified: file.lastModified }));

const IDLE = {
  status: "idle", // idle | watching | stopped | error
  eventId: null,
  eventName: "",
  folder: "",
  uploaded: 0,
  skipped: 0, // already in the event / already in the folder at start
  waiting: 0, // new files waiting to finish writing or in the queue
  uploading: false,
  progress: 0,
  lastUploaded: null, // { name, at }
  failed: [], // [{ path, error }]
  error: "",
};

export function useCameraAutoUpload({ onSaved }) {
  const [state, setState] = useState(IDLE);
  const run = useRef(null);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  // Push the running watcher's counters to React state.
  const sync = useCallback((r, extra = {}) => {
    if (run.current !== r) return;
    setState((prev) => ({
      ...prev,
      uploaded: r.uploadedCount,
      skipped: r.skippedCount,
      waiting: r.pending.size + r.queue.length,
      failed: r.failed.map(({ path, error }) => ({ path, error })),
      ...extra,
    }));
  }, []);

  const halt = (r) => {
    if (!r) return;
    r.stopped = true;
    clearTimeout(r.timer);
  };

  const scan = async (r) => {
    const files = await listImages(r.dir);
    for (const item of files) {
      const key = fileKey(item.path, item.file);
      if (r.uploadedKeys.has(key) || r.skipKeys.has(key) || r.queuedKeys.has(key) || r.failedKeys.has(key)) continue;
      // First scan without "include existing": what's already there is skipped.
      if (r.baseline || r.inEvent.has(photoKey(item.file.name, item.file.size))) {
        r.skipKeys.add(key);
        r.skippedCount++;
        continue;
      }
      if (item.file.size > MAX_SIZE) {
        r.failedKeys.add(key);
        r.failed.push({ ...item, key, error: "Larger than 25 MB" });
        continue;
      }
      // Upload only once the file has stopped changing between two scans.
      const seen = r.pending.get(item.path);
      if (seen && seen.size === item.file.size && seen.lastModified === item.file.lastModified) {
        r.pending.delete(item.path);
        r.queuedKeys.add(key);
        r.queue.push({ ...item, key });
      } else {
        r.pending.set(item.path, { size: item.file.size, lastModified: item.file.lastModified });
      }
    }
    r.baseline = false;
    if (r.skipKeys.size !== r.savedSkipCount) {
      saveSkipped(r.eventId, r.skipKeys);
      r.savedSkipCount = r.skipKeys.size;
    }
    sync(r);
  };

  const sendBatch = async (r, batch) => {
    try {
      const res = await uploadEventPhotos(r.eventId, batch.map(uploadable), (percent) =>
        sync(r, { progress: Math.min(percent, 99) })
      );
      for (const item of batch) {
        r.uploadedKeys.add(item.key);
        r.queuedKeys.delete(item.key);
        r.inEvent.add(photoKey(item.file.name, item.file.size));
      }
      r.uploadedCount += batch.length;
      saveUploaded(r.eventId, r.uploadedKeys);
      if (run.current === r) onSavedRef.current?.(res.data.event);
      sync(r, { lastUploaded: { name: batch[batch.length - 1].path, at: Date.now() } });
      return null;
    } catch (err) {
      return err;
    }
  };

  const fail = (r, item, err) => {
    r.queuedKeys.delete(item.key);
    r.failedKeys.add(item.key);
    r.failed.push({ ...item, error: apiError(err, "Upload failed") });
  };

  // Re-reads the event's photos from the server and drops queued files that
  // are already there — e.g. uploaded meanwhile by hand, from a phone or the
  // desktop bridge. If the server can't be reached, the upload itself fails
  // and the files go to the failed list for retry.
  const dropAlreadyInEvent = async (r) => {
    try {
      const res = await getEventPhotos(r.eventId);
      for (const p of res.data?.photos || []) r.inEvent.add(photoKey(p.originalName, p.size));
    } catch {
      return;
    }
    const keep = [];
    for (const item of r.queue) {
      if (r.inEvent.has(photoKey(item.file.name, item.file.size))) {
        r.queuedKeys.delete(item.key);
        r.skipKeys.add(item.key);
        r.skippedCount++;
      } else {
        keep.push(item);
      }
    }
    r.queue = keep;
    saveSkipped(r.eventId, r.skipKeys);
    r.savedSkipCount = r.skipKeys.size;
  };

  const drain = async (r) => {
    if (r.queue.length) await dropAlreadyInEvent(r);
    while (r.queue.length && !r.stopped) {
      const [batch] = toBatches(r.queue);
      r.queue.splice(0, batch.length);
      sync(r, { uploading: true, progress: 0 });
      const err = await sendBatch(r, batch);
      if (!err) continue;
      const status = err.response?.status;
      if (status === 401 || status === 404) {
        batch.forEach((item) => fail(r, item, err));
        halt(r);
        sync(r, {
          status: "error",
          uploading: false,
          error: status === 404 ? "This event no longer exists." : "Your session ended — sign in again, then restart.",
        });
        return;
      }
      if (batch.length === 1) {
        fail(r, batch[0], err);
        continue;
      }
      // One photo at a time so a single bad file only fails itself.
      for (const item of batch) {
        const single = await sendBatch(r, [item]);
        if (single) fail(r, item, single);
      }
    }
    sync(r, { uploading: false, progress: 0 });
  };

  const tick = useCallback(async (r) => {
    if (r.stopped || run.current !== r) return;
    try {
      await scan(r);
      await drain(r);
    } catch (err) {
      // The folder was removed, renamed or permission was withdrawn.
      halt(r);
      sync(r, {
        status: "error",
        uploading: false,
        error:
          err?.name === "NotAllowedError" || err?.name === "SecurityError"
            ? "Folder access was withdrawn. Choose the folder again."
            : "The folder can't be read any more (removed or disconnected). Choose it again.",
      });
      return;
    }
    if (!r.stopped) r.timer = setTimeout(() => tick(r), POLL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // What's remembered from a previous session (null if nothing).
  const [remembered, setRemembered] = useState(null);

  // Starts watching `dir` for `event`. A fresh start skips what's in the
  // folder now unless includeExisting (the photographer asked for those
  // photos, so earlier skips are cleared too). A resume uploads anything new
  // since, but still never what was skipped or uploaded before.
  const begin = useCallback(
    async (event, dir, { includeExisting, resuming = false }) => {
      halt(run.current);
      const r = {
        dir,
        eventId: event.id,
        stopped: false,
        timer: null,
        baseline: !includeExisting,
        uploadedKeys: loadUploaded(event.id),
        skipKeys: resuming || !includeExisting ? loadSkipped(event.id) : new Set(),
        savedSkipCount: -1,
        queuedKeys: new Set(),
        failedKeys: new Set(),
        inEvent: new Set((event.photos || []).map((p) => photoKey(p.originalName, p.size))),
        pending: new Map(),
        queue: [],
        failed: [],
        uploadedCount: 0,
        skippedCount: 0,
      };
      run.current = r;
      setRemembered({ eventId: event.id, eventName: event.name, folder: dir.name, active: true });
      r.target = { eventId: event.id, eventName: event.name, handle: dir, active: true };
      saveWatch(r.target);
      // First look at the folder before reporting "Watching", so a photo
      // saved right after Start is never mistaken for one already there.
      // (Photos already in the event are re-checked on the server before
      // every upload — see dropAlreadyInEvent.)
      try {
        await scan(r);
      } catch {
        // Unreadable folder — tick() reports it.
      }
      if (run.current !== r) return;
      setState((prev) => ({
        ...IDLE,
        status: "watching",
        eventId: event.id,
        eventName: event.name,
        folder: dir.name,
        skipped: r.skippedCount,
        waiting: r.pending.size + r.queue.length,
      }));
      tick(r);
    },
    // scan only reads the run object passed in (same as tick below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  // Must be called from a click: the browser shows its folder picker.
  const start = useCallback(
    async (event, { includeExisting = false } = {}) => {
      let dir;
      try {
        dir = await window.showDirectoryPicker({ id: "eventsnap-camera", mode: "read" });
      } catch (err) {
        if (err?.name !== "AbortError") {
          setState((prev) => ({ ...prev, status: "error", error: "Couldn't open that folder." }));
        }
        return;
      }
      begin(event, dir, { includeExisting });
    },
    [begin]
  );

  // Continue with the remembered event + folder (call from a click: the
  // browser may ask to allow folder access again).
  const resume = useCallback(async () => {
    const saved = await loadWatch();
    if (!saved?.handle) return;
    let permission = "denied";
    try {
      permission = await saved.handle.requestPermission({ mode: "read" });
    } catch {}
    if (permission !== "granted") {
      setState((prev) => ({ ...prev, status: "error", error: "Folder access wasn't allowed. Choose the folder again." }));
      return;
    }
    begin({ id: saved.eventId, name: saved.eventName }, saved.handle, { includeExisting: true, resuming: true });
  }, [begin]);

  // After a refresh / reopen: restore the remembered target and, if it was
  // running and the browser still allows the folder, carry on automatically.
  useEffect(() => {
    if (!cameraAutoUploadSupported()) return;
    let cancelled = false;
    loadWatch().then(async (saved) => {
      if (cancelled || !saved?.handle) return;
      setRemembered({ eventId: saved.eventId, eventName: saved.eventName, folder: saved.handle.name, active: saved.active });
      if (!saved.active || run.current) return;
      let permission = "prompt";
      try {
        permission = await saved.handle.queryPermission({ mode: "read" });
      } catch {}
      if (!cancelled && permission === "granted") {
        begin({ id: saved.eventId, name: saved.eventName }, saved.handle, { includeExisting: true, resuming: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [begin]);

  // Pauses; the event + folder stay remembered (Resume continues).
  const stop = useCallback(() => {
    const r = run.current;
    halt(r);
    setState((prev) => (prev.status === "watching" ? { ...prev, status: "stopped", uploading: false } : prev));
    setRemembered((prev) => (prev ? { ...prev, active: false } : prev));
    if (r?.target) saveWatch({ ...r.target, active: false });
  }, []);

  // Re-queue failed photos (only those — uploaded ones are never re-sent).
  const retryFailed = useCallback(() => {
    const r = run.current;
    if (!r || !r.failed.length) return;
    const retry = r.failed.filter((f) => f.error !== "Larger than 25 MB");
    r.failed = r.failed.filter((f) => f.error === "Larger than 25 MB");
    for (const item of retry) {
      r.failedKeys.delete(item.key);
      r.queuedKeys.add(item.key);
      r.queue.push(item);
    }
    sync(r);
    if (r.stopped) {
      r.stopped = false;
      setState((prev) => ({ ...prev, status: "watching", error: "" }));
      tick(r);
    }
  }, [sync, tick]);

  // Clear finished state (e.g. after Stop) to pick another folder/event.
  const reset = useCallback(() => {
    halt(run.current);
    run.current = null;
    setState(IDLE);
    setRemembered(null);
    forgetWatch();
  }, []);

  // Stop on unmount; warn before leaving the page while watching.
  useEffect(() => () => halt(run.current), []);
  useEffect(() => {
    if (state.status !== "watching") return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.status]);

  return { state, remembered, start, resume, stop, retryFailed, reset, supported: cameraAutoUploadSupported() };
}
