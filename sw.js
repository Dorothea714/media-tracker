// Service Worker for Media Tracker PWA
const CACHE_NAME = 'media-tracker-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  './sw.js'
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('SW: pre-cache partial failure', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static, network-only for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache API calls
  if (
    url.hostname === 'www.googleapis.com' ||
    url.hostname === 'api.themoviedb.org' ||
    url.hostname === 'image.tmdb.org' ||
    url.hostname === 'books.google.com'
  ) {
    return; // Let browser handle normally
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached response, then update cache in background
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
