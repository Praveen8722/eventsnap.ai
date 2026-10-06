"use client";

import { useState } from "react";
import { HiOutlineCloudDownload } from "react-icons/hi";
import { Toggle } from "./CreateEventModal";
import { DOWNLOAD_OPTIONS, GUEST_FEATURES } from "./mockData";

// UI setting key → backend guestAccess key.
const API_KEYS = {
  faceSearch: "faceSearch",
  allowScreenshot: "screenshot",
  guestRegistration: "guestRegistration",
  instagramFollow: "instagramFollow",
};
const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

const smallInput =
  "w-full rounded-lg border border-gray-200 bg-white pl-7 pr-2 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition";
const saveBtn =
  "shrink-0 rounded-lg bg-[#6C63FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5B52EE] disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

// Event gallery → Guest Access: the same download option and toggles as the
// create form, saved straight to the event. `onSave(patch)` sends a partial
// update ({ photoDownload, pricePerPhoto, guestAccess: {...} }) and resolves
// true on success. The parent remounts this panel (via `key`) whenever the
// saved settings change, so drafts always start from the saved values.
//
// "Paid" needs a price and Instagram follow needs a handle, so those two are
// only saved once the extra field is filled in.
// faceStatus: { indexed, total, working } — how many photos guests can
// already find by selfie (see useFaceIndexer).
export function GuestAccessPanel({ settings, onSave, faceStatus }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // "paid" while Paid is picked but no price has been saved yet.
  const [pendingDownload, setPendingDownload] = useState(null);
  const [priceDraft, setPriceDraft] = useState(settings.pricePerPhoto || "");
  // True while Instagram follow is switched on but no handle has been saved.
  const [pendingInstagram, setPendingInstagram] = useState(false);
  const [handleDraft, setHandleDraft] = useState(settings.instagramHandle || "");

  const download = pendingDownload || settings.download;
  const downloadOption = DOWNLOAD_OPTIONS.find((o) => o.value === download);
  const instagramOn = pendingInstagram || settings.instagramFollow;

  const save = async (patch) => {
    setSaving(true);
    setError("");
    const ok = await onSave(patch);
    setSaving(false);
    return ok;
  };

  const selectDownload = (value) => {
    setError("");
    if (value === "paid") {
      if (Number(settings.pricePerPhoto) > 0) {
        setPendingDownload(null);
        if (settings.download !== "paid") save({ photoDownload: "paid", pricePerPhoto: settings.pricePerPhoto });
      } else {
        setPendingDownload("paid");
      }
      return;
    }
    setPendingDownload(null);
    if (value !== settings.download) save({ photoDownload: value });
  };

  const priceChanged = pendingDownload === "paid" || Number(priceDraft) !== Number(settings.pricePerPhoto);
  const savePrice = () => {
    if (!(Number(priceDraft) > 0)) return setError("Enter a price per photo");
    save({ photoDownload: "paid", pricePerPhoto: Number(priceDraft) });
  };

  const toggle = (key, on) => {
    setError("");
    if (key !== "instagramFollow") return save({ guestAccess: { [API_KEYS[key]]: on } });
    if (!on) {
      setPendingInstagram(false);
      if (settings.instagramFollow) save({ guestAccess: { instagramFollow: false } });
    } else if (settings.instagramHandle) {
      save({ guestAccess: { instagramFollow: true, instagramHandle: settings.instagramHandle } });
    } else {
      setPendingInstagram(true);
    }
  };

  const cleanHandle = handleDraft.trim().replace(/^@/, "");
  const handleChanged = pendingInstagram || cleanHandle !== settings.instagramHandle;
  const saveHandle = () => {
    if (!cleanHandle) return setError("Enter the Instagram handle guests must follow");
    if (!INSTAGRAM_HANDLE.test(cleanHandle)) return setError("Enter a valid Instagram handle");
    save({ guestAccess: { instagramFollow: true, instagramHandle: cleanHandle } });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#1E1E1E]">Guest Access</h2>
        {saving && <span className="text-xs font-medium text-gray-400">Saving…</span>}
      </div>

      <ul className="mt-3 space-y-2.5 text-sm">
        <li>
          <span className="flex items-center gap-2.5 text-gray-600">
            <span className="w-7 h-7 rounded-lg bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center">
              <HiOutlineCloudDownload />
            </span>
            Photo download
          </span>
          <div role="radiogroup" aria-label="Photo download" className="grid grid-cols-3 gap-1 mt-2 rounded-lg bg-gray-100 p-1">
            {DOWNLOAD_OPTIONS.map((option) => {
              const active = download === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={saving}
                  onClick={() => selectDownload(option.value)}
                  className={`rounded-md py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                    active ? "bg-white text-[#6C63FF] shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className={`text-xs mt-1.5 ${downloadOption?.tone || "text-gray-500"}`}>{downloadOption?.hint}</p>
          {download === "paid" && (
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">₹</span>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  aria-label="Price per photo"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  placeholder="Price per photo"
                  className={smallInput}
                />
              </div>
              {priceChanged && (
                <button type="button" onClick={savePrice} disabled={saving} className={saveBtn}>
                  Save
                </button>
              )}
            </div>
          )}
        </li>

        {GUEST_FEATURES.map(({ key, label, icon: Icon, iconClass }) => {
          const on = key === "instagramFollow" ? instagramOn : settings[key];
          return (
            <li key={key}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-gray-600 min-w-0">
                  <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${iconClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{label}</span>
                </span>
                <Toggle checked={!!on} onChange={(v) => toggle(key, v)} label={label} disabled={saving} />
              </div>
              {key === "faceSearch" && on && faceStatus && (
                <p className="mt-1.5 pl-[38px] text-xs text-gray-500">
                  {faceStatus.total === 0
                    ? "Guests are asked for a selfie and see only photos of themselves."
                    : faceStatus.indexed >= faceStatus.total
                      ? `Ready — all ${faceStatus.total} photo${faceStatus.total === 1 ? "" : "s"} can be found by selfie.`
                      : `Preparing face search: ${faceStatus.indexed} of ${faceStatus.total} photos ready${
                          faceStatus.working ? "…" : " (keep this page open to finish)."
                        }`}
                </p>
              )}
              {key === "instagramFollow" && instagramOn && (
                <div className="flex items-center gap-2 mt-2 pl-[38px]">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">@</span>
                    <input
                      aria-label="Instagram handle guests must follow"
                      value={handleDraft}
                      onChange={(e) => setHandleDraft(e.target.value)}
                      placeholder="yourstudio"
                      className={smallInput}
                    />
                  </div>
                  {handleChanged && (
                    <button type="button" onClick={saveHandle} disabled={saving} className={saveBtn}>
                      Save
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p role="alert" className="text-xs text-red-500 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
