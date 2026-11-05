// Service Worker: Offline-Support für Englisch-LernApp (v17 - Bulletproof Cache & Fallbacks)
const CACHE_NAME = 'english-master-cache-v17';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './qr_code.png'
];

// Install: Cache essential assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline assets for v17...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.warn('[Service Worker] Non-fatal cache.addAll warning:', err);
    })
  );
});

// Activate: Purge older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First with safe fallback and ignoreSearch: true
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        }

        // If server returned non-200 (e.g. temporary 404/503 during deploy), fall back to cache
        return caches.match(event.request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          return networkResponse;
        });
      })
      .catch(() => {
        // Network failure (offline or timeout) -> Serve from Cache with ignoreSearch: true
        return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Direct fallback for versioned scripts/styles
          if (url.pathname.endsWith('app.js')) {
            return caches.match('./app.js', { ignoreSearch: true });
          }
          if (url.pathname.endsWith('data.js')) {
            return caches.match('./data.js', { ignoreSearch: true });
          }
          if (url.pathname.endsWith('style.css')) {
            return caches.match('./style.css', { ignoreSearch: true });
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html', { ignoreSearch: true });
          }
        });
      })
  );
});
