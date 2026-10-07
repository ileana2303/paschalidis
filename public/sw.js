// Clears a stale service worker registration on localhost (e.g. from another app).
self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.registration.unregister().then(() =>
            self.clients.matchAll().then((clients) => {
                for (const client of clients) {
                    client.navigate(client.url);
                }
            })
        )
    );
});
