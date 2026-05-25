/* =========================================================
   BLOC 01 — CHARGEMENT SITES.JSON
   ========================================================= */
import { SITES_JSON_URL, UCHAUD_COORDS } from './config.js';
import { haversineDistance, isValidCoord, generateId } from './utils.js';
import { dbGetAll, STORES, saveGpsCorrection, loadAllGpsCorrections } from './storage.js';

export async function loadSites() {
  let sites = [];
  try {
    const resp = await fetch(SITES_JSON_URL);
    if (resp.ok) {
      sites = await resp.json();
    }
  } catch(e) {
    console.warn('[data-loader] sites.json non disponible, utilisation cache IndexedDB');
    sites = await dbGetAll(STORES.SITES);
  }
  // Appliquer corrections GPS
  const corrections = await loadAllGpsCorrections();
  const corrMap = {};
  corrections.forEach(c => { corrMap[c.site_id] = c; });

  return sites.map((site, idx) => {
    const id = site.id || generateId('site');
    const corr = corrMap[id];
    let lat = corr ? corr.lat : (site.lat || site.latitude || null);
    let lon = corr ? corr.lon : (site.lon || site.longitude || null);
    const hasGps = isValidCoord(lat, lon);
    const distKm = hasGps ? haversineDistance(UCHAUD_COORDS[0], UCHAUD_COORDS[1], lat, lon) : null;
    return {
      ...site,
      id,
      lat: hasGps ? lat : null,
      lon: hasGps ? lon : null,
      has_gps: hasGps,
      gps_corrected: !!corr,
      distance_km: distKm ? Math.round(distKm) : null,
      _index: idx
    };
  });
}

/* =========================================================
   BLOC 02 — SAUVEGARDE EN CACHE INDEXEDDB
   ========================================================= */
import { dbPut } from './storage.js';

export async function cacheSitesLocally(sites) {
  for (const site of sites) {
    try { await dbPut(STORES.SITES, site); } catch(e) {}
  }
}

/* =========================================================
   BLOC 03 — CORRECTION GPS MANUELLE
   ========================================================= */
export async function applyManualGpsCorrection(siteId, lat, lon, sites) {
  await saveGpsCorrection(siteId, lat, lon);
  return sites.map(s => {
    if (s.id !== siteId) return s;
    const distKm = haversineDistance(UCHAUD_COORDS[0], UCHAUD_COORDS[1], lat, lon);
    return { ...s, lat, lon, has_gps: true, gps_corrected: true, distance_km: Math.round(distKm) };
  });
}

/* =========================================================
   BLOC 04 — STATS DONNÉES
   ========================================================= */
export function getDataStats(sites) {
  const withGps = sites.filter(s => s.has_gps).length;
  const withoutGps = sites.length - withGps;
  const gratuits = sites.filter(s => s.gratuit || (s.budget_indicatif||'').toLowerCase().includes('gratu')).length;
  return { total: sites.length, withGps, withoutGps, gratuits };
}
