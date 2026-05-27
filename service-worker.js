/* =========================================================
   SERVICE WORKER v8 — RESET COMPLET
   Supprime tous les anciens caches (chemins absolus incorrects
   pour GitHub Pages /Sortie_WE/) et passe les requêtes au réseau.
   ========================================================= */
const CACHE_NAME = 'sorties-nimes-v8';

// Installe immédiatement sans attendre
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Active et SUPPRIME TOUS les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Passe toutes les requêtes au réseau sans interception
// (restaure le comportement normal du navigateur)
self.addEventListener('fetch', () => {
  // Pas d'interception — le navigateur gère directement
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
