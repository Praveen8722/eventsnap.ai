// EventSnap — receives photos shared to the installed app (Android "Share →
// EventSnap", declared as share_target in app/manifest.js).
//
// It only handles that one POST: the shared photos are kept in the browser's
// Cache Storage and the photographer is sent to the Create Event page, which
// uploads them to the chosen event (app/create-event/SharedPhotosInbox.jsx).
// Every other request is left alone — this worker caches nothing else and
// doesn't change how the dashboard loads.

const CACHE = "eventsnap-shared-photos";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || !/\/create-event\/share-target\/?$/.test(url.pathname)) return;

  event.respondWith(
    (async () => {
      const form = await event.request.formData();
      const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
      const cache = await caches.open(CACHE);
      const stamp = Date.now();
      await Promise.all(
        files.map((file, i) =>
          cache.put(
            new Request(`${self.registration.scope}__shared-photos/${stamp}-${i}`),
            new Response(file, {
              headers: {
                "Content-Type": file.type || "application/octet-stream",
                "X-File-Name": encodeURIComponent(file.name || `photo-${i + 1}.jpg`),
                "X-Last-Modified": String(file.lastModified || stamp),
              },
            })
          )
        )
      );
      return Response.redirect(`${self.registration.scope}create-event?shared=${files.length}`, 303);
    })()
  );
});
