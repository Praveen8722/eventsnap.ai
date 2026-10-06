"use client";

import { useRef } from "react";

// Matches the backend's per-file limit (middleware/uploadCreateEvent.js).
export const MAX_COVER_MB = 25;

// Returns `file` if it's a usable cover image, else null (with an alert).
export const validCoverFile = (file) => {
  if (!file) return null;
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file for the cover photo.");
    return null;
  }
  if (file.size > MAX_COVER_MB * 1024 * 1024) {
    alert(`Cover photo must be ${MAX_COVER_MB} MB or smaller.`);
    return null;
  }
  return file;
};

// Hidden single-image file input. Render `input` anywhere and call `open()`
// from a button; `onPick` receives the chosen (validated) File.
export function useCoverPicker(onPick) {
  const ref = useRef(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const file = validCoverFile(e.target.files?.[0]);
        e.target.value = "";
        if (file) onPick(file);
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}
