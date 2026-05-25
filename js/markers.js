/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { getMarkersLayer, createSiteIcon, flyToSite } from './map.js';
import { formatCurrency, formatDistance, buildWazeLink, buildGoogleMapsLink } from './utils.js';
import { setState } from './state.js';

/* =========================================================
   BLOC 02 — RENDU MARQUEURS SITES
   ========================================================= */
export function renderSiteMarkers(sites, onSiteClick) {
  const layer = getMarkersLayer();
  if (!layer) return;
  layer.clearLayers();

  const withGps = sites.filter(s => s.has_gps);
  withGps.forEach(site => {
    const marker = L.marker([site.lat, site.lon], { icon: createSiteIcon(site) });
    marker.bindPopup(buildSitePopupHtml(site), { maxWidth: 280, className: 'site-popup' });
    marker.on('click', () => {
      setState({ selectedSite: site });
      if (onSiteClick) onSiteClick(site);
    });
    layer.addLayer(marker);
  });

  return withGps.length;
}

/* =========================================================
   BLOC 03 — POPUP HTML
   ========================================================= */
function buildSitePopupHtml(site) {
  const badges = buildSiteBadges(site);
  const wazeUrl = buildWazeLink(site.lat, site.lon, site.destination);
  const gmapsUrl = buildGoogleMapsLink(site.lat, site.lon, site.destination);

  return `
    <div class="popup-title">${site.destination || site.nom || 'Site'}</div>
    <div style="font-size:12px;color:#aaa;margin:2px 0">${site.secteur || ''} ${site.distance_km ? '· ' + site.distance_km + ' km' : ''}</div>
    <div class="popup-badges">${badges}</div>
    ${site.programme_court ? `<div style="font-size:13px;margin:4px 0;line-height:1.4">${site.programme_court.substring(0,120)}${site.programme_court.length>120?'…':''}</div>` : ''}
    <div class="popup-actions">
      <button class="popup-btn" onclick="window.__openSiteDetail('${site.id}')">📋 Fiche</button>
      ${wazeUrl ? `<a class="popup-btn secondary" href="${wazeUrl}" target="_blank">🚗 Waze</a>` : ''}
      ${gmapsUrl ? `<a class="popup-btn secondary" href="${gmapsUrl}" target="_blank">🗺️ Maps</a>` : ''}
    </div>`;
}

/* =========================================================
   BLOC 04 — BADGES SITE
   ========================================================= */
export function buildSiteBadges(site) {
  const tags = [];
  const budget = (site.budget_indicatif || '').toLowerCase();
  const vigilance = (site.vigilance || '').toLowerCase();

  if (budget.includes('gratu') || site.gratuit) tags.push('<span class="badge badge-gratuit">Gratuit</span>');
  if (budget.includes('faible') || budget.includes('peu')) tags.push('<span class="badge badge-eco">Petit budget</span>');
  if (site.distance_km && site.distance_km < 25) tags.push('<span class="badge badge-proche">Proche</span>');
  if (vigilance.includes('sans péage') || vigilance.includes('sans peage') || site.sans_peage) {
    tags.push('<span class="badge badge-sans-peage">Sans péage</span>');
  }
  if (vigilance.includes('péage') && !vigilance.includes('sans')) {
    tags.push('<span class="badge badge-warning">⚠️ Péage possible</span>');
  }
  if (site.has_gps === false || !site.has_gps) {
    tags.push('<span class="badge badge-gps-missing">📍 GPS à compléter</span>');
  }
  if (site.priorite === 1 || site.priorite === '1' || site.priorite === 'haute') {
    tags.push('<span class="badge badge-priority">⭐ Priorité</span>');
  }
  return tags.join('') || '';
}

/* =========================================================
   BLOC 05 — FOCUS SUR UN SITE
   ========================================================= */
export function focusOnSite(site) {
  if (!site?.has_gps) return;
  flyToSite(site.lat, site.lon, 14);
}
