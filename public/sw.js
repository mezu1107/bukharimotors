// Minimal install-only service worker — enables PWA installability without
// caching, so previews and live data always load fresh.
const CACHE = "bukhari-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", () => { /* network-only */ });
