// PWA worker v3 — clears old caches, network-first for app, plus push notifications.
const CACHE = "bukhari-v3";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", () => { /* network-only — always fresh */ });

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_NOTIFICATION") return;
  const { title, options } = event.data;
  event.waitUntil(self.registration.showNotification(title || "Bukhari Motors", {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [180, 80, 180],
    ...options,
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    if (existing) return existing.focus();
    return self.clients.openWindow("/dashboard");
  }));
});
