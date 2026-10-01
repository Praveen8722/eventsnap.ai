"use client";

import { useState, useRef } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { usePortfolioDataStore } from './portfolioStore';
import {
  addPortfolioGalleryPhotos,
  deletePortfolioGalleryPhoto,
  portfolioAssetUrl,
} from '@/api/portfolioApi';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// The four portfolio gallery categories (same as the public portfolio) and the
// per-category photo cap. Enforced here and on the backend
// (portfolioController.addPortfolioGalleryPhotos).
const CATEGORIES = ['Wedding', 'Portrait', 'Corporate', 'Events'];
const MAX_PER_CATEGORY = 3;

// Photos uploaded through this page are stored on the server (in MongoDB)
// and come back with a "/api/portfolio/photos/<id>" path (older ones:
// "/uploads/portfolio/..."). A seeded starter-content image is just an
// Unsplash id instead.
const isServerUpload = (img) =>
  typeof img.url === 'string' &&
  (img.url.startsWith('/api/portfolio/photos/') || img.url.startsWith('/uploads/portfolio/'));

// The resolved <img src> for a gallery item, whatever its source: a
// server-stored upload, a legacy base64 upload (from before this photo
// storage was moved server-side), or a seeded Unsplash id.
const galleryThumbSrc = (img) => {
  if (img.isLocal) return img.url;
  if (isServerUpload(img)) return portfolioAssetUrl(img.url);
  return `https://images.unsplash.com/${img.url}?w=300&h=300&fit=crop&auto=format`;
};

export function GalleryManagement() {
  const { data, setData, scheduleSave } = usePortfolioDataStore();
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('All');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const gallery = data.gallery;
  // Fixed category tabs (same as the public portfolio) so every category is
  // available even when empty; a limit of MAX_PER_CATEGORY applies to each.
  const cats = ['All', ...CATEGORIES];
  const filtered = filter === 'All' ? gallery : gallery.filter(g => g.category === filter);
  const countIn = (cat) => gallery.filter((g) => g.category === cat).length;

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  // Photos are added into the selected category (not "All"), capped at
  // MAX_PER_CATEGORY. The backend enforces the same cap.
  const openPicker = () => {
    if (filter === 'All') {
      alert('Select a category (Wedding, Portrait, Corporate, or Events) before adding photos.');
      return;
    }
    if (countIn(filter) >= MAX_PER_CATEGORY) {
      alert(`${filter} already has the maximum of ${MAX_PER_CATEGORY} photos. Delete one to add another.`);
      return;
    }
    inputRef.current?.click();
  };

  // Upload each chosen file to the backend, which stores it in MongoDB and
  // returns the updated portfolio.
  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith('image/') && f.size <= MAX_UPLOAD_BYTES,
    );
    e.target.value = '';
    if (!picked.length) return;

    // Enforce the per-category cap client-side (the backend enforces it too).
    if (filter === 'All') {
      alert('Select a category before adding photos.');
      return;
    }
    const remaining = MAX_PER_CATEGORY - countIn(filter);
    if (remaining <= 0) {
      alert(`${filter} already has the maximum of ${MAX_PER_CATEGORY} photos.`);
      return;
    }
    const toUpload = picked.slice(0, remaining);
    if (picked.length > remaining) {
      alert(`${filter} can hold ${MAX_PER_CATEGORY} photos — only ${remaining} more added.`);
    }

    setUploading(true);
    try {
      const formData = new FormData();
      toUpload.forEach((file) => formData.append('photos', file));
      formData.append('category', filter);
      const res = await addPortfolioGalleryPhotos(formData);
      if (res.data?.portfolio) setData(res.data.portfolio);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  };

  const removeUpload = async (img) => {
    setSelected((s) => s.filter((x) => x !== img.id));
    // Legacy base64 upload — nothing stored server-side; drop it via a save.
    if (img.isLocal) {
      scheduleSave((prev) => ({ ...prev, gallery: prev.gallery.filter((g) => g.id !== img.id) }));
      return;
    }
    // Server-stored uploads and seeded (Unsplash) items both go through the
    // delete endpoint: it removes the reference and, for a stored upload,
    // deletes its GridFS file (a seeded item has no stored file to remove).
    // Deleting is also how a category makes room under the per-category cap.
    try {
      const res = await deletePortfolioGalleryPhoto(img.id);
      if (res.data?.portfolio) setData(res.data.portfolio);
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete photo');
    }
  };

  return (
    <div className="space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">Gallery</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage the photos displayed in your public portfolio</p>
        </div>
        <button
          onClick={openPicker}
          disabled={uploading}
          className="flex items-center gap-2 bg-[#6C63FF] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#5B52EE] transition-colors disabled:opacity-60"
        >
          <Plus size={16} />
          {uploading ? 'Uploading…' : 'Upload Photos'}
        </button>
      </div>

      {/* Filters + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-wrap items-center bg-gray-100 rounded-lg p-1 gap-1">
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === c ? 'bg-white shadow-sm text-[#6C63FF]' : 'text-gray-500'}`}>{c}</button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">{selected.length} selected</span>
            <button className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 size={14} />Delete
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* Upload card */}
        <div onClick={openPicker} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-[#6C63FF] transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer bg-gray-50 hover:bg-[#EEF0FF]/30">
          <Plus size={24} className="text-gray-400" />
          <span className="text-xs text-gray-400">Add Photo</span>
        </div>
        {filtered.map(img => {
          const isSelected = selected.includes(img.id);
          // Every gallery photo can be deleted (to manage the category / its
          // per-category limit); the handler cleans up GridFS for stored ones.
          const removable = true;
          return (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => toggle(img.id)}>
              <img
                src={galleryThumbSrc(img)}
                alt={img.caption}
                className="w-full h-full object-cover"
              />
              <div className={`absolute inset-0 transition-all ${isSelected ? 'bg-[#6C63FF]/40' : 'bg-black/0 group-hover:bg-black/30'}`} />
              <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#6C63FF] border-[#6C63FF]' : 'border-white/70 bg-black/20 opacity-0 group-hover:opacity-100'}`}>
                {isSelected && <Check size={11} className="text-white" />}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-medium">{img.category}</span>
              </div>
              {removable && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeUpload(img); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                >
                  <Trash2 size={11} className="text-white" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">{gallery.length} photos · Supports JPEG, PNG, WEBP up to 20MB each</p>
    </div>
  );
}
