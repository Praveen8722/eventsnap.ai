"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiOutlineCloudUpload,
  HiOutlineFolderOpen,
  HiOutlinePhotograph,
  HiOutlineRefresh,
  HiX,
} from "react-icons/hi";
import { uploadEventPhotos } from "@/api/createEventApi";
import { ModalShell, primaryBtn, secondaryBtn } from "./ModalShell";
import { apiError } from "./mockData";

// Matches the backend's per-file limit (middleware/uploadCreateEvent.js).
const MAX_SIZE_MB = 25;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
// Each request carries at most this many photos / bytes (the backend accepts
// up to 50 photos per request), and batches are sent one after another, so a
// large selection never floods the server.
const BATCH_MAX_FILES = 10;
const BATCH_MAX_BYTES = 40 * 1024 * 1024;

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const fileKey = (file) => `${file.webkitRelativePath || file.name}|${file.size}|${file.lastModified}`;

// Splits items into batches by both count and total size.
const toBatches = (list) => {
  const batches = [];
  let current = [];
  let bytes = 0;
  for (const item of list) {
    if (current.length && (current.length >= BATCH_MAX_FILES || bytes + item.size > BATCH_MAX_BYTES)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += item.size;
  }
  if (current.length) batches.push(current);
  return batches;
};

// ---- Folder drag & drop: walk dropped directories (where the browser
// supports FileSystem entries); otherwise fall back to the plain file list.
const readAllEntries = (reader) =>
  new Promise((resolve, reject) => {
    const all = [];
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });

const entryFiles = async (entry) => {
  if (entry.isFile) return [await new Promise((resolve, reject) => entry.file(resolve, reject))];
  if (entry.isDirectory) {
    const children = await readAllEntries(entry.createReader());
    return (await Promise.all(children.map((c) => entryFiles(c).catch(() => [])))).flat();
  }
  return [];
};

// Must start synchronously inside the drop handler — the DataTransfer items
// are only readable during the event.
const filesFromDrop = (dataTransfer) => {
  const entries = Array.from(dataTransfer.items || [])
    .filter((i) => i.kind === "file")
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean);
  if (!entries.length) return Promise.resolve(Array.from(dataTransfer.files || []));
  return Promise.all(entries.map((e) => entryFiles(e).catch(() => []))).then((lists) => lists.flat());
};

let nextId = 0;

// Bulk photo upload: pick files or a whole folder, or drag & drop either.
// Photos go up in batches; after each successful batch onSaved(event)
// receives the updated event from the server. A failed batch is retried
// photo-by-photo (so one bad file doesn't sink the others) and anything that
// still fails stays here for "Retry failed" — photos already saved are never
// sent again. onDone(count) runs when everything has been uploaded.
export function UploadPhotosModal({ event, onClose, onSaved, onDone }) {
  // item.status: "pending" | "uploading" | "done" | "failed"
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [skipped, setSkipped] = useState(null); // { notImage, tooLarge, duplicate }
  const [fatalError, setFatalError] = useState("");
  const [folderSupported] = useState(
    () => typeof document !== "undefined" && "webkitdirectory" in document.createElement("input")
  );
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const doneTimer = useRef(null);
  // Local preview URLs, revoked when the modal closes.
  const ownedUrls = useRef(new Set());

  useEffect(() => {
    const owned = ownedUrls.current;
    return () => {
      clearTimeout(doneTimer.current);
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const seen = new Set(items.map((i) => i.key));
    const counts = { notImage: 0, tooLarge: 0, duplicate: 0 };
    const next = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) counts.notImage++;
      else if (file.size > MAX_SIZE) counts.tooLarge++;
      else if (seen.has(fileKey(file))) counts.duplicate++;
      else {
        seen.add(fileKey(file));
        const url = URL.createObjectURL(file);
        ownedUrls.current.add(url);
        next.push({
          id: `upload-${nextId++}`,
          key: fileKey(file),
          file,
          name: file.webkitRelativePath || file.name,
          size: file.size,
          url,
          progress: 0,
          status: "pending",
          error: "",
        });
      }
    }
    setSkipped(counts.notImage || counts.tooLarge || counts.duplicate ? counts : null);
    setFatalError("");
    setItems((prev) => [...prev, ...next]);
  };

  const release = (item) => {
    URL.revokeObjectURL(item.url);
    ownedUrls.current.delete(item.url);
  };

  const removeItem = (item) => {
    release(item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const clearAll = () => {
    items.forEach(release);
    setItems([]);
    setSkipped(null);
    setFatalError("");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    filesFromDrop(e.dataTransfer).then(addFiles);
  };

  const patch = (ids, changes) =>
    setItems((prev) => prev.map((i) => (ids.has(i.id) ? { ...i, ...changes } : i)));

  // Sends one request; returns null on success or the axios error.
  const send = async (batch) => {
    const ids = new Set(batch.map((i) => i.id));
    patch(ids, { status: "uploading", progress: 0, error: "" });
    try {
      const res = await uploadEventPhotos(
        event.id,
        batch.map((i) => i.file),
        // Held at 99% until the server confirms the photos are saved.
        (percent) => patch(ids, { progress: Math.min(percent, 99) })
      );
      patch(ids, { status: "done", progress: 100 });
      onSaved(res.data.event);
      return null;
    } catch (err) {
      return err;
    }
  };

  const startUpload = async () => {
    const queue = items.filter((i) => i.status === "pending" || i.status === "failed");
    if (!queue.length || uploading) return;
    const alreadyDone = items.length - queue.length;
    setUploading(true);
    setFatalError("");
    let uploaded = 0;
    let failed = 0;
    let stopped = false;

    for (const batch of toBatches(queue)) {
      if (stopped) {
        patch(new Set(batch.map((i) => i.id)), { status: "failed", progress: 0, error: "Not uploaded" });
        failed += batch.length;
        continue;
      }
      let err = await send(batch);
      if (!err) {
        uploaded += batch.length;
        continue;
      }
      const status = err.response?.status;
      // Event gone / session ended: nothing else can succeed.
      if (status === 401 || status === 404) {
        setFatalError(apiError(err, "This event is no longer available."));
        patch(new Set(batch.map((i) => i.id)), { status: "failed", progress: 0, error: apiError(err, "Upload failed") });
        failed += batch.length;
        stopped = true;
        continue;
      }
      // Retry a multi-photo batch one photo at a time, so a single bad file
      // (or a momentary network error) only fails that photo.
      const retry = batch.length > 1 ? batch : [];
      if (!retry.length) {
        patch(new Set([batch[0].id]), { status: "failed", progress: 0, error: apiError(err, "Upload failed") });
        failed++;
      }
      for (const item of retry) {
        err = await send([item]);
        if (!err) uploaded++;
        else {
          patch(new Set([item.id]), { status: "failed", progress: 0, error: apiError(err, "Upload failed") });
          failed++;
        }
      }
    }

    setUploading(false);
    if (!failed && uploaded) {
      // A short beat so the completed state is visible.
      doneTimer.current = setTimeout(() => onDone(alreadyDone + uploaded), 450);
    }
  };

  const total = items.length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const waitingCount = total - doneCount - failedCount;
  const toUpload = items.filter((i) => i.status === "pending" || i.status === "failed").length;
  const overall = total ? Math.round(items.reduce((s, i) => s + (i.status === "done" ? 100 : i.progress), 0) / total) : 0;

  const uploadLabel = uploading
    ? `Uploading ${doneCount}/${total}…`
    : failedCount && failedCount === toUpload
      ? `Retry ${failedCount} Failed`
      : `Upload ${toUpload || ""} Photo${toUpload === 1 ? "" : "s"}`;

  return (
    <ModalShell
      title="Upload Photos"
      subtitle={event.name}
      size="lg"
      onClose={uploading ? () => {} : onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={uploading} className={secondaryBtn}>
            {doneCount && !uploading ? "Close" : "Cancel"}
          </button>
          <button type="button" onClick={startUpload} disabled={!toUpload || uploading} className={primaryBtn}>
            {failedCount && !uploading ? (
              <HiOutlineRefresh className="text-lg" />
            ) : (
              <HiOutlineCloudUpload className="text-lg" />
            )}
            {uploadLabel}
          </button>
        </>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={uploading}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !uploading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragging
            ? "border-[#6C63FF] bg-[#6C63FF]/5"
            : "border-gray-200 bg-gray-50/60 hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/[0.03]"
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
            dragging ? "bg-[#6C63FF] text-white" : "bg-white text-[#6C63FF] shadow-sm border border-gray-100"
          }`}
        >
          <HiOutlineCloudUpload className="text-3xl" />
        </div>
        <p className="font-semibold text-gray-800">Drag &amp; drop photos{folderSupported ? " or folders" : ""} here</p>
        <p className="text-sm text-gray-500 mt-1">
          or <span className="text-[#6C63FF] font-semibold underline underline-offset-2">browse files</span>
          {folderSupported && (
            <>
              {" · "}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1 text-[#6C63FF] font-semibold underline underline-offset-2"
              >
                <HiOutlineFolderOpen className="no-underline" />
                select a folder
              </button>
            </>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-3">
          JPG, PNG, HEIC or WebP · up to {MAX_SIZE_MB} MB each · select as many as you like
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {folderSupported && (
          <input
            ref={folderInputRef}
            type="file"
            webkitdirectory=""
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        )}
      </div>

      {skipped && (
        <p className="text-xs text-amber-600 mt-3">
          Skipped{" "}
          {[
            skipped.notImage && `${skipped.notImage} non-image file${skipped.notImage === 1 ? "" : "s"}`,
            skipped.tooLarge && `${skipped.tooLarge} over ${MAX_SIZE_MB} MB`,
            skipped.duplicate && `${skipped.duplicate} already added`,
          ]
            .filter(Boolean)
            .join(", ")}
          .
        </p>
      )}

      {fatalError && (
        <p role="alert" className="text-sm text-red-500 mt-3">
          {fatalError}
        </p>
      )}

      {total > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">
                {total} photo{total === 1 ? "" : "s"}
              </span>
              {(doneCount > 0 || failedCount > 0 || uploading) && (
                <>
                  <span className="text-gray-300"> · </span>
                  <span className="text-green-600 font-medium">{doneCount} uploaded</span>
                  {failedCount > 0 && (
                    <>
                      <span className="text-gray-300"> · </span>
                      <span className="text-red-500 font-medium">{failedCount} failed</span>
                    </>
                  )}
                  {waitingCount > 0 && (
                    <>
                      <span className="text-gray-300"> · </span>
                      <span className="text-gray-500">{waitingCount} waiting</span>
                    </>
                  )}
                </>
              )}
            </p>
            {uploading ? (
              <p className="text-sm font-semibold text-[#6C63FF]">{overall}%</p>
            ) : (
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {uploading && (
            <div className="mb-4 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#6C63FF] transition-[width] duration-300" style={{ width: `${overall}%` }} />
            </div>
          )}

          {failedCount > 0 && !uploading && (
            <p className="text-xs text-red-500 mb-3">
              {failedCount} photo{failedCount === 1 ? "" : "s"} couldn&apos;t be uploaded. Photos already uploaded are
              saved — &ldquo;Retry {failedCount} Failed&rdquo; sends only the failed ones.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => {
              const complete = item.status === "done";
              const isFailed = item.status === "failed";
              return (
                <div
                  key={item.id}
                  className={`group relative rounded-xl overflow-hidden border bg-white ${
                    isFailed ? "border-red-200" : "border-gray-200"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    {item.status === "uploading" && <div className="absolute inset-0 bg-black/25" />}
                    {complete && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <HiCheckCircle className="text-4xl text-white drop-shadow" />
                      </div>
                    )}
                    {isFailed && (
                      <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center" title={item.error}>
                        <HiExclamationCircle className="text-4xl text-white drop-shadow" />
                      </div>
                    )}
                    {!uploading && !complete && (
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        aria-label={`Remove ${item.name}`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                      >
                        <HiX className="text-sm" />
                      </button>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-gray-700 truncate" title={item.name}>
                      {item.name}
                    </p>
                    {isFailed ? (
                      <p className="text-[11px] text-red-500 mt-0.5 truncate" title={item.error}>
                        {item.error || "Upload failed"}
                      </p>
                    ) : item.status === "uploading" || complete ? (
                      <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-200 ${complete ? "bg-green-500" : "bg-[#6C63FF]"}`}
                          style={{ width: `${complete ? 100 : item.progress}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatSize(item.size)}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {!uploading && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="aspect-[4/3] sm:aspect-auto min-h-24 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-[#6C63FF] hover:border-[#6C63FF]/50 flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors"
              >
                <HiOutlinePhotograph className="text-2xl" />
                Add more
              </button>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}
