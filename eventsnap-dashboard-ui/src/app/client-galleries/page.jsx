"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { IoMdAdd } from "react-icons/io";
import { GoImage } from "react-icons/go";
import { HiMiniArrowUpTray, HiMiniArrowDownTray } from "react-icons/hi2";
import { LuEye, LuUpload } from "react-icons/lu";
import { FiEye, FiDownload, FiShare2, FiTrash2 } from "react-icons/fi";
import {
  getGalleries,
  addGalleryPhotos,
  deleteGallery,
  galleryAssetUrl,
} from "@/api/galleryApi";
import { isLoggedIn } from "@/lib/session";

const Model = dynamic(() => import("@/components/ui/Model"));

const shareUrlFor = (slug) => {
  if (!slug) return "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/g/${slug}`;
};

export default function ClientGalleriesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  const fetchGalleries = useCallback(async () => {
    try {
      const res = await getGalleries();
      setGalleries(res.data?.galleries ?? []);
    } catch (error) {
      console.error("Failed to load galleries", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    fetchGalleries();
    const sync = () => fetchGalleries();
    window.addEventListener("eventsnap-gallery-updated", sync);
    return () => window.removeEventListener("eventsnap-gallery-updated", sync);
  }, [authChecked, fetchGalleries]);

  // ── Stat cards, from real data ────────────────────────────────────────────
  const totalGalleries = galleries.length;
  const totalPhotos = galleries.reduce((sum, g) => sum + (g.photos?.length || 0), 0);
  const totalViews = galleries.reduce((sum, g) => sum + (g.views || 0), 0);
  const totalDownloads = galleries.reduce((sum, g) => sum + (g.downloads || 0), 0);

  const handleCopy = async (gallery) => {
    const url = shareUrlFor(gallery.shareSlug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(gallery._id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      window.prompt("Copy this share link", url);
    }
  };

  const handleView = (gallery) => {
    const url = shareUrlFor(gallery.shareSlug);
    if (url) window.open(url, "_blank", "noopener");
  };

  const handleAddPhotos = async (gallery, e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setUploadingId(gallery._id);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      await addGalleryPhotos(gallery._id, formData);
      window.dispatchEvent(new CustomEvent("eventsnap-gallery-updated"));
      await fetchGalleries();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to upload photos");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (gallery) => {
    if (
      !window.confirm(
        `Delete "${gallery.title}"? This removes the gallery and its ${gallery.photos?.length || 0} photo(s).`
      )
    ) {
      return;
    }
    try {
      await deleteGallery(gallery._id);
      await fetchGalleries();
    } catch (error) {
      alert(error?.response?.data?.message || "Failed to delete gallery");
    }
  };

  if (!authChecked) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mt-2 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Client Galleries</h1>
          <p className="text-gray-500 text-sm mt-2">
            Upload and share photos with your clients
          </p>
        </div>
        <div className="flex  gap-2">
          <button
            onClick={() => setOpenModal(true)}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold bg-[#6C63FF] flex items-center gap-2"
          >
            <IoMdAdd className="text-xl" />
            Create Gallery
          </button>
          {openModal && (
            <Model
              type="gallery"
              onClose={() => setOpenModal(false)}
              onSaved={fetchGalleries}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        <div className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Galleries
            <div className="w-12 h-12 bg-[#5a52e0] rounded-xl flex items-center justify-center">
              <GoImage className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{totalGalleries}</h2>
        </div>

        <div className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Photos
            <div className="w-12 h-12 rounded-xl bg-[#3A7BFF] flex items-center justify-center">
              <HiMiniArrowUpTray className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{totalPhotos}</h2>
        </div>

        <div className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Views
            <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center">
              <LuEye className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{totalViews}</h2>
        </div>

        <div className="p-4 border-2 border-gray-200 rounded-xl cursor-pointer dashboard-card">
          <h5 className="flex justify-between font-semibold text-gray-700">
            Total Downloads
            <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center">
              <HiMiniArrowDownTray className="text-white text-3xl" />
            </div>
          </h5>
          <h2 className="text-xl font-bold mb-3">{totalDownloads}</h2>
        </div>
      </div>

      {!loading && galleries.length === 0 && (
        <div className="mt-8 border-2 border-dashed border-gray-200 rounded-2xl py-16 flex flex-col items-center text-center cursor-pointer dashboard-card">
          <GoImage className="text-gray-300 text-5xl mb-3" />
          <p className="text-gray-600 font-medium">No galleries yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Create a gallery to upload and share photos with your clients.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
        {galleries.map((item) => {
          const cover = galleryAssetUrl(item.photos?.[0]?.url);
          const link = shareUrlFor(item.shareSlug);
          return (
            <div
              key={item._id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer dashboard-card"
            >
              <div className="relative">
                <div className="h-72 w-full bg-linear-to-br from-purple-500 to-orange-400 flex items-center justify-center">
                  {cover ? (
                    <img src={cover} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <GoImage className="text-white text-5xl" />
                  )}
                </div>
                <span className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 text-xs rounded-full">
                  {item.photos?.length || 0} photos
                </span>
                <button
                  onClick={() => handleDelete(item)}
                  title="Delete gallery"
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition"
                >
                  <FiTrash2 className="text-sm" />
                </button>
              </div>

              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-800">{item.title}</h2>
                <p className="text-sm text-gray-500 mb-3">
                  {item.clientName || item.eventType || "Client Gallery"}
                  {item.bookingId ? ` · ${item.bookingId}` : ""}
                </p>

                <div className="flex items-center gap-6 text-sm mb-3 text-gray-600">
                  <span className="flex items-center gap-1">
                    <FiEye /> {item.views || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <FiDownload /> {item.downloads || 0} downloads
                  </span>
                </div>

                {item.watermark && (
                  <p className="text-green-600 text-sm flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Watermark enabled
                  </p>
                )}

                <label
                  className={`mt-3 w-full border border-[#6C63FF] text-[#6C63FF] rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer ${
                    uploadingId === item._id ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  <LuUpload />
                  {uploadingId === item._id ? "Uploading…" : "Upload Photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => handleAddPhotos(item, e)}
                  />
                </label>

                <div className="flex justify-between items-center gap-2">
                  <button
                    onClick={() => handleCopy(item)}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 mt-3"
                  >
                    <FiShare2 />
                    {copiedId === item._id ? "Copied!" : "Share"}
                  </button>
                  <button
                    onClick={() => handleView(item)}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 mt-3"
                  >
                    <LuEye />
                    View
                  </button>
                </div>

                <div className="mt-3">
                  <label className="text-xs text-gray-500">Share Link</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={link}
                      readOnly
                      className="flex-1 mt-1 border border-gray-300 rounded-lg p-2 text-sm text-gray-700 outline-none"
                    />
                    <button
                      onClick={() => handleCopy(item)}
                      className="text-indigo-600 font-medium text-sm hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
