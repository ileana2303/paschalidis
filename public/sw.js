// Clears a stale service worker registration (e.g. from another app).
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    // Do not navigate controlled clients here. Reloading from inside activation
    // can install/activate this worker again before unregistering has settled,
    // creating an endless page-refresh loop.
    event.waitUntil(self.registration.unregister());
});
