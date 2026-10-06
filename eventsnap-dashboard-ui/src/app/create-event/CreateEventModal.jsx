"use client";

import { useEffect, useRef, useState } from "react";
import {
  HiOutlineCalendar,
  HiOutlineCamera,
  HiOutlineLocationMarker,
  HiOutlineQrcode,
  HiOutlineSparkles,
  HiOutlineSwitchHorizontal,
  HiOutlineTrash,
} from "react-icons/hi";
import { ModalShell, primaryBtn, secondaryBtn } from "./ModalShell";
import { MAX_COVER_MB, useCoverPicker, validCoverFile } from "./CoverPhoto";
import { DEFAULT_SETTINGS, DOWNLOAD_OPTIONS, GUEST_FEATURES } from "./mockData";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition";

// Also used by the Guest Access panel in the event gallery.
export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40 disabled:opacity-50 ${
        checked ? "bg-[#6C63FF]" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionTitle({ children, hint }) {
  return (
    <div className="mb-2.5">
      <h3 className="text-sm font-semibold text-gray-700">{children}</h3>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function CreateEventModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [touched, setTouched] = useState(false);
  // { file, url } — the chosen cover File and its local preview URL.
  const [cover, setCover] = useState(null);
  const [coverDragging, setCoverDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // The preview URL is revoked on change/remove and when the form closes
  // (the saved event shows the uploaded copy from the server).
  const previewUrl = useRef(null);
  useEffect(() => () => previewUrl.current && URL.revokeObjectURL(previewUrl.current), []);
  const replaceCover = (file) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setCover(file ? { file, url: previewUrl.current } : null);
  };
  const coverPicker = useCoverPicker(replaceCover);

  const set = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const download = DOWNLOAD_OPTIONS.find((o) => o.value === settings.download);

  const nameError = touched && !name.trim() ? "Event name is required" : "";
  const dateError = touched && !date ? "Event date is required" : "";
  const priceError =
    touched && settings.download === "paid" && !(Number(settings.pricePerPhoto) > 0) ? "Enter a price per photo" : "";
  const instagramError =
    touched && settings.instagramFollow && !settings.instagramHandle.trim() ? "Enter your Instagram handle" : "";

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setTouched(true);
    if (!name.trim() || !date) return;
    if (settings.download === "paid" && !(Number(settings.pricePerPhoto) > 0)) return;
    if (settings.instagramFollow && !settings.instagramHandle.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await onCreate({
        coverFile: cover?.file || null,
        name: name.trim(),
        date,
        location: location.trim(),
        settings: {
          ...settings,
          instagramHandle: settings.instagramHandle.trim().replace(/^@/, ""),
        },
      });
    } catch (error) {
      setSubmitError(error?.message || "Couldn't create the event. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Create Event"
      subtitle="A shareable QR code is generated automatically."
      size="lg"
      onClose={submitting ? () => {} : onClose}
      footer={
        <>
          {submitError && (
            <p role="alert" className="text-sm text-red-500 sm:mr-auto sm:self-center">
              {submitError}
            </p>
          )}
          <button type="button" onClick={onClose} disabled={submitting} className={secondaryBtn}>
            Cancel
          </button>
          <button type="submit" form="create-event-form" disabled={submitting} className={primaryBtn}>
            <HiOutlineSparkles className="text-lg" />
            {submitting ? "Creating…" : "Create Event"}
          </button>
        </>
      }
    >
      <form id="create-event-form" onSubmit={submit} noValidate className="space-y-6">
        {/* Cover photo */}
        <div>
          <SectionTitle hint="Shown on the event card and at the top of the guest gallery.">
            Cover Photo <span className="font-normal text-gray-400">(optional)</span>
          </SectionTitle>
          {coverPicker.input}
          {cover ? (
            <div className="group relative aspect-[16/7] rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover.url} alt="Cover preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  type="button"
                  onClick={coverPicker.open}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-800 shadow hover:bg-white transition-colors"
                >
                  <HiOutlineSwitchHorizontal className="text-sm" />
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => replaceCover(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-500 shadow hover:bg-white transition-colors"
                >
                  <HiOutlineTrash className="text-sm" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={coverPicker.open}
              onDragOver={(e) => {
                e.preventDefault();
                setCoverDragging(true);
              }}
              onDragLeave={() => setCoverDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setCoverDragging(false);
                const file = validCoverFile(e.dataTransfer.files?.[0]);
                if (file) replaceCover(file);
              }}
              className={`w-full aspect-[16/7] flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed px-4 transition-colors ${
                coverDragging
                  ? "border-[#6C63FF] bg-[#6C63FF]/5"
                  : "border-gray-200 bg-gray-50/60 hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/[0.03]"
              }`}
            >
              <span className="w-11 h-11 rounded-xl bg-white text-[#6C63FF] shadow-sm border border-gray-100 flex items-center justify-center mb-2">
                <HiOutlineCamera className="text-2xl" />
              </span>
              <span className="text-sm font-semibold text-gray-800">Add a cover photo</span>
              <span className="text-xs text-gray-500 mt-0.5">
                Drag &amp; drop or <span className="text-[#6C63FF] font-semibold">browse</span> · up to {MAX_COVER_MB} MB
              </span>
            </button>
          )}
        </div>

        {/* Event details */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ps-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Couple / Event Name <span className="text-[#FF5555]">*</span>
              </label>
              <div className="relative">
                <HiOutlineSparkles className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  id="ps-name"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul & Priya Wedding"
                  className={`${inputClass} ${nameError ? "border-red-300" : ""}`}
                />
              </div>
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>

            <div>
              <label htmlFor="ps-date" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Event Date <span className="text-[#FF5555]">*</span>
              </label>
              <div className="relative">
                <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                <input
                  id="ps-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${inputClass} ${dateError ? "border-red-300" : ""}`}
                />
              </div>
              {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="ps-location" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Event Location <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <HiOutlineLocationMarker className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                id="ps-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Venue or city"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Photo download */}
        <div className="pt-5 border-t border-gray-100">
          <SectionTitle>Photo Download</SectionTitle>
          <div role="radiogroup" aria-label="Photo download" className="grid grid-cols-3 gap-2">
            {DOWNLOAD_OPTIONS.map((option) => {
              const active = settings.download === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set("download", option.value)}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-[#6C63FF] bg-[#6C63FF]/5 text-[#6C63FF]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      active ? "border-[#6C63FF]" : "border-gray-300"
                    }`}
                  >
                    {active && <span className="w-2 h-2 rounded-full bg-[#6C63FF]" />}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className={`text-xs mt-2 ${download.tone}`}>{download.hint}</p>

          {settings.download === "paid" && (
            <div className="mt-3 sm:max-w-xs">
              <label htmlFor="ps-price" className="block text-xs font-semibold text-gray-600 mb-1.5">
                Price per photo
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
                <input
                  id="ps-price"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={settings.pricePerPhoto}
                  onChange={(e) => set("pricePerPhoto", e.target.value)}
                  placeholder="e.g. 49"
                  className={`${inputClass} !pl-8 ${priceError ? "border-red-300" : ""}`}
                />
              </div>
              {priceError && <p className="text-xs text-red-500 mt-1">{priceError}</p>}
            </div>
          )}
        </div>

        {/* Guest access */}
        <div className="pt-5 border-t border-gray-100">
          <SectionTitle hint="Control what guests can do in the public gallery.">Guest Access</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GUEST_FEATURES.map(({ key, label, description, icon: Icon, iconClass }) => {
              const on = settings[key];
              return (
                <div
                  key={key}
                  onClick={() => set(key, !on)}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer select-none transition-colors ${
                    on ? "border-[#6C63FF]/40 bg-[#6C63FF]/[0.04]" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${iconClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500 leading-snug">{description}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Toggle checked={on} onChange={(v) => set(key, v)} label={label} />
                  </div>
                </div>
              );
            })}
          </div>

          {settings.instagramFollow && (
            <div className="mt-3 sm:max-w-xs">
              <label htmlFor="ps-instagram" className="block text-xs font-semibold text-gray-600 mb-1.5">
                Instagram handle guests must follow
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">@</span>
                <input
                  id="ps-instagram"
                  value={settings.instagramHandle}
                  onChange={(e) => set("instagramHandle", e.target.value)}
                  placeholder="yourstudio"
                  className={`${inputClass} !pl-8 ${instagramError ? "border-red-300" : ""}`}
                />
              </div>
              {instagramError && <p className="text-xs text-red-500 mt-1">{instagramError}</p>}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-[#6C63FF]/5 border border-[#6C63FF]/15 p-4">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-[#6C63FF] text-white flex items-center justify-center">
            <HiOutlineQrcode className="text-lg" />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="block text-sm font-semibold text-[#6C63FF] mb-0.5">QR code included</span>
            Guests scan it to open the event&apos;s public gallery, with the access settings above.
          </p>
        </div>
      </form>
    </ModalShell>
  );
}
