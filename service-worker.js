/* =========================================================
   BLOC 01 — CONFIGURATION CACHE PWA
   ========================================================= */
const CACHE_NAME = 'sorties-nimes-v4';
const OFFLINE_URL = '/index.html';

const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/sites.json',
  '/js/app.js',
  '/js/config.js',
  '/js/state.js',
  '/js/utils.js',
  '/js/storage.js',
  '/js/data-loader.js',
  '/js/map.js',
  '/js/markers.js',
  '/js/filters.js',
  '/js/global-search.js',
  '/js/vehicle-profile.js',
  '/js/energy-rules.js',
  '/js/trip-energy-estimator.js',
  '/js/economy-engine.js',
  '/js/budget-estimator.js',
  '/js/surprise-engine.js',
  '/js/external-insights.js',
  '/js/source-confidence.js',
  '/js/site-insights.js',
  '/js/site-detail.js',
  '/js/photos.js',
  '/js/photo-geolocation.js',
  '/js/photo-map.js',
  '/js/photo-sync.js',
  '/js/nas-api-client.js',
  '/js/sync-queue.js',
  '/js/network-manager.js',
  '/js/sync-policy.js',
  '/js/network-ui.js',
  '/js/geolocation.js',
  '/js/tracker.js',
  '/js/welcome.js',
  '/js/auth.js',
  '/js/navigation.js',
  '/js/nearby.js',
  '/js/thematic-search.js',
  '/js/google-search.js',
  '/js/day-plan.js',
  '/js/ui.js',
  '/js/import-export.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

/* =========================================================
   BLOC 02 — INSTALLATION
   ========================================================= */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Mise en cache des assets');
      return cache.addAll(CACHE_ASSETS.filter(url => !url.startsWith('http')));
    }).then(() => self.skipWaiting())
  );
});

/* =========================================================
   BLOC 03 — ACTIVATION
   ========================================================= */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* =========================================================
   BLOC 04 — FETCH STRATEGY (cache-first, network-fallback)
   ========================================================= */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les appels NAS backend (API)
  if (url.pathname.startsWith('/api/')) return;

  // Réseau externe non géré en cache
  if (!url.origin.includes(self.location.origin) && !url.hostname.includes('unpkg.com') && !url.hostname.includes('openstreetmap.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mise en cache des nouvelles ressources statiques
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback page hors ligne
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

/* =========================================================
   BLOC 05 — MESSAGE DE MISE À JOUR
   ========================================================= */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
