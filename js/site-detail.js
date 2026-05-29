/* =========================================================
   BLOC 01 â€” IMPORTS
   ========================================================= */
import { enrichSiteInfo, buildWhatToDoList, estimateVisitDuration } from './site-insights.js';
import { buildSiteBadges } from './markers.js';
import { buildWazeLink, buildGoogleMapsLink, buildAppleMapsLink } from './utils.js';
import { toggleVisited, isVisited } from './visited.js';

/* =========================================================
   BLOC 02 â€” OUVERTURE / FERMETURE
   ========================================================= */
export function openSiteDetail(site, vehicleProfile) {
  const modal   = document.getElementById('site-detail-modal');
  const content = document.getElementById('site-detail-content');
  if (!modal || !content) return;

  content.innerHTML = buildSiteDetailHtml(enrichSiteInfo(site));
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Bouton "DÃ©jÃ  visitÃ©"
  const visitBtn = content.querySelector('#btn-mark-visited');
  if (visitBtn) {
    visitBtn.addEventListener('click', () => {
      const now = toggleVisited(site.id);
      visitBtn.textContent = now ? 'âœ… DÃ©jÃ  visitÃ©' : 'ðŸ‘ï¸ Marquer comme vu';
      visitBtn.classList.toggle('visited-active', now);
    });
  }

  document.getElementById('modal-close-btn')?.addEventListener('click', closeSiteDetail);
  modal.querySelector('.modal-overlay')?.addEventListener('click', closeSiteDetail);
}

export function closeSiteDetail() {
  const modal = document.getElementById('site-detail-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

/* =========================================================
   BLOC 03 â€” HTML FICHE SITE (design refondu)
   ========================================================= */
function buildSiteDetailHtml(site) {
  const distStr  = site.distance_km ? `${site.distance_km} km` : null;
  const duration = estimateVisitDuration(site);
  const visited  = isVisited(site.id);

  // Navigation GPS
  const waze  = buildWazeLink(site.lat, site.lon, site.destination);
  const gmaps = buildGoogleMapsLink(site.lat, site.lon, site.destination);
  const apple = buildAppleMapsLink(site.lat, site.lon, site.destination);

  const navHtml = site.has_gps ? `
    <div class="sd-nav-row">
      ${waze  ? `<a class="sd-nav-btn sd-nav-waze"  href="${waze}"  target="_blank" rel="noopener">ðŸš— Waze</a>` : ''}
      ${gmaps ? `<a class="sd-nav-btn sd-nav-gmaps" href="${gmaps}" target="_blank" rel="noopener">ðŸ—ºï¸ Maps</a>` : ''}
      ${apple ? `<a class="sd-nav-btn sd-nav-apple" href="${apple}" target="_blank" rel="noopener">ðŸŽ Plans</a>` : ''}
    </div>` : `<p class="sd-no-gps">ðŸ“ CoordonnÃ©es GPS Ã  complÃ©ter
      <button class="sd-gps-btn" onclick="window.__openGpsEdit('${site.id}')">Saisir GPS</button></p>`;

  // Infos rapides (pills)
  const pills = [];
  if (site._gratuit)       pills.push('<span class="sd-pill sd-pill-green">âœ… Gratuit</span>');
  else if (site.budget_indicatif) pills.push(`<span class="sd-pill sd-pill-blue">ðŸ’¶ ${site.budget_indicatif.substring(0,40)}</span>`);
  if (site._sans_peage)    pills.push('<span class="sd-pill sd-pill-green">ðŸ›£ï¸ Sans pÃ©age</span>');
  else if (site._peage_probable) pills.push('<span class="sd-pill sd-pill-orange">ðŸ›£ï¸ PÃ©age possible</span>');
  if (site._parking_gratuit) pills.push('<span class="sd-pill sd-pill-green">ðŸ…¿ï¸ Parking gratuit</span>');
  if (site._famille)       pills.push('<span class="sd-pill sd-pill-blue">ðŸ‘¨â€ðŸ‘©â€ðŸ‘§ Famille</span>');
  if (site._photo)         pills.push('<span class="sd-pill sd-pill-blue">ðŸ“¸ Photo</span>');
  if (site._pique_nique)   pills.push('<span class="sd-pill sd-pill-blue">ðŸ§º Pique-nique</span>');
  if (site._reservation)   pills.push('<span class="sd-pill sd-pill-orange">ðŸ“ž RÃ©servation conseillÃ©e</span>');

  // Sections de contenu
  const whatToDo = buildWhatToDoList(site);
  const sectionsHtml = whatToDo.map(item => `
    <div class="sd-section">
      <div class="sd-section-title">${_sectionIcon(item.category)} ${item.category}</div>
      <div class="sd-section-body">${item.content}</div>
    </div>`).join('');

  // Budget simplifiÃ© (sans Ã©nergie vÃ©hicule)
  const budgetRows = [];
  if (site._gratuit) budgetRows.push({ label: 'EntrÃ©e', value: 'Gratuit', ok: true });
  else if (site.budget_indicatif) budgetRows.push({ label: 'Budget', value: site.budget_indicatif.substring(0, 60) });
  if (site._parking_gratuit) budgetRows.push({ label: 'Parking', value: 'Gratuit', ok: true });
  else if (site.vigilance?.toLowerCase().includes('parking')) budgetRows.push({ label: 'Parking', value: 'Ã€ vÃ©rifier sur place' });
  if (site._sans_peage) budgetRows.push({ label: 'PÃ©age', value: 'Aucun', ok: true });
  else if (site._peage_probable) budgetRows.push({ label: 'PÃ©age', value: 'Probable', warn: true });

  const budgetHtml = budgetRows.length ? `
    <div class="sd-section">
      <div class="sd-section-title">ðŸ’° Budget indicatif</div>
      <div class="sd-budget-grid">
        ${budgetRows.map(r => `
          <div class="sd-budget-row">
            <span class="sd-budget-label">${r.label}</span>
            <span class="sd-budget-val ${r.ok ? 'ok' : r.warn ? 'warn' : ''}">${r.value}</span>
          </div>`).join('')}
      </div>
      <p class="sd-disclaimer">â„¹ï¸ VÃ©rifiez les tarifs sur place â€” ils peuvent changer.</p>
    </div>` : '';

  return `
    <div class="sd-wrapper">

      <!-- HERO -->
      <div class="sd-hero">
        <div class="sd-title">${site.destination || site.nom || 'Site'}</div>
        <div class="sd-meta">
          ${site.secteur ? `<span>${site.secteur}</span>` : ''}
          ${distStr ? `<span>ðŸ“ ${distStr} depuis Nages</span>` : ''}
          ${duration ? `<span>â± ${duration}</span>` : ''}
        </div>
        <div class="sd-badges">${buildSiteBadges(site)}</div>
      </div>

      <!-- NAVIGATION -->
      <div class="sd-block">
        <div class="sd-block-title">ðŸ§­ AccÃ¨s</div>
        ${navHtml}
      </div>

      <!-- PILLS INFO -->
      ${pills.length ? `<div class="sd-pills">${pills.join('')}</div>` : ''}

      <!-- CONTENU -->
      ${sectionsHtml}

      <!-- BUDGET -->
      ${budgetHtml}

      <!-- ACTIONS -->
      <div class="sd-actions">
        <button id="btn-mark-visited" class="sd-action-btn ${visited ? 'visited-active' : ''}">
          ${visited ? 'âœ… DÃ©jÃ  visitÃ©' : 'ðŸ‘ï¸ Marquer comme vu'}
        </button>
        <button class="sd-action-btn sd-action-plan" onclick="window.__addToDayPlan('${site.id}')">
          ðŸ“… Ajouter au programme
        </button>
        <button class="sd-action-btn sd-action-photo" onclick="window.__openPhotoForSite('${site.id}')">
          ðŸ“· Photos
        </button>
      </div>

      <p class="sd-footer-note">âš ï¸ Informations indicatives â€” vÃ©rifiez horaires et accÃ¨s avant la sortie.</p>
    </div>`;
}

function _sectionIcon(category) {
  const map = {
    'Programme': 'ðŸŽ¯', 'Points forts': 'â­', 'Niveau de marche': 'ðŸ¥¾',
    'Ã€ savoir avant': 'ðŸ’¡', 'Informations pratiques': 'ðŸ“‹'
  };
  return map[category] || 'ðŸ“Œ';
}

/* =========================================================
   BLOC 04 â€” DIALOG GPS
   ========================================================= */
export function openGpsEditDialog(siteId, onSave) {
  const lat = prompt('Latitude (ex: 43.8367) :');
  const lon = prompt('Longitude (ex: 4.3601) :');
  if (lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
    onSave(siteId, parseFloat(lat), parseFloat(lon));
  }
}
