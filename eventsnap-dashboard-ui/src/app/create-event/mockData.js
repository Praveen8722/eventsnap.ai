// Shared constants and helpers for the Create Event screens, plus the mapping
// between the backend's event shape (api/createEventApi.js) and the one the
// UI components use.

import { ScanFace, Smartphone, UserRoundCheck } from "lucide-react";
import { FaInstagram } from "react-icons/fa";
import { createEventAssetUrl } from "@/api/createEventApi";

export const DOWNLOAD_OPTIONS = [
  {
    value: "disabled",
    label: "Disabled",
    hint: "Guests can only view photos. Downloads are blocked, even with a view & download link.",
    tone: "text-amber-600",
  },
  {
    value: "free",
    label: "Free",
    hint: "Guests can download photos for free.",
    tone: "text-green-600",
  },
  {
    value: "paid",
    label: "Paid",
    hint: "Guests pay per photo before downloading.",
    tone: "text-[#6C63FF]",
  },
];

// Guest-access toggles on the create form (key = settings field).
export const GUEST_FEATURES = [
  {
    key: "faceSearch",
    label: "Allow Face Search",
    description: "Guests find their photos with a selfie",
    icon: ScanFace,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    key: "allowScreenshot",
    label: "Allow Screenshot",
    description: "Let guests capture the gallery screen",
    icon: Smartphone,
    iconClass: "bg-pink-50 text-pink-500",
  },
  {
    key: "guestRegistration",
    label: "Guest Registration",
    description: "Guests verify a mobile number to enter",
    icon: UserRoundCheck,
    iconClass: "bg-gray-100 text-gray-800",
  },
  {
    key: "instagramFollow",
    label: "Strict Instagram Follow",
    description: "Guests must follow you to view photos",
    icon: FaInstagram,
    iconClass: "bg-gradient-to-br from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white",
  },
];

export const DEFAULT_SETTINGS = {
  download: "disabled",
  pricePerPhoto: "",
  faceSearch: false,
  allowScreenshot: false,
  guestRegistration: true,
  instagramFollow: false,
  instagramHandle: "",
};

// Permanent public guest page for an event: <this site>/share/<slug>, the
// same way the portfolio's public /p/<slug> link is built (lib/portfolioQr.js)
// — so the link and QR work in every deployment. The slug comes from the
// backend and never changes.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const publicGalleryUrl = (slug) =>
  typeof window === "undefined" || !slug
    ? ""
    : `${window.location.origin}${BASE_PATH}/share/${encodeURIComponent(slug)}`;

export const STATUS_STYLES = {
  Live: "bg-green-100 text-green-700",
  Draft: "bg-gray-100 text-gray-600",
  Processing: "bg-amber-100 text-amber-700",
};

const fromApiPhoto = (photo) => {
  const src = createEventAssetUrl(photo.url);
  // originalName + size let Camera Auto Upload skip photos already uploaded.
  return { id: photo.id, src, thumb: src, originalName: photo.originalName || "", size: photo.size || 0 };
};

// Backend event → UI event. `photos` is null until the event's photos have
// been loaded (the events list only carries photoCount).
export const fromApi = (event) => ({
  id: event.id,
  name: event.name,
  slug: event.slug,
  date: event.date,
  location: event.location || "",
  status: event.status,
  views: event.guestViews || 0,
  downloads: event.downloads || 0,
  cover: event.coverPhoto ? createEventAssetUrl(event.coverPhoto) : null,
  photoCount: event.photoCount ?? event.photos?.length ?? 0,
  // Photos processed for guest selfie search (Face Search).
  faceIndexedCount: event.faceIndexedCount ?? 0,
  photos: event.photos ? event.photos.map(fromApiPhoto) : null,
  settings: {
    download: event.photoDownload || "disabled",
    pricePerPhoto: event.pricePerPhoto ? String(event.pricePerPhoto) : "",
    faceSearch: !!event.guestAccess?.faceSearch,
    allowScreenshot: !!event.guestAccess?.screenshot,
    guestRegistration: !!event.guestAccess?.guestRegistration,
    instagramFollow: !!event.guestAccess?.instagramFollow,
    instagramHandle: event.guestAccess?.instagramHandle || "",
  },
});

// UI settings (create form) → backend fields.
export const settingsToApi = (settings) => ({
  photoDownload: settings.download,
  pricePerPhoto: settings.download === "paid" ? settings.pricePerPhoto : 0,
  guestAccess: {
    faceSearch: settings.faceSearch,
    screenshot: settings.allowScreenshot,
    guestRegistration: settings.guestRegistration,
    instagramFollow: settings.instagramFollow,
    instagramHandle: settings.instagramFollow ? settings.instagramHandle : "",
  },
});

// The backend's error message for a failed request, or `fallback`.
export const apiError = (error, fallback) => error?.response?.data?.message || fallback;

export const photoCount = (event) => event.photoCount ?? event.photos?.length ?? 0;

export const formatEventDate = (value) => {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};
