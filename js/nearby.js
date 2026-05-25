/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { OVERPASS_ENDPOINT, THEMATIC_CATEGORIES } from './config.js';
import { cacheSet, cacheGet } from './storage.js';

/* =========================================================
   BLOC 02 — REQUÊTE OVERPASS
   ========================================================= */
export async function fetchNearbyPlaces(lat, lon, categoryId, radiusM = 5000) {
  const cat = THEMATIC_CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return [];

  const cacheKey = `overpass_${categoryId}_${Math.round(lat*100)}_${Math.round(lon*100)}_${radiusM}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const [key, value] = cat.tags.split('=');
  const query = `[out:json][timeout:10];node["${key}"="${value}"](around:${radiusM},${lat},${lon});out body 20;`;

  try {
    const resp = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const results = (data.elements || []).map(el => ({
      id: el.id,
      lat: el.lat,
      lon: el.lon,
      name: el.tags?.name || cat.label,
      type: categoryId,
      icon: cat.icon,
      tags: el.tags
    }));
    await cacheSet(cacheKey, results, 3600000); // 1h cache
    return results;
  } catch(e) {
    console.warn('[nearby] Overpass error', e);
    return [];
  }
}

/* =========================================================
   BLOC 03 — RENDU HTML RÉSULTATS
   ========================================================= */
export function renderNearbyResults(places, category) {
  if (!places.length) return `<p style="color:#aaa;font-size:13px">Aucun résultat trouvé dans ce rayon. <span class="verify-tag">À vérifier</span></p>`;
  return places.slice(0, 10).map(p => `
    <div class="site-card" style="cursor:pointer" onclick="window.open('${buildGoogleMapsLink(p.lat,p.lon,p.name)}','_blank')">
      <div class="site-name">${p.icon} ${p.name}</div>
      <div class="site-sector" style="font-size:12px">Source : OpenStreetMap — <span class="verify-tag">à vérifier</span></div>
    </div>`).join('');
}

function buildGoogleMapsLink(lat, lon, name) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name || '')}&query_place_id=${lat},${lon}`;
}
