"use client";

import { useCallback, useRef, useState } from "react";
import { getEventPhotos, uploadEventPhotos } from "@/api/createEventApi";
import { apiError } from "./mockData";
import { IMAGE_TYPES, MAX_SIZE, loadUploaded, photoKey, saveUploaded, toBatches } from "./useCameraAutoUpload";

// Phone upload for Camera Auto Upload. Phone browsers can't watch the photo
// gallery, so the camera's own app (Camera Connect, SnapBridge, Imaging Edge
// Mobile, …) transfers photos into the phone's gallery over Wi-Fi, Bluetooth
// or USB, and photos reach EventSnap by "Upload new photos" (gallery picker)
// or Android "Share → EventSnap". Either way this uploads only photos not
// uploaded before — same rules as the desktop watcher: a per-event record of
// uploaded files (name + size + modified time) and a name + size check
// against the event's photos on the server.

// The event chosen to receive photos shared to EventSnap from other apps.
const TARGET_KEY = "eventsnap-phone-target-event";
export const getShareTarget = () => {
  try {
    return localStorage.getItem(TARGET_KEY);
  } catch {
    return null;
  }
};
export const setShareTarget = (eventId) => {
  try {
    localStorage.setItem(TARGET_KEY, eventId);
  } catch {}
};

const fileKey = (file) => `${file.name}|${file.size}|${file.lastModified}`;
const imageType = (file) => file.type || IMAGE_TYPES[file.name.split(".").pop().toLowerCase()] || "";
// Some phones give HEIC etc. an empty type; send the extension's type.
const uploadable = (file) =>
  file.type ? file : new File([file], file.name, { type: imageType(file), lastModified: file.lastModified });

const IDLE = {
  busy: false,
  eventId: null,
  eventName: "",
  source: "", // "gallery" | "share"
  total: 0,
  uploaded: 0,
  skipped: 0,
  failed: [], // [{ name, error }]
  progress: 0,
  lastUploaded: null, // { name, at }
  error: "",
};

export function usePhoneUpload({ onSaved }) {
  const [state, setState] = useState(IDLE);
  const failedFiles = useRef([]); // Files to retry
  const running = useRef(false);

  // Uploads the new photos among `files` to `event`. Resolves to
  // { uploaded, skipped, failed, done: Set<File> } — `done` are the files
  // that need no further action (uploaded or already there).
  const upload = useCallback(
    async (event, files, source) => {
      if (running.current) return null;
      running.current = true;
      const result = { uploaded: 0, skipped: 0, failed: 0, done: new Set() };
      const failed = [];
      setState({ ...IDLE, busy: true, eventId: event.id, eventName: event.name, source, total: files.length });
      const sync = (extra = {}) =>
        setState((prev) => ({
          ...prev,
          uploaded: result.uploaded,
          skipped: result.skipped,
          failed: failed.map(({ file, error }) => ({ name: file.name, error })),
          ...extra,
        }));

      try {
        // Fresh list of what the event already has (name + size).
        const res = await getEventPhotos(event.id);
        const inEvent = new Set((res.data?.photos || []).map((p) => photoKey(p.originalName, p.size)));
        const uploadedKeys = loadUploaded(event.id);

        const queue = [];
        for (const file of files) {
          if (!imageType(file).startsWith("image/")) {
            failed.push({ file, error: "Not a photo" });
          } else if (file.size > MAX_SIZE) {
            failed.push({ file, error: "Larger than 25 MB" });
          } else if (uploadedKeys.has(fileKey(file)) || inEvent.has(photoKey(file.name, file.size))) {
            result.skipped++;
            result.done.add(file);
          } else {
            inEvent.add(photoKey(file.name, file.size)); // same photo picked twice
            queue.push({ file });
          }
        }
        sync();

        const send = async (batch) => {
          try {
            const r = await uploadEventPhotos(event.id, batch.map((b) => uploadable(b.file)), (percent) =>
              sync({ progress: Math.min(percent, 99) })
            );
            for (const b of batch) {
              uploadedKeys.add(fileKey(b.file));
              result.done.add(b.file);
            }
            result.uploaded += batch.length;
            saveUploaded(event.id, uploadedKeys);
            onSaved?.(r.data.event);
            sync({ lastUploaded: { name: batch[batch.length - 1].file.name, at: Date.now() } });
            return null;
          } catch (err) {
            return err;
          }
        };

        let stopped = false;
        for (const batch of toBatches(queue)) {
          if (stopped) {
            batch.forEach((b) => failed.push({ file: b.file, error: "Not uploaded" }));
            continue;
          }
          const err = await send(batch);
          if (!err) continue;
          const status = err.response?.status;
          if (status === 401 || status === 404) {
            batch.forEach((b) => failed.push({ file: b.file, error: apiError(err, "Upload failed") }));
            setState((prev) => ({
              ...prev,
              error: status === 404 ? "This event no longer exists." : "Your session ended — sign in again.",
            }));
            stopped = true;
            continue;
          }
          // One at a time so a single bad file only fails itself.
          for (const b of batch) {
            const single = batch.length > 1 ? await send([b]) : err;
            if (single) failed.push({ file: b.file, error: apiError(single, "Upload failed") });
          }
        }
      } catch (err) {
        files.filter((f) => !result.done.has(f)).forEach((file) => failed.push({ file, error: apiError(err, "Upload failed") }));
        setState((prev) => ({ ...prev, error: apiError(err, "Couldn't reach EventSnap. Check your connection.") }));
      } finally {
        result.failed = failed.length;
        failedFiles.current = failed.filter((f) => f.error !== "Not a photo" && f.error !== "Larger than 25 MB").map((f) => f.file);
        sync({ busy: false, progress: 0 });
        running.current = false;
      }
      return result;
    },
    [onSaved]
  );

  const retryFailed = useCallback(
    (event) => (failedFiles.current.length ? upload(event, failedFiles.current, state.source) : null),
    [upload, state.source]
  );

  const reset = useCallback(() => {
    if (!running.current) setState(IDLE);
  }, []);

  return { state, upload, retryFailed, reset };
}
