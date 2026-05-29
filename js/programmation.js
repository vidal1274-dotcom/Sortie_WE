/* =========================================================
   BLOC 01 — IMPORTS ET ETAT
   ========================================================= */
const ORIGIN = { lat: 43.7169, lon: 4.3789, label: 'Nages-et-Solorgues' };
const LS_KEY = 'trekko_prog_route';
const AVG_SPEED = 70;

let _sites = [];
let _waypoints = []; // sites ajoutés (sans l'origine)
let _map = null;
let _markers = [];
let _line = null;

/* =========================================================
   BLOC 02 — INIT
   ========================================================= */
export function initProgPanel(sites) {
  _sites = sites;
  _loadFromStorage();
  _initMap();
  _setupSearch();
  _setupButtons();
  _renderWaypoints();
}

export function refreshProgPanel() {
  if (_map) setTimeout(() => _map.invalidateSize(), 80);
}

function _initMap() {
  if (_map) return;
  const el = document.getElementById('prog-map');
  if (!el) return;
  _map = L.map(el, { zoomControl: true }).setView([ORIGIN.lat, ORIGIN.lon], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OSM', maxZoom: 18
  }).addTo(_map);
}

function _setupSearch() {
  const input = document.getElementById('prog-search');
  const sug   = document.getElementById('prog-suggestions');
  if (!input || !sug) return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { sug.classList.add('hidden'); return; }
    const results = _sites
      .filter(s => s.destination.toLowerCase().includes(q) && !_waypoints.find(w => w.id === s.id))
      .slice(0, 6);
    if (!results.length) { sug.classList.add('hidden'); return; }
    sug.innerHTML = results.map(s =>
      `<div class="prog-sug-item" data-id="${s.id}">${s.destination}<small>${s.secteur || ''}</small></div>`
    ).join('');
    sug.classList.remove('hidden');
    sug.querySelectorAll('.prog-sug-item').forEach(el => {
      el.addEventListener('click', () => {
        const site = _sites.find(s => s.id === el.dataset.id);
        if (site) { _addWaypoint(site); input.value = ''; sug.classList.add('hidden'); }
      });
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.prog-toolbar')) sug.classList.add('hidden');
  });
}

function _setupButtons() {
  document.getElementById('btn-prog-clear')?.addEventListener('click', () => {
    _waypoints = [];
    _saveToStorage();
    _renderWaypoints();
  });
  document.getElementById('btn-prog-save')?.addEventListener('click', _saveToStorage);
}

function _addWaypoint(site) {
  if (!site.has_gps || !site.lat || !site.lon) return;
  _waypoints.push(site);
  _saveToStorage();
  _renderWaypoints();
}

function _removeWaypoint(idx) {
  _waypoints.splice(idx, 1);
  _saveToStorage();
  _renderWaypoints();
}

function _moveWaypoint(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= _waypoints.length) return;
  [_waypoints[idx], _waypoints[newIdx]] = [_waypoints[newIdx], _waypoints[idx]];
  _saveToStorage();
  _renderWaypoints();
}

/* =========================================================
   BLOC 03 — RENDU WAYPOINTS + STATS
   ========================================================= */
function _renderWaypoints() {
  const container = document.getElementById('prog-waypoints');
  if (!container) return;

  const all = [{ ...ORIGIN, id: '__origin__', destination: ORIGIN.label, is_origin: true }, ..._waypoints];

  // Calcul distances
  const segs = [];
  for (let i = 1; i < all.length; i++) {
    segs.push(_haversine(all[i-1].lat, all[i-1].lon, all[i].lat, all[i].lon) * 1.2);
  }

  container.innerHTML = all.map((wp, i) => {
    const dist = i > 0 ? `${segs[i-1].toFixed(1)} km depuis l'étape précédente` : 'Point de départ';
    const isOrigin = wp.is_origin;
    const actions = isOrigin ? '' : `
      <button class="prog-wp-btn" data-action="up" data-idx="${i-1}" ${i === 1 ? 'disabled' : ''}>&#x2B06;&#xFE0F;</button>
      <button class="prog-wp-btn" data-action="down" data-idx="${i-1}" ${i === all.length-1 ? 'disabled' : ''}>&#x2B07;&#xFE0F;</button>
      <button class="prog-wp-btn" data-action="del" data-idx="${i-1}">&#x1F5D1;&#xFE0F;</button>`;
    return `
      <div class="prog-wp ${isOrigin ? 'prog-wp-origin' : ''}">
        <div class="prog-wp-num">${i === 0 ? '&#x1F3E0;' : i}</div>
        <div class="prog-wp-info">
          <div class="prog-wp-name">${wp.destination}</div>
          <div class="prog-wp-dist">${dist}</div>
        </div>
        <div class="prog-wp-actions">${actions}</div>
      </div>`;
  }).join('') || '<div class="prog-empty">Aucune étape</div>';

  // Boutons actions
  container.querySelectorAll('.prog-wp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.action === 'del') _removeWaypoint(idx);
      else if (btn.dataset.action === 'up')   _moveWaypoint(idx, -1);
      else if (btn.dataset.action === 'down') _moveWaypoint(idx, 1);
    });
  });

  _updateStats(all, segs);
  _updateMap(all);
}

function _updateStats(all, segs) {
  const statsEl = document.getElementById('prog-stats');
  if (!statsEl) return;
  if (all.length <= 1) { statsEl.classList.add('hidden'); return; }

  const totalKm = segs.reduce((a, b) => a + b, 0);
  const totalMin = (totalKm / AVG_SPEED) * 60;
  const h = Math.floor(totalMin / 60), m = Math.round(totalMin % 60);

  document.getElementById('prog-stat-stops').textContent = `${all.length - 1} étape${all.length > 2 ? 's' : ''}`;
  document.getElementById('prog-stat-dist').textContent   = `${totalKm.toFixed(0)} km`;
  document.getElementById('prog-stat-time').textContent   = `${h}h${String(m).padStart(2,'0')}`;
  statsEl.classList.remove('hidden');
}

function _updateMap(all) {
  if (!_map) return;

  // Supprimer anciens marqueurs/trace
  _markers.forEach(m => m.remove()); _markers = [];
  if (_line) { _line.remove(); _line = null; }

  if (all.length < 1) return;

  const coords = all.map(wp => [wp.lat, wp.lon]);

  // Trace
  if (coords.length > 1) {
    _line = L.polyline(coords, { color: '#e94560', weight: 3, opacity: 0.85 }).addTo(_map);
  }

  // Marqueurs
  all.forEach((wp, i) => {
    const color = wp.is_origin ? '#7a7d99' : '#e94560';
    const label = wp.is_origin ? '&#x1F3E0;' : String(i);
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${label}</div>`,
      iconSize: [28, 28], iconAnchor: [14, 14]
    });
    const marker = L.marker([wp.lat, wp.lon], { icon })
      .addTo(_map)
      .bindPopup(`<strong>${wp.destination}</strong>`);
    _markers.push(marker);
  });

  // Zoom auto
  if (coords.length > 1) {
    _map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
  } else {
    _map.setView(coords[0], 12);
  }

  setTimeout(() => _map.invalidateSize(), 50);
}

/* =========================================================
   BLOC 04 — PERSISTANCE
   ========================================================= */
function _saveToStorage() {
  localStorage.setItem(LS_KEY, JSON.stringify(_waypoints.map(w => w.id)));
}

function _loadFromStorage() {
  try {
    const ids = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    _waypoints = ids.map(id => _sites.find(s => s.id === id)).filter(Boolean);
  } catch (_) { _waypoints = []; }
}

/* =========================================================
   BLOC 05 — UTILITAIRE HAVERSINE
   ========================================================= */
function _haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
