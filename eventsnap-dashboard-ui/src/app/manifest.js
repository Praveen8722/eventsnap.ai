// Web app manifest (served as /manifest.webmanifest and linked by Next.js).
// Makes the dashboard installable ("Install app" / "Add to Home screen") and
// registers it as a share target for photos, so on Android the
// photographer can Share photos from the camera's app or the gallery straight
// to EventSnap (handled by public/share-target-sw.js).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "EventSnap.AI",
    short_name: "EventSnap",
    description: "Photographer dashboard — bookings, events and photo sharing.",
    id: `${BASE}/`,
    start_url: `${BASE}/dashboard`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6C63FF",
    icons: [
      { src: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    share_target: {
      action: `${BASE}/create-event/share-target`,
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        files: [{ name: "photos", accept: ["image/*", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"] }],
      },
    },
  };
}
