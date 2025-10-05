/* Offline-first service worker with cache versioning + fallback */
const CACHE = 'jobflow-cache-v2';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/main.js',
  '/src/store.js',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return resp;
      }).catch(async () => {
        // Navigation fallback for offline
        if (request.mode === 'navigate') {
          const fallback = await caches.match('/offline.html');
          if (fallback) return fallback;
        }
        return caches.match(request);
      });
    })
  );
});
