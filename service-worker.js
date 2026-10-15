// Naikkan versi ini setiap kali file aplikasi diubah.
const CACHE_NAME = 'nongki-pwa-v91-fix-total-unit-omzet';

// Hanya file yang benar-benar ada. File yang 404 dilewati, tidak menggagalkan install.
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_FILES.map(async file => {
      try {
        const res = await fetch(file, { cache: 'reload' });
        if (res && res.ok) await cache.put(file, res);
      } catch (e) { /* abaikan: file belum ada / offline */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
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
      // HTML: ambil dari jaringan dulu supaya update langsung terbaca.
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
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

    // Aset lain (ikon, manifest): cache dulu, perbarui di latar belakang.
    const cached = await caches.match(request);
    const refresh = fetch(request).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
      }
      return res;
    }).catch(() => null);
    return cached || (await refresh) ||
      new Response('Aset belum tersedia offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
  })());
});
