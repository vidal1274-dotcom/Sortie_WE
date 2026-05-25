/* =========================================================
   BLOC 01 — INITIALISATION CARTE LEAFLET
   ========================================================= */
let _map = null;
let _markersLayer = null;
let _photoMarkersLayer = null;

export function initMap(containerId = 'map') {
  if (_map) return _map;
  _map = L.map(containerId, {
    center: [43.7437, 4.4096],
    zoom: 10,
    zoomControl: true,
    attributionControl: true
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(_map);
  _markersLayer = L.layerGroup().addTo(_map);
  _photoMarkersLayer = L.layerGroup().addTo(_map);
  return _map;
}

export function getMap() { return _map; }
export function getMarkersLayer() { return _markersLayer; }
export function getPhotoMarkersLayer() { return _photoMarkersLayer; }

/* =========================================================
   BLOC 02 — NAVIGATION CARTE
   ========================================================= */
export function flyToSite(lat, lon, zoom = 14) {
  if (!_map || !lat || !lon) return;
  _map.flyTo([lat, lon], zoom, { duration: 0.8 });
}

export function fitBoundsToSites(sites) {
  if (!_map) return;
  const validSites = sites.filter(s => s.has_gps);
  if (validSites.length === 0) return;
  const bounds = validSites.map(s => [s.lat, s.lon]);
  _map.fitBounds(bounds, { padding: [30, 30] });
}

/* =========================================================
   BLOC 03 — LAYER MANAGEMENT
   ========================================================= */
export function clearMarkers() {
  if (_markersLayer) _markersLayer.clearLayers();
}
export function clearPhotoMarkers() {
  if (_photoMarkersLayer) _photoMarkersLayer.clearLayers();
}

/* =========================================================
   BLOC 04 — ICÔNES PERSONNALISÉES
   ========================================================= */
export function createSiteIcon(site) {
  const isGratuit = site.gratuit || (site.budget_indicatif||'').toLowerCase().includes('gratu');
  const color = isGratuit ? '#27ae60' : site.distance_km < 30 ? '#3498db' : '#e94560';
  const emoji = getSiteEmoji(site);
  return L.divIcon({
    html: `<div style="background:${color};border-radius:50% 50% 50% 0;width:32px;height:32px;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:14px;">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    className: ''
  });
}

function getSiteEmoji(site) {
  const type = (site.type_sortie || site.secteur || '').toLowerCase();
  if (/mer|plage|rivière|canyon|gorge/.test(type)) return '🏖️';
  if (/montagne|rando|nature/.test(type)) return '🥾';
  if (/musée|château|patrimoine|village/.test(type)) return '🏛️';
  if (/marché/.test(type)) return '🛒';
  if (/grotte|cave/.test(type)) return '🪨';
  if (/balade|promenade/.test(type)) return '🚶';
  return '📍';
}

export function createPhotoIcon() {
  return L.divIcon({
    html: `<div style="background:#e94560;border-radius:4px;width:28px;height:28px;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;">📷</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16], className: ''
  });
}
