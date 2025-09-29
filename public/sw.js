/* Simple offline-first service worker (no plugins) */
const CACHE = 'jobflow-cache-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
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
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((resp) => {
        const respClone = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(request, respClone));
        return resp;
      }).catch(() => cached)
    )
  );
});

