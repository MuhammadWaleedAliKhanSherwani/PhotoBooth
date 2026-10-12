/* Service worker: makes the booth work offline & installable.
   Photos live in their own cache ('maheen-photos-v1') which is never touched here. */
const SHELL = 'maheen-shell-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './js/filters.js',
  './js/stickers.js',
  './js/layouts.js',
  './js/storage.js',
  './js/app.js',
  './icon.svg',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('maheen-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/__photos__/')) {
    e.respondWith(caches.open('maheen-photos-v1').then((c) => c.match(req)).then((r) => r || new Response('', { status: 404 })));
    return;
  }
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;

  e.respondWith(
    caches.open(SHELL).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      // fonts never change: cache-first
      if (isFont && cached) return cached;
      // app files: network-first so new deploys show up immediately, cache when offline
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
      }
    })
  );
});
