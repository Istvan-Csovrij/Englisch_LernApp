// Service Worker: Offline-Support für Englisch-LernApp (v23 - Soft Voice & Speech Controls)
const CACHE_NAME = 'english-master-cache-v23';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './qr_code.png',
  './avatar_istvan_3d.jpg',
  './avatar_robot.jpg',
  './avatar_istvan_real.jpg',
  './avatar_future_female.jpg',
  './avatar_future_male.jpg'
];

// Allow clients to trigger skipWaiting immediately
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.action === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Install: Cache essential assets and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching offline assets for v23...');
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

        // If server returned non-200, fall back to cache
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
