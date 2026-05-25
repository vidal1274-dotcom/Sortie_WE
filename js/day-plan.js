/* =========================================================
   BLOC 01 — ÉTAT PROGRAMME
   ========================================================= */
import { formatCurrency } from './utils.js';
import { estimateTripEnergyCost } from './trip-energy-estimator.js';

let _currentPlan = { sites: [], options: {} };

/* =========================================================
   BLOC 02 — GESTION PROGRAMME
   ========================================================= */
export function addSiteToPlan(site) {
  if (_currentPlan.sites.find(s => s.id === site.id)) return false;
  _currentPlan.sites.push(site);
  return true;
}
export function removeSiteFromPlan(siteId) {
  _currentPlan.sites = _currentPlan.sites.filter(s => s.id !== siteId);
}
export function getPlan() { return _currentPlan; }
export function clearPlan() { _currentPlan = { sites: [], options: {} }; }

/* =========================================================
   BLOC 03 — GÉNÉRATION PROGRAMME
   ========================================================= */
export function generateDayPlan(sites, vehicleProfile, options = {}) {
  const steps = [];
  let currentTime = 9 * 60; // 9h00 en minutes

  steps.push({ time: formatTime(currentTime), icon: '🚗', label: 'Départ depuis Uchaud', type: 'depart' });

  sites.forEach((site, idx) => {
    const travelMin = site.distance_km ? Math.round(site.distance_km * 1.2) : 30;
    currentTime += travelMin;
    steps.push({ time: formatTime(currentTime), icon: '📍', label: `Arrivée : ${site.destination}`, type: 'arrival', site });
    currentTime += 30;
    if (site.programme_court) {
      steps.push({ time: formatTime(currentTime), icon: '🎯', label: site.programme_court.substring(0, 120), type: 'activity', site });
    }
    currentTime += 120;
    if (idx < sites.length - 1) {
      steps.push({ time: formatTime(currentTime), icon: '🍽️', label: 'Pause repas recommandée', type: 'meal' });
      currentTime += 60;
    }
  });

  steps.push({ time: formatTime(currentTime), icon: '🏠', label: 'Retour vers Uchaud', type: 'return' });

  return { steps, total_sites: sites.length, estimated_duration_min: currentTime - 9 * 60 };
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}`;
}

/* =========================================================
   BLOC 04 — RENDU HTML
   ========================================================= */
export function renderDayPlan(plan) {
  const stepsHtml = plan.steps.map(s =>
    `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <span style="min-width:50px;font-size:13px;color:#aaa">${s.time}</span>
      <span>${s.icon}</span>
      <span style="font-size:14px">${s.label}</span>
    </div>`).join('');

  return `<div>
    <h3 style="margin-bottom:12px">📅 Programme de la journée</h3>
    ${stepsHtml}
    <div style="margin-top:12px;font-size:12px;color:#aaa">
      ⚠️ Horaires indicatifs — ajustez selon les horaires d'ouverture réels.
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button class="btn-secondary" onclick="window.__exportDayPlan('text')">📋 Copier texte</button>
      <button class="btn-secondary" onclick="window.__exportDayPlan('json')">📦 Exporter JSON</button>
    </div>
  </div>`;
}

/* =========================================================
   BLOC 05 — EXPORT
   ========================================================= */
export function exportPlanAsText(plan) {
  return plan.steps.map(s => `${s.time} — ${s.label}`).join('\n');
}
export function exportPlanAsJson(plan) {
  return JSON.stringify(plan, null, 2);
}
