/* =========================================================
   BLOC 01 — IMPORTS PRINCIPAUX
   ========================================================= */
import { loadSites, cacheSitesLocally, getDataStats, applyManualGpsCorrection, recalcDistances } from './data-loader.js';
import { initMap, fitBoundsToSites, flyToSite, showUserLocationMarker, clearUserLocationMarker } from './map.js';
import { renderSiteMarkers, buildSiteBadges, focusOnSite } from './markers.js';
import { applyFilter, applyTextFilter, applyDistanceFilter, sortSites, initFilterChips, setProcheThreshold } from './filters.js';
import { requestUserLocation, getStoredOrigin, saveOrigin, clearUserLocation, getStoredMaxKm, saveMaxKm, isUsingGps, ORIGIN_DEFAULT } from './geolocation.js';
import { enrichSitesWithEcoScore, getBestDeals } from './economy-engine.js';
import { loadVehicleProfile, saveVehicleProfile, getVehicleLabel, isVehicleConfigured } from './vehicle-profile.js';
import { initGlobalSearch, interpretSearchQuery } from './global-search.js';
import { openSiteDetail, closeSiteDetail, openGpsEditDialog } from './site-detail.js';
import { generateSurprise, renderSurpriseCard } from './surprise-engine.js';
import { initNavTabs, renderSitesList, renderEconomyPanel, showLoading, switchToPanel } from './ui.js';
import { initNetworkManager, getNetworkStatus } from './network-manager.js';
import { initNetworkUI } from './network-ui.js';
import { loadAllPhotos, importPhotos } from './photos.js';
import { renderPhotoMarkers } from './photo-map.js';
import { syncPendingPhotos, getSyncStatus, setupAutoSync, schedulePhotoForSync } from './photo-sync.js';
import { lsGet, lsSet } from './storage.js';
import { showToast } from './utils.js';
import { buildVerificationLinks } from './energy-rules.js';
import { exportAllData, importData } from './import-export.js';
import { addGoogleSearchToHistory } from './google-search.js';

/* =========================================================
   BLOC 02 — ÉTAT APPLICATIF LOCAL
   ========================================================= */
let _sites = [];
let _filteredSites = [];
let _vehicleProfile = null;
let _currentFilter = 'all';
let _searchQuery = '';
let _maxDistanceKm = 100; // 100 km par défaut
let _originCoords  = null; // {lat, lon} — null = UCHAUD_COORDS

/* =========================================================
   BLOC 03 — INITIALISATION PRINCIPALE
   ========================================================= */
async function init() {
  console.log('[app] Initialisation Mes Sorties Nîmes');

  // Réseau
  initNetworkManager();
  initNetworkUI();

  // Carte
  initMap('map');

  // Navigation onglets
  initNavTabs(onPanelChange);

  // Profil véhicule
  _vehicleProfile = loadVehicleProfile();
  applyVehicleToUI(_vehicleProfile);
  initVehicleSettingsUI();

  // Chargement données
  showLoading('sites-list', 'Chargement des sites…');
  try {
    _sites = await loadSites();
    await cacheSitesLocally(_sites);
    _sites = enrichSitesWithEcoScore(_sites, _vehicleProfile);
    _filteredSites = sortSites([..._sites], 'distance');
    renderAll();
    const stats = getDataStats(_sites);
    console.log(`[app] ${stats.total} sites chargés, ${stats.withGps} avec GPS, ${stats.withoutGps} sans GPS`);
    if (stats.withoutGps > 0) showToast(`${stats.withoutGps} site(s) sans coordonnées GPS — badge affiché.`, 'warning', 5000);
  } catch(e) {
    console.error('[app] Erreur chargement sites', e);
    showToast('Erreur chargement données. Mode hors ligne activé.', 'error');
  }

  // Photos
  initPhotoUI();
  setupAutoSync(getNetworkStatus);

  // Barre recherche globale
  initGlobalSearch({
    input: document.getElementById('global-search-input'),
    clearBtn: document.getElementById('search-clear-btn'),
    suggestionsEl: document.getElementById('search-suggestions'),
    onSearch: onSearch,
    onSuggestion: onSuggestion
  });

  // Filtres rapides
  initFilterChips(onFilterChange);

  // Barre localisation + slider distance
  initLocationBar();

  // Bouton surprise
  document.getElementById('btn-surprise')?.addEventListener('click', onSurpriseClick);

  // Bouton véhicule rapide (header)
  document.getElementById('btn-vehicle-quick')?.addEventListener('click', () => switchToPanel('panel-settings'));

  // Import/export
  document.getElementById('btn-export-data')?.addEventListener('click', exportAllData);
  document.getElementById('btn-import-data')?.addEventListener('click', () =>
    document.getElementById('import-data-input')?.click());
  document.getElementById('import-data-input')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (file) await importData(file);
  });

  // Liens vérification énergie
  renderEnergyVerificationLinks();

  // Exposition globale pour popups/modales
  window.__openSiteDetail = (siteId) => {
    const site = _sites.find(s => s.id === siteId);
    if (site) openSiteDetail(site, _vehicleProfile);
  };
  window.__openGpsEdit = (siteId) => {
    openGpsEditDialog(siteId, async (id, lat, lon) => {
      _sites = await applyManualGpsCorrection(id, lat, lon, _sites);
      _sites = enrichSitesWithEcoScore(_sites, _vehicleProfile);
      renderAll();
      showToast('Coordonnées GPS mises à jour.', 'success');
    });
  };
  window.__addToDayPlan = (siteId) => {
    const site = _sites.find(s => s.id === siteId);
    if (site) showToast(`${site.destination} ajouté au programme.`, 'success');
  };
  window.__openPhotoForSite = (siteId) => switchToPanel('panel-photos');
  window.__trackGoogleSearch = (label, url) => addGoogleSearchToHistory(decodeURIComponent(label), url);
  window.__exportDayPlan = (format) => showToast('Export programme — fonctionnalité complète disponible dans les prochaines versions.', 'info');

  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => console.log('[app] Service Worker enregistré'))
      .catch(e => console.warn('[app] Service Worker non enregistré', e));
  }

  // Fermeture modale
  document.getElementById('modal-close-btn')?.addEventListener('click', closeSiteDetail);
  document.getElementById('day-plan-close-btn')?.addEventListener('click', () => {
    document.getElementById('day-plan-modal')?.classList.add('hidden');
  });
}

/* =========================================================
   BLOC 04 — RENDU GLOBAL
   ========================================================= */
function renderAll() {
  renderSiteMarkers(_filteredSites, (site) => openSiteDetail(site, _vehicleProfile));
  renderSitesList(_filteredSites, _vehicleProfile, (site) => {
    openSiteDetail(site, _vehicleProfile);
    focusOnSite(site);
  });
  const bestDeals = getBestDeals(_filteredSites, 30);
  renderEconomyPanel(bestDeals);
  renderPhotoMarkers((photo) => {
    if (photo.site_id) {
      const site = _sites.find(s => s.id === photo.site_id);
      if (site) openSiteDetail(site, _vehicleProfile);
    }
  });
}

/* =========================================================
   BLOC 05 — FILTRES ET RECHERCHE
   ========================================================= */
function onFilterChange(filterKey) {
  _currentFilter = filterKey;
  applyFiltersAndRender();
}

function onSearch(query) {
  _searchQuery = query;
  applyFiltersAndRender();
}

function onSuggestion(suggestion) {
  const input = document.getElementById('global-search-input');
  if (input) input.value = suggestion.label || '';
  if (suggestion.filter) onFilterChange(suggestion.filter);
  if (suggestion.sortBy === 'eco_score') {
    _filteredSites = sortSites(_filteredSites, 'eco_score');
    renderAll();
  }
  if (suggestion.intent === 'surprise') onSurpriseClick();
  if (suggestion.label) onSearch(suggestion.label);
}

function applyFiltersAndRender() {
  let results = [..._sites];
  results = applyFilter(results, _currentFilter);
  results = applyDistanceFilter(results, _maxDistanceKm);
  if (_searchQuery) {
    const interpreted = interpretSearchQuery(_searchQuery, results);
    results = interpreted.results;
  }
  results = sortSites(results, 'eco_score');
  _filteredSites = results;
  renderAll();
  const info = document.getElementById('list-stats');
  if (info) {
    const distLabel = _maxDistanceKm >= 150 ? 'tous rayons' : `≤ ${_maxDistanceKm} km`;
    info.textContent = `${results.length} site(s) — ${distLabel} — filtre : ${_currentFilter}`;
  }
}

/* =========================================================
   BLOC 05b — BARRE LOCALISATION + DISTANCE
   ========================================================= */
function initLocationBar() {
  // Restaurer l'état sauvegardé
  const saved = getStoredOrigin();
  _originCoords = { lat: saved.lat, lon: saved.lon };
  _maxDistanceKm = getStoredMaxKm();

  const btn    = document.getElementById('btn-gps-location');
  const label  = document.getElementById('location-label');
  const slider = document.getElementById('distance-slider');
  const display = document.getElementById('distance-display');
  const chipProche = document.getElementById('chip-proche');

  function updateLocationUI() {
    const usingGps = isUsingGps();
    if (btn) btn.classList.toggle('gps-active', usingGps);
    const origin = getStoredOrigin();
    if (label) label.textContent = origin.label;
  }

  function updateDistanceUI(km) {
    if (display) display.textContent = km >= 150 ? 'Tous' : `${km} km`;
    if (chipProche) chipProche.textContent = km >= 150 ? 'Proche (<30km)' : `Proche (<${km}km)`;
    setProcheThreshold(Math.min(km, 30));
  }

  // Initialiser UI avec valeurs sauvegardées
  if (slider) slider.value = _maxDistanceKm;
  updateDistanceUI(_maxDistanceKm);
  updateLocationUI();

  // Afficher le marqueur si une position GPS est déjà enregistrée
  if (isUsingGps()) {
    const origin = getStoredOrigin();
    showUserLocationMarker(origin.lat, origin.lon, origin.label, _maxDistanceKm < 150 ? _maxDistanceKm : null);
  }

  // Slider distance
  slider?.addEventListener('input', () => {
    const km = parseInt(slider.value, 10);
    _maxDistanceKm = km;
    saveMaxKm(km);
    updateDistanceUI(km);
    // Redessiner le cercle sur la carte
    const origin = getStoredOrigin();
    if (isUsingGps()) {
      showUserLocationMarker(origin.lat, origin.lon, origin.label, km < 150 ? km : null);
    }
    applyFiltersAndRender();
  });

  // Bouton GPS
  btn?.addEventListener('click', async () => {
    if (isUsingGps()) {
      // Basculer vers Uchaud
      clearUserLocation();
      _originCoords = { lat: ORIGIN_DEFAULT.lat, lon: ORIGIN_DEFAULT.lon };
      clearUserLocationMarker();
      _sites = recalcDistances(_sites, ORIGIN_DEFAULT.lat, ORIGIN_DEFAULT.lon);
      _sites = enrichSitesWithEcoScore(_sites, _vehicleProfile);
      updateLocationUI();
      applyFiltersAndRender();
      showToast('Point de départ : Uchaud', 'info');
      return;
    }
    // Demander la localisation GPS
    btn.classList.add('gps-loading');
    if (label) label.textContent = 'Localisation…';
    try {
      const pos = await requestUserLocation();
      saveOrigin(pos.lat, pos.lon, 'Ma position');
      _originCoords = pos;
      _sites = recalcDistances(_sites, pos.lat, pos.lon);
      _sites = enrichSitesWithEcoScore(_sites, _vehicleProfile);
      showUserLocationMarker(pos.lat, pos.lon, 'Ma position', _maxDistanceKm < 150 ? _maxDistanceKm : null);
      updateLocationUI();
      applyFiltersAndRender();
      flyToSite(pos.lat, pos.lon, 11);
      showToast('Position GPS détectée — distances recalculées.', 'success');
    } catch(err) {
      showToast(err.message, 'error');
      if (label) label.textContent = getStoredOrigin().label;
    } finally {
      btn.classList.remove('gps-loading');
    }
  });
}

/* =========================================================
   BLOC 06 — PANNEAU CHANGEMENT
   ========================================================= */
function onPanelChange(panelId) {
  if (panelId === 'panel-map') fitBoundsToSites(_filteredSites);
  if (panelId === 'panel-photos') updatePhotoPanel();
}

/* =========================================================
   BLOC 07 — MOTEUR SURPRISE
   ========================================================= */
function onSurpriseClick() {
  const profile = _vehicleProfile;
  const avoidTolls = profile?.avoid_tolls ?? true;
  const card = generateSurprise(_sites, profile, { maxKm: 80, avoidTolls });
  const html = renderSurpriseCard(card);
  const modal = document.getElementById('site-detail-modal');
  const content = document.getElementById('site-detail-content');
  if (modal && content) {
    content.innerHTML = `<h3 style="margin-bottom:12px;color:#e94560">🎲 Idée surprise !</h3>${html}`;
    modal.classList.remove('hidden');
  }
}

/* =========================================================
   BLOC 08 — PROFIL VÉHICULE UI
   ========================================================= */
function initVehicleSettingsUI() {
  // Sélection type véhicule
  document.querySelectorAll('.vtype-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vtype-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const vtype = btn.dataset.vtype;
      document.getElementById('thermal-params')?.classList.toggle('hidden', vtype === 'electric');
      document.getElementById('electric-params')?.classList.toggle('hidden', vtype === 'thermal');
    });
  });

  // Range recharge domicile
  const rangeEl = document.getElementById('home-charge-ratio');
  const displayEl = document.getElementById('home-charge-ratio-display');
  rangeEl?.addEventListener('input', () => {
    if (displayEl) displayEl.textContent = `${rangeEl.value}%`;
  });

  // Mode recharge
  document.getElementById('charge-mode')?.addEventListener('change', e => {
    const mixed = document.getElementById('mixed-charge-params');
    if (mixed) mixed.style.display = e.target.value === 'mixed' ? 'block' : 'none';
  });

  // Enregistrer véhicule
  document.getElementById('btn-save-vehicle')?.addEventListener('click', () => {
    const vtype = document.querySelector('.vtype-btn.active')?.dataset.vtype || 'unknown';
    const profile = {
      vehicle_type: vtype,
      fuel_type: document.getElementById('fuel-type')?.value || 'essence',
      thermal_consumption_l_100: parseFloat(document.getElementById('thermal-consumption')?.value) || 6.5,
      electric_consumption_kwh_100: parseFloat(document.getElementById('ev-consumption')?.value) || 17,
      fuel_price_per_liter: parseFloat(document.getElementById('fuel-price')?.value) || null,
      home_kwh_price: parseFloat(document.getElementById('home-kwh-price')?.value) || null,
      public_kwh_price: parseFloat(document.getElementById('public-kwh-price')?.value) || null,
      charge_mode: document.getElementById('charge-mode')?.value || 'home',
      home_charge_ratio: (parseInt(document.getElementById('home-charge-ratio')?.value) || 70) / 100,
      public_charge_ratio: 1 - ((parseInt(document.getElementById('home-charge-ratio')?.value) || 70) / 100),
      charging_loss_percent: parseFloat(document.getElementById('charging-loss')?.value) || 10,
      safety_margin_percent: parseFloat(document.getElementById('safety-margin')?.value) || 10,
      avoid_tolls: document.getElementById('avoid-tolls')?.checked ?? true
    };
    _vehicleProfile = saveVehicleProfile(profile);
    _sites = enrichSitesWithEcoScore(_sites, _vehicleProfile);
    renderAll();
    const status = document.getElementById('vehicle-save-status');
    if (status) { status.textContent = `✅ Profil enregistré : ${getVehicleLabel(_vehicleProfile)}`; status.style.color = '#27ae60'; }
    showToast('Véhicule enregistré — coûts recalculés.', 'success');
  });

  // Test NAS
  document.getElementById('btn-test-nas')?.addEventListener('click', async () => {
    const url = document.getElementById('nas-url')?.value?.trim();
    const key = document.getElementById('nas-api-key')?.value?.trim();
    if (!url) { showToast('Saisissez l\'URL du NAS', 'warning'); return; }
    lsSet('nas_url', url);
    lsSet('nas_api_key', key || '');
    const { checkNasHealth } = await import('./nas-api-client.js');
    const result = await checkNasHealth();
    const status = document.getElementById('nas-test-status');
    if (status) {
      status.textContent = result.ok ? '✅ NAS accessible' : `❌ ${result.reason}`;
      status.style.color = result.ok ? '#27ae60' : '#e74c3c';
    }
  });

  // Enregistrer NAS
  document.getElementById('btn-save-nas')?.addEventListener('click', () => {
    lsSet('nas_url', document.getElementById('nas-url')?.value?.trim() || '');
    lsSet('nas_api_key', document.getElementById('nas-api-key')?.value?.trim() || '');
    showToast('Configuration NAS enregistrée.', 'success');
  });

  // Pré-remplir avec profil existant
  applyVehicleToUI(_vehicleProfile);
}

function applyVehicleToUI(profile) {
  if (!profile || profile.vehicle_type === 'unknown') return;
  const vtypeBtn = document.querySelector(`[data-vtype="${profile.vehicle_type}"]`);
  if (vtypeBtn) {
    document.querySelectorAll('.vtype-btn').forEach(b => b.classList.remove('active'));
    vtypeBtn.classList.add('active');
  }
  const thermalEl = document.getElementById('thermal-params');
  const electricEl = document.getElementById('electric-params');
  if (thermalEl) thermalEl.classList.toggle('hidden', profile.vehicle_type === 'electric');
  if (electricEl) electricEl.classList.toggle('hidden', profile.vehicle_type === 'thermal');
  const setCond = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  setCond('fuel-type', profile.fuel_type);
  setCond('thermal-consumption', profile.thermal_consumption_l_100);
  setCond('fuel-price', profile.fuel_price_per_liter);
  setCond('ev-consumption', profile.electric_consumption_kwh_100);
  setCond('home-kwh-price', profile.home_kwh_price);
  setCond('public-kwh-price', profile.public_kwh_price);
  setCond('charge-mode', profile.charge_mode);
  setCond('charging-loss', profile.charging_loss_percent);
  setCond('safety-margin', profile.safety_margin_percent);
  const avoidEl = document.getElementById('avoid-tolls');
  if (avoidEl) avoidEl.checked = profile.avoid_tolls !== false;
  const nasUrl = lsGet('nas_url');
  if (nasUrl) { const el = document.getElementById('nas-url'); if (el) el.value = nasUrl; }
}

/* =========================================================
   BLOC 09 — PHOTOS UI
   ========================================================= */
function initPhotoUI() {
  const photoInput = document.getElementById('photo-file-input');
  document.getElementById('btn-take-photo')?.addEventListener('click', () => {
    if (photoInput) { photoInput.accept = 'image/*'; photoInput.capture = 'environment'; photoInput.click(); }
  });
  document.getElementById('btn-import-photo')?.addEventListener('click', () => {
    if (photoInput) { photoInput.removeAttribute('capture'); photoInput.click(); }
  });
  photoInput?.addEventListener('change', async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    showToast(`Import de ${files.length} photo(s)…`, 'info');
    const imported = await importPhotos(files, _sites, (cur, tot) => {
      const status = document.getElementById('photo-sync-status');
      if (status) status.textContent = `Import photo ${cur}/${tot}…`;
    });
    for (const photo of imported) await schedulePhotoForSync(photo);
    updatePhotoPanel();
    showToast(`${imported.length} photo(s) importée(s) et sauvegardée(s).`, 'success');
    photoInput.value = '';
  });

  document.getElementById('btn-sync-photos')?.addEventListener('click', async () => {
    const status = document.getElementById('photo-sync-status');
    if (status) status.textContent = '☁️ Synchronisation en cours…';
    const result = await syncPendingPhotos((p) => {
      if (status) status.textContent = `☁️ Photo ${p.current}/${p.total} : ${p.filename}`;
    });
    const msg = result.ok
      ? `✅ ${result.synced} photo(s) synchronisée(s)${result.errors > 0 ? ` — ${result.errors} erreur(s)` : ''}`
      : `❌ ${result.reason}`;
    if (status) { status.textContent = msg; status.style.color = result.ok ? '#27ae60' : '#e74c3c'; }
    showToast(msg, result.ok ? 'success' : 'error');
  });
}

async function updatePhotoPanel() {
  const grid = document.getElementById('photos-grid');
  if (!grid) return;
  const photos = await loadAllPhotos();
  const status = document.getElementById('photo-sync-status');
  const syncStats = await getSyncStatus();
  if (status) status.textContent = `${syncStats.total_photos} photo(s) — ${syncStats.synced_photos} synchronisée(s) — ${syncStats.pending} en attente`;

  if (!photos.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📷</div><div class="empty-state-text">Aucune photo</div><div class="empty-state-sub">Prenez une photo ou importez depuis votre galerie</div></div>';
    return;
  }
  grid.innerHTML = photos.map(photo => `
    <div class="photo-thumb ${photo.sync_status === 'synced' ? 'photo-synced' : 'photo-pending'}"
         onclick="window.__viewPhoto('${photo.id}')">
      ${photo.thumbnail ? `<img src="${photo.thumbnail}" alt="${photo.filename}" loading="lazy" />` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:30px">📷</div>'}
      <div class="photo-thumb-badge">${photo.sync_status === 'synced' ? '✅' : '⏳'}</div>
    </div>`).join('');

  window.__viewPhoto = (id) => {
    const photo = photos.find(p => p.id === id);
    if (photo?.site_id) window.__openSiteDetail(photo.site_id);
  };
}

/* =========================================================
   BLOC 10 — LIENS VÉRIFICATION ÉNERGIE
   ========================================================= */
function renderEnergyVerificationLinks() {
  const container = document.getElementById('energy-verification-links');
  if (!container) return;
  const links = buildVerificationLinks(_vehicleProfile);
  container.innerHTML = links.map(l =>
    `<a href="${l.url}" target="_blank" rel="noopener noreferrer" class="verification-link-btn">${l.icon} ${l.label}</a>`
  ).join('');
}

/* =========================================================
   BLOC 11 — DÉMARRAGE
   ========================================================= */
document.addEventListener('DOMContentLoaded', init);
