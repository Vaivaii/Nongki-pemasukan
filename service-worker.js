// Nongki PWA v186-thermal-slider-centering-fix: send pre-payment audit as a zero-value new event.
const CACHE_NAME = 'nongki-v192-default-png-bluetooth-raster-logo'

const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './nongki-icon.svg',
  './icon-512.png',
  './assets/nongki-receipt-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_FILES.map(async file => {
      try {
        const response = await fetch(file, { cache: 'reload' });
        if (response && response.ok) await cache.put(file, response);
      } catch (error) {
        // File optional/offline: continue installing so the worker can take over.
      }
    }));
    // Activate immediately; do not wait for old tabs to close.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    // Control open tabs immediately after old caches have been cleared.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = request.mode === 'navigate' ||
    url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  event.respondWith((async () => {
    if (isPage) {
      // Prefer the latest server HTML; use cache only when offline.
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      } catch {
        return (await caches.match(request)) ||
          (await caches.match('./index.html')) ||
          (await caches.match('./')) ||
          new Response('Aplikasi belum tersedia offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    }

    const cached = await caches.match(request);
    const refresh = fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => null);
    return cached || (await refresh) ||
      new Response('Aset belum tersedia offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  })());
});
