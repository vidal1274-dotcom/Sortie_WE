/* =========================================================
   BLOC 01 — POLITIQUE PAR NIVEAU RÉSEAU
   ========================================================= */
export const SYNC_POLICIES = {
  offline:   { syncPhotos: false, fetchMeta: false, fetchThumbs: false, fetchFull: false },
  weak_2g:   { syncPhotos: false, fetchMeta: false, fetchThumbs: false, fetchFull: false },
  medium_3g: { syncPhotos: false, fetchMeta: true,  fetchThumbs: true,  fetchFull: false },
  good_4g:   { syncPhotos: true,  fetchMeta: true,  fetchThumbs: true,  fetchFull: false },
  wifi_5g:   { syncPhotos: true,  fetchMeta: true,  fetchThumbs: true,  fetchFull: true  },
  unknown:   { syncPhotos: false, fetchMeta: true,  fetchThumbs: false, fetchFull: false }
};

export function getPolicyForNetwork(networkStatus) {
  return SYNC_POLICIES[networkStatus] || SYNC_POLICIES.unknown;
}

export function canSyncPhotos(networkStatus) { return getPolicyForNetwork(networkStatus).syncPhotos; }
export function canFetchMeta(networkStatus) { return getPolicyForNetwork(networkStatus).fetchMeta; }

/* =========================================================
   BLOC 02 — LABELS RÉSEAU
   ========================================================= */
export function getNetworkLabel(status) {
  const labels = {
    offline: '📵 Hors ligne — données locales uniquement',
    weak_2g: '📶 Réseau très faible (2G) — mode économie',
    medium_3g: '📶 Réseau moyen (3G) — métadonnées seulement',
    good_4g: '📶 4G — synchronisation progressive',
    wifi_5g: '📶 WiFi / 5G — synchronisation complète',
    unknown: '📶 Réseau inconnu — mode prudent'
  };
  return labels[status] || '📶 Réseau inconnu';
}

export function getNetworkColor(status) {
  if (status === 'offline') return 'offline';
  if (['weak_2g', 'medium_3g'].includes(status)) return 'weak';
  return 'good';
}
