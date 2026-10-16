"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadEventPhotos } from "@/api/createEventApi";
import { apiError } from "./mockData";

// Mobile Camera Auto Upload — photos taken with this phone's own camera go
// straight to an event. Separate from Camera Auto Upload (folder watcher /
// phone gallery picker) and Direct Camera Auto Upload (FTPS).
//
// Browsers can't watch a phone's camera roll, so photos are taken through
// the page (the shutter opens the phone's camera); each one is uploaded
// automatically with the existing upload API. Every photo is first saved in
// this browser (IndexedDB), so it survives a lost signal or a closed page
// and is retried until it's uploaded.

const DB_NAME = "eventsnap-mobile-camera";
const STORE = "pending";
const MAX_SIZE = 25 * 1024 * 1024; // backend per-file limit
const MAX_ATTEMPTS = 3;
const ENABLED_KEY = (eventId) => `eventsnap-mobile-camera:${eventId}`;

export const loadEnabled = (eventId) => {
  try {
    return localStorage.getItem(ENABLED_KEY(eventId)) === "on";
  } catch {
    return false;
  }
};
const saveEnabled = (eventId, on) => {    
  try {
    if (on) localStorage.setItem(ENABLED_KEY(eventId), "on");
    else localStorage.removeItem(ENABLED_KEY(eventId));
  } catch {}
};

// ---- IndexedDB queue (one record per photo waiting to upload) ----
const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("eventId", "eventId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const tx = async (mode, fn) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(result?.result ?? result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
};
const putPending = (record) => tx("readwrite", (s) => s.put(record));
const deletePending = (id) => tx("readwrite", (s) => s.delete(id));
const pendingFor = (eventId) => tx("readonly", (s) => s.index("eventId").getAll(eventId));

// Phones often name camera captures "image.jpg"; give each a readable,
// unique name (bytes are untouched).
const photoName = (file) => {
  const ext = (file.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] || ".jpg").toLowerCase();
  if (file.name && !/^image\.[a-z0-9]+$/i.test(file.name)) return file.name;
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `PHONE_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}${ext}`;
};

const isRetryable = (err) => {
  const status = err?.response?.status;
  return !status || status === 408 || status === 429 || status >= 500;
};

// items: [{ id, name, size, url, status: "waiting"|"uploading"|"done"|"failed", progress, error }]
export function useMobileCameraUpload(eventId, { onUploaded } = {}) {
  const [enabled, setEnabledState] = useState(false);
  const [items, setItemsState] = useState([]);
  // The queue's current value (state is the copy React renders).
  const itemsRef = useRef([]);
  const setItems = useCallback((next) => {
    itemsRef.current = typeof next === "function" ? next(itemsRef.current) : next;
    setItemsState(itemsRef.current);
  }, []);
  const [fatal, setFatal] = useState(""); // session ended / event gone — uploads paused
  const [online, setOnline] = useState(true);
  const files = useRef(new Map()); // id → Blob
  const running = useRef(false);
  const enabledRef = useRef(false);
  const uploadedRef = useRef(onUploaded);
  const urls = useRef(new Set());

  useEffect(() => {
    uploadedRef.current = onUploaded;
  }, [onUploaded]);

  const patch = useCallback(
    (id, changes) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i))),
    [setItems]
  );
  const preview = (blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  };

  // Uploads waiting photos one at a time, oldest first.
  const drain = useCallback(async () => {
    if (running.current || !enabledRef.current) return;
    running.current = true;
    try {
      for (;;) {
        if (!enabledRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) break;
        const item = itemsRef.current.find((i) => i.status === "waiting");
        if (!item) break;
        const blob = files.current.get(item.id);
        if (!blob) {
          patch(item.id, { status: "failed", error: "Photo data is missing" });
          continue;
        }
        patch(item.id, { status: "uploading", progress: 0, error: "" });
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const file = new File([blob], item.name, { type: blob.type || "image/jpeg", lastModified: item.createdAt });
            const res = await uploadEventPhotos(eventId, [file], (percent) => patch(item.id, { progress: Math.min(percent, 99) }));
            lastError = null;
            await deletePending(item.id).catch(() => {});
            files.current.delete(item.id);
            patch(item.id, { status: "done", progress: 100 });
            uploadedRef.current?.(res.data?.event);
            break;
          } catch (err) {
            lastError = err;
            const status = err?.response?.status;
            if (status === 401 || status === 404) break;
            if (!isRetryable(err) || attempt === MAX_ATTEMPTS) break;
            await new Promise((r) => setTimeout(r, attempt * 1500));
          }
        }
        if (lastError) {
          const status = lastError?.response?.status;
          if (status === 401 || status === 404) {
            patch(item.id, { status: "waiting", progress: 0 });
            setFatal(status === 404 ? "This event no longer exists." : "Your session ended — sign in again to continue uploading.");
            enabledRef.current = false;
            setEnabledState(false);
            break;
          }
          patch(item.id, {
            status: "failed",
            progress: 0,
            error: navigator.onLine ? apiError(lastError, "Upload failed") : "No internet — will retry when back online",
          });
        }
      }
    } finally {
      running.current = false;
    }
  }, [eventId, patch]);

  // Load this event's setting and any photos still waiting from earlier.
  useEffect(() => {
    let active = true;
    const on = loadEnabled(eventId);
    enabledRef.current = on;
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    pendingFor(eventId)
      .then((records) => {
        if (!active) return;
        files.current = new Map(records.map((r) => [r.id, r.blob]));
        setItems(
          records
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((r) => ({ id: r.id, name: r.name, size: r.blob.size, url: preview(r.blob), createdAt: r.createdAt, status: "waiting", progress: 0, error: "" }))
        );
        setEnabledState(on);
        if (on) setTimeout(drain, 0);
      })
      .catch(() => active && setEnabledState(on));
    const owned = urls.current;
    return () => {
      active = false;
      owned.forEach((u) => URL.revokeObjectURL(u));
      owned.clear();
    };
  }, [eventId, drain, setItems]);

  // Back online → retry what failed for lack of signal.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setItems((prev) => prev.map((i) => (i.status === "failed" ? { ...i, status: "waiting", error: "" } : i)));
      setTimeout(drain, 0);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [drain, setItems]);

  // Keep the screen awake while it's on (where supported), so the page —
  // and its uploads — aren't suspended mid-shoot.
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.wakeLock) return;
    let lock = null;
    let cancelled = false;
    const acquire = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (cancelled) l.release();
          else lock = l;
        })
        .catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [enabled]);

  const setEnabled = useCallback(
    (on) => {
      saveEnabled(eventId, on);
      enabledRef.current = on;
      setEnabledState(on);
      if (on) {
        setFatal("");
        setTimeout(drain, 0);
      }
    },
    [eventId, drain]
  );

  // A photo just taken: saved in the browser first, then uploaded.
  const addPhotos = useCallback(
    async (fileList) => {
      const added = [];
      const rejected = [];
      for (const file of Array.from(fileList || [])) {
        if (!file.type.startsWith("image/")) {
          rejected.push(`${file.name || "File"} isn't a photo`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          rejected.push(`${file.name || "Photo"} is larger than 25 MB`);
          continue;
        }
        const record = { id: crypto.randomUUID(), eventId, name: photoName(file), blob: file, createdAt: Date.now() };
        try {
          await putPending(record);
        } catch {
          // Storage full / private mode: still upload, just not crash-safe.
        }
        files.current.set(record.id, file);
        added.push({ id: record.id, name: record.name, size: file.size, url: preview(file), createdAt: record.createdAt, status: "waiting", progress: 0, error: "" });
      }
      if (added.length) {
        setItems((prev) => [...prev, ...added]);
        setTimeout(drain, 0);
      }
      return rejected;
    },
    [eventId, drain, setItems]
  );

  const retryFailed = useCallback(() => {
    setFatal("");
    setItems((prev) => prev.map((i) => (i.status === "failed" ? { ...i, status: "waiting", error: "" } : i)));
    setTimeout(drain, 0);
  }, [drain, setItems]);

  // Removes finished photos from the list (they're already in the gallery).
  const clearDone = useCallback(() => setItems((prev) => prev.filter((i) => i.status !== "done")), [setItems]);

  const counts = items.reduce(
    (c, i) => ({ ...c, [i.status]: (c[i.status] || 0) + 1 }),
    { waiting: 0, uploading: 0, done: 0, failed: 0 }
  );
  const current = items.find((i) => i.status === "uploading") || null;

  return { enabled, setEnabled, items, counts, current, online, fatal, addPhotos, retryFailed, clearDone };
}
