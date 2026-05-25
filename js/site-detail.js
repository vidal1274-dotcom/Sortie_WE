/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { enrichSiteInfo, buildWhatToDoList, estimateVisitDuration } from './site-insights.js';
import { renderInsightsSection, buildInsightLinks } from './external-insights.js';
import { buildBudget, renderBudget } from './budget-estimator.js';
import { buildSiteBadges } from './markers.js';
import { buildWazeLink, buildGoogleMapsLink, buildAppleMapsLink, formatDistance } from './utils.js';
import { renderTripEnergyCost, compareAllScenarios, buildEnergyVerificationLinks } from './trip-energy-estimator.js';
import { renderConfidenceBadge } from './source-confidence.js';

/* =========================================================
   BLOC 02 — OUVERTURE MODALE
   ========================================================= */
export function openSiteDetail(site, vehicleProfile) {
  const modal = document.getElementById('site-detail-modal');
  const content = document.getElementById('site-detail-content');
  if (!modal || !content) return;

  const enriched = enrichSiteInfo(site);
  content.innerHTML = buildSiteDetailHtml(enriched, vehicleProfile);
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Fermeture
  document.getElementById('modal-close-btn')?.addEventListener('click', closeSiteDetail);
  modal.querySelector('.modal-overlay')?.addEventListener('click', closeSiteDetail);
}

export function closeSiteDetail() {
  const modal = document.getElementById('site-detail-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

/* =========================================================
   BLOC 03 — HTML COMPLET FICHE SITE
   ========================================================= */
function buildSiteDetailHtml(site, vehicleProfile) {
  const badges = buildSiteBadges(site);
  const distStr = site.distance_km ? `${site.distance_km} km depuis Uchaud` : 'Distance inconnue';
  const duration = estimateVisitDuration(site);
  const whatToDo = buildWhatToDoList(site);

  // GPS links
  const waze = buildWazeLink(site.lat, site.lon, site.destination);
  const gmaps = buildGoogleMapsLink(site.lat, site.lon, site.destination);
  const apple = buildAppleMapsLink(site.lat, site.lon, site.destination);
  const gpsLinks = site.has_gps ? `
    <div class="action-links">
      ${waze ? `<a class="action-link waze" href="${waze}" target="_blank">🚗 Waze</a>` : ''}
      ${gmaps ? `<a class="action-link gmaps" href="${gmaps}" target="_blank">🗺️ Google Maps</a>` : ''}
      ${apple ? `<a class="action-link apple" href="${apple}" target="_blank"> Apple Plans</a>` : ''}
    </div>` : `<p class="badge badge-gps-missing">📍 Coordonnées GPS à compléter</p>
    <button class="gps-missing-btn" onclick="window.__openGpsEdit('${site.id}')">Saisir les coordonnées</button>`;

  // Budget
  const budget = buildBudget(site, site.distance_km, vehicleProfile, {});
  const budgetHtml = renderBudget(budget);

  // Énergie comparaison
  let energyCompareHtml = '';
  if (site.distance_km && vehicleProfile) {
    const compare = compareAllScenarios(site.distance_km, vehicleProfile);
    if (compare.scenarios.length > 1) {
      const rows = compare.scenarios.map(s =>
        `<div class="compare-row ${compare.cheapest?.label === s.label ? 'best' : ''}">
          <span>${s.label}</span>
          <span>${s.total_cost != null ? s.total_cost.toFixed(2)+' €' : 'À calculer'}</span>
        </div>`).join('');
      energyCompareHtml = `
        <div class="energy-comparison">
          <div class="energy-comparison-title">⚡ Comparaison énergie tous scénarios</div>
          ${rows}
          ${compare.cheapest ? `<div style="margin-top:6px;color:#27ae60;font-size:13px">✅ Option la moins chère estimée : ${compare.cheapest.label}</div>` : ''}
          <p class="compare-disclaimer">${compare.disclaimer}</p>
        </div>`;
    }
  }

  // Vérification énergie links
  const energyLinks = buildEnergyVerificationLinks(vehicleProfile, site);
  const energyLinksHtml = energyLinks.map(l => `<a href="${l.url}" target="_blank" class="action-link">${l.label}</a>`).join('');

  // Tout ce qu'il y a à faire
  const todoHtml = whatToDo.map(item =>
    `<div class="detail-section">
      <h4>${item.category}</h4>
      <p>${item.content}</p>
      ${!item.verified ? '<span class="verify-tag">Informations à confirmer</span>' : ''}
    </div>`).join('');

  // Insights visiteurs
  const insightsHtml = renderInsightsSection(site);

  // Qualité données
  const quality = site._data_quality;
  const qualityBadge = quality.score >= 80
    ? '<span class="badge badge-eco">Données complètes</span>'
    : quality.score >= 50
    ? '<span class="badge badge-warning">Données partielles</span>'
    : '<span class="badge badge-danger">Données à compléter</span>';

  return `
    <div class="site-detail-title">${site.destination || site.nom || 'Site'}</div>
    <div class="site-detail-subtitle">${site.secteur || ''} · ${distStr} · ${duration}</div>
    <div class="site-badges">${badges} ${qualityBadge}</div>

    <div class="detail-section">
      <h4>📍 Accès et navigation</h4>
      ${gpsLinks}
    </div>

    ${todoHtml}

    ${budgetHtml}
    ${energyCompareHtml}

    <div class="detail-section">
      <h4>⚡ Vérifier les prix énergie</h4>
      <div class="action-links">${energyLinksHtml}</div>
    </div>

    ${insightsHtml}

    <div class="detail-section">
      <div class="action-links">
        <button class="action-link" onclick="window.__addToDayPlan('${site.id}')">📅 Ajouter au programme</button>
        <button class="action-link" onclick="window.__openPhotoForSite('${site.id}')">📷 Voir photos</button>
      </div>
    </div>

    <div style="margin-top:16px;padding:10px;background:rgba(0,0,0,0.2);border-radius:8px;font-size:12px;color:#aaa;line-height:1.6">
      ⚠️ Toutes les informations de cette fiche sont issues du fichier Excel source et de calculs estimatifs.
      Vérifiez horaires, tarifs, accès et conditions avant chaque sortie.
      Les prix carburant et recharge changent régulièrement.
    </div>`;
}

/* =========================================================
   BLOC 04 — DIALOG SAISIE GPS
   ========================================================= */
export function openGpsEditDialog(siteId, onSave) {
  const lat = prompt('Latitude (ex: 43.8367) :');
  const lon = prompt('Longitude (ex: 4.3601) :');
  if (lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
    onSave(siteId, parseFloat(lat), parseFloat(lon));
  }
}
