// Install-safe PWA worker: no app-shell caching, fresh live data, plus notifications.
const CACHE = "bukhari-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", () => { /* network-only */ });

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
