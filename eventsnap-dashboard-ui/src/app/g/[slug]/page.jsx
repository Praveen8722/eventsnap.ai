"use client";
import React, { use, useState, useEffect, useCallback } from "react";
import { GoImage } from "react-icons/go";
import { FiDownload, FiTrash2, FiCheckSquare, FiCheck } from "react-icons/fi";
import {
  getSharedGallery,
  trackGalleryDownload,
  deleteGalleryPhoto,
  deleteGalleryPhotos,
  galleryAssetUrl,
} from "@/api/galleryApi";

const downloadBlob = async (url, name) => {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name || "photo.jpg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
};

export default function PublicGalleryPage({ params }) {
  const { slug } = use(params);
  const [gallery, setGallery] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [downloading, setDownloading] = useState(false);
  const [counted, setCounted] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // Multi-select for bulk delete.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    getSharedGallery(slug)
      .then((res) => {
        if (!active) return;
        setGallery(res.data?.gallery ?? null);
        setStatus(res.data?.gallery ? "ready" : "error");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [slug]);

  const countDownloadOnce = useCallback(async () => {
    if (counted) return;
    setCounted(true);
    try {
      await trackGalleryDownload(slug);
    } catch {
      /* non-blocking */
    }
  }, [counted, slug]);

  const handleDownloadOne = async (photo, index) => {
    try {
      await downloadBlob(
        galleryAssetUrl(photo.url),
        photo.originalName || `photo-${index + 1}.jpg`
      );
      await countDownloadOnce();
    } catch {
      window.open(galleryAssetUrl(photo.url), "_blank", "noopener");
    }
  };

  const handleDeletePhoto = async (photo, index) => {
    if (!gallery?._id || !photo?._id || deletingId) return;
    if (
      !window.confirm(
        `Delete photo ${index + 1}? It will be permanently removed from the gallery and storage.`
      )
    ) {
      return;
    }
    setDeletingId(photo._id);
    try {
      const res = await deleteGalleryPhoto(gallery._id, photo._id);
      if (res.data?.gallery) setGallery(res.data.gallery);
      setSelectedIds((prev) => prev.filter((id) => id !== photo._id));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete photo");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Multi-select ─────────────────────────────────────────────────────────
  const toggleSelectMode = () => {
    setSelectMode((on) => !on);
    setSelectedIds([]);
  };

  const toggleSelected = (photoId) => {
    setSelectedIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId]
    );
  };

  const allSelected =
    (gallery?.photos?.length || 0) > 0 &&
    selectedIds.length === gallery.photos.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : gallery.photos.map((p) => p._id));
  };

  const handleDeleteSelected = async () => {
    if (!gallery?._id || !selectedIds.length || bulkDeleting) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected photo(s)? They will be permanently removed from the gallery and storage.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    try {
      const res = await deleteGalleryPhotos(gallery._id, selectedIds);
      if (res.data?.gallery) setGallery(res.data.gallery);
      setSelectedIds([]);
      setSelectMode(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
      }
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete photos");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!gallery?.photos?.length) return;
    setDownloading(true);
    try {
      for (let i = 0; i < gallery.photos.length; i++) {
        const p = gallery.photos[i];
        // eslint-disable-next-line no-await-in-loop
        await downloadBlob(
          galleryAssetUrl(p.url),
          p.originalName || `photo-${i + 1}.jpg`
        );
      }
      await countDownloadOnce();
    } finally {
      setDownloading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading gallery…
      </div>
    );
  }

  if (status === "error" || !gallery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <GoImage className="text-gray-300 text-5xl mb-3" />
        <p className="text-gray-700 font-semibold">Gallery not found</p>
        <p className="text-gray-400 text-sm mt-1">
          This share link is invalid or the gallery was removed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {gallery.title}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {gallery.clientName || gallery.eventType || "Client Gallery"} ·{" "}
              {gallery.photos.length} photo
              {gallery.photos.length === 1 ? "" : "s"}
              {gallery.watermark ? " · Watermarked" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectMode && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium"
                >
                  {allSelected ? "Clear all" : "Select all"}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.length === 0 || bulkDeleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <FiTrash2 />
                  {bulkDeleting
                    ? "Deleting…"
                    : `Delete Selected${
                        selectedIds.length ? ` (${selectedIds.length})` : ""
                      }`}
                </button>
              </>
            )}
            {gallery.photos.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <FiCheckSquare />
                {selectMode ? "Cancel" : "Select Photos"}
              </button>
            )}
            <button
              onClick={handleDownloadAll}
              disabled={downloading || gallery.photos.length === 0}
              className="bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              <FiDownload />
              {downloading ? "Downloading…" : "Download all"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {gallery.photos.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-2xl py-16 flex flex-col items-center text-center">
            <GoImage className="text-gray-300 text-5xl mb-3" />
            <p className="text-gray-600 font-medium">No photos yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Photos will appear here once the photographer uploads them.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.photos.map((photo, index) => {
            const selected = selectedIds.includes(photo._id);
            return (
              <div
                key={photo._id || index}
                onClick={
                  selectMode ? () => toggleSelected(photo._id) : undefined
                }
                className={`group relative rounded-xl overflow-hidden border bg-white transition ${
                  selectMode ? "cursor-pointer" : ""
                } ${
                  selected
                    ? "border-[#6C63FF] ring-2 ring-[#6C63FF]"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={galleryAssetUrl(photo.url)}
                  alt={photo.originalName || `Photo ${index + 1}`}
                  className={`w-full h-48 object-cover transition ${
                    selected ? "opacity-80" : ""
                  }`}
                  loading="lazy"
                />

                {selectMode && (
                  <span
                    className={`absolute top-2 left-2 w-6 h-6 rounded-md border flex items-center justify-center ${
                      selected
                        ? "bg-[#6C63FF] border-[#6C63FF] text-white"
                        : "bg-white/80 border-gray-300 text-transparent"
                    }`}
                  >
                    <FiCheck className="text-sm" />
                  </span>
                )}

                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadOne(photo, index);
                    }}
                    title="Download photo"
                    className="w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center"
                  >
                    <FiDownload className="text-sm" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo, index);
                    }}
                    disabled={deletingId === photo._id}
                    title="Delete photo"
                    className="w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
