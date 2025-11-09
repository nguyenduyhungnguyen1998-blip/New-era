const CACHE_NAME = "hanoi-v1.4";
const FILES_TO_CACHE = [
  "/Game/index.html",
  "/Game/style.css",
  "/js/ap2.js",
  "/js/enh.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of FILES_TO_CACHE) {
      try {
        const req = new Request(url, { cache: 'no-cache' });
        const res = await fetch(req);
        if (res && res.ok) {
          await cache.put(url, res.clone());
        }
      } catch (_) {
        // skip missing/unreachable file
      }
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
