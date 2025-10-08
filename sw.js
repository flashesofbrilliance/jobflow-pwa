const SW_VERSION = '1.2.0';
const CACHE_NAME = 'jobflow-cache-'+SW_VERSION;
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './sw.js',
  './csv_templates/discovery_import_template.csv',
  './icons/192.png',
  './icons/512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k!==CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Cache-first for same-origin GET
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async ()=>{
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(e.request);
    if (cached) return cached;
    try {
      const res = await fetch(e.request);
      if (res && res.status === 200) cache.put(e.request, res.clone());
      return res;
    } catch {
      if (e.request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      throw;
    }
  })());
});
