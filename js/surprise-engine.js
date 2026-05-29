/* =========================================================
   BLOC 01 â€” IMPORTS ET CONFIG
   ========================================================= */
import { getBestDeals } from './economy-engine.js';
import { estimateTripEnergyCost } from './trip-energy-estimator.js';
import { formatCurrency } from './utils.js';
import { filterUnvisited } from './visited.js';

/* =========================================================
   BLOC 02 â€” GÃ‰NÃ‰RATION D'UNE IDÃ‰E SURPRISE
   ========================================================= */
export function generateSurprise(sites, vehicleProfile, options = {}) {
  const { maxBudget = 30, maxKm = 60, preferGratuit = false, avoidTolls = true } = options;

  let candidates = filterUnvisited([...sites]).filter(s => s.has_gps || s.distance_km != null);

  // Filtres prÃ©fÃ©rentiels
  if (preferGratuit) candidates = candidates.filter(s => (s.budget_indicatif||'').toLowerCase().includes('gratu'));
  if (maxKm) candidates = candidates.filter(s => s.distance_km == null || s.distance_km <= maxKm);
  if (avoidTolls) {
    const sansPeage = candidates.filter(s => (s.vigilance||'').includes('sans pÃ©age'));
    if (sansPeage.length > 0) candidates = sansPeage;
  }

  // Filtrer par budget Ã©nergie
  if (vehicleProfile && vehicleProfile.vehicle_type !== 'unknown') {
    candidates = candidates.filter(site => {
      if (!site.distance_km) return true;
      const energy = estimateTripEnergyCost(site, site.distance_km, vehicleProfile);
      if (!energy?.total_cost) return true;
      return energy.total_cost <= maxBudget * 0.4; // Ã©nergie max 40% du budget
    });
  }

  if (candidates.length === 0) candidates = [...sites];

  // SÃ©lection alÃ©atoire parmi les meilleurs
  const pool = getBestDeals(candidates, Math.min(15, candidates.length));
  if (pool.length === 0) return null;

  const site = pool[Math.floor(Math.random() * Math.min(8, pool.length))];
  return buildSurpriseCard(site, vehicleProfile);
}

/* =========================================================
   BLOC 03 â€” CARTE SURPRISE
   ========================================================= */
function buildSurpriseCard(site, vehicleProfile) {
  const energy = vehicleProfile && site.distance_km
    ? estimateTripEnergyCost(site, site.distance_km, vehicleProfile)
    : null;

  const tags = [];
  if ((site.budget_indicatif||'').toLowerCase().includes('gratu')) tags.push('Gratuit ðŸŸ¢');
  if ((site.vigilance||'').includes('sans pÃ©age')) tags.push('Sans pÃ©age ðŸ”µ');
  if (site.distance_km && site.distance_km < 30) tags.push('TrÃ¨s proche ðŸ“');
  if (energy?.total_cost != null && energy.total_cost < 8) tags.push(`Trajet ~${formatCurrency(energy.total_cost)} ðŸ’°`);

  return {
    site,
    tags,
    energy,
    headline: buildSurpriseHeadline(site, energy),
    tip: buildSurpriseTip(site)
  };
}

/* =========================================================
   BLOC 04 â€” TITRES ET CONSEILS
   ========================================================= */
function buildSurpriseHeadline(site, energy) {
  const headlines = [
    `ðŸŽ¯ Et si on allait Ã  ${site.destination} ?`,
    `âœ¨ Coup de cÅ“ur : ${site.destination}`,
    `ðŸ—ºï¸ IdÃ©e du jour : ${site.destination}`,
    `ðŸ’¡ DÃ©couvrir ${site.destination}`,
    `ðŸŽ² Surprise : ${site.destination}`
  ];
  return headlines[Math.floor(Math.random() * headlines.length)];
}

function buildSurpriseTip(site) {
  const tips = [];
  const budget = (site.budget_indicatif||'').toLowerCase();
  if (budget.includes('gratu')) tips.push('EntrÃ©e gratuite signalÃ©e.');
  if (budget.includes('pique') || (site.programme_court||'').toLowerCase().includes('pique')) tips.push('IdÃ©al pour un pique-nique.');
  if ((site.niveau_marche||'').toLowerCase().includes('facile')) tips.push('Marche facile.');
  if ((site.vigilance||'').includes('sans pÃ©age')) tips.push('Pas de pÃ©age sur le trajet probable.');
  return tips.join(' ') || 'DÃ©couverte Ã  confirmer sur place.';
}

/* =========================================================
   BLOC 05 â€” MINI-PROGRAMME SURPRISE
   ========================================================= */
export function buildSurpriseMiniProgram(site) {
  const steps = [];
  steps.push({ time: '09h00', label: `DÃ©part depuis Nages vers ${site.destination}`, icon: 'ðŸš—' });
  if (site.distance_km && site.distance_km > 30) {
    steps.push({ time: '~10h00', label: `ArrivÃ©e Ã  ${site.destination}`, icon: 'ðŸ“' });
  } else {
    steps.push({ time: '~09h30', label: `ArrivÃ©e Ã  ${site.destination}`, icon: 'ðŸ“' });
  }
  if (site.programme_court) {
    steps.push({ time: '10h00â€“13h00', label: site.programme_court.substring(0, 100), icon: 'ðŸŽ¯' });
  }
  steps.push({ time: '13h00', label: 'Pause repas (pique-nique ou restaurant)', icon: 'ðŸ½ï¸' });
  steps.push({ time: '14h00â€“17h00', label: 'Suite de la visite ou balade', icon: 'ðŸš¶' });
  steps.push({ time: '17h00', label: 'Retour vers Nages', icon: 'ðŸ ' });
  return steps;
}

/* =========================================================
   BLOC 06 â€” RENDU HTML
   ========================================================= */
export function renderSurpriseCard(card) {
  if (!card) return '<p class="info-disclaimer">Aucune surprise disponible avec ces critÃ¨res.</p>';
  const { site, tags, energy, headline, tip } = card;
  const tagHtml = tags.map(t => `<span class="badge badge-eco">${t}</span>`).join(' ');
  const energyStr = energy?.total_cost != null ? `Trajet estimÃ© : ${formatCurrency(energy.total_cost)}` : 'Configurer le vÃ©hicule pour estimer le trajet';

  return `
    <div class="site-card" style="border-color:#e94560;cursor:pointer" onclick="window.__openSiteDetail('${site.id}')">
      <div class="site-name">${headline}</div>
      <div class="site-sector">${site.secteur || ''} ${site.distance_km ? 'Â· ' + site.distance_km + ' km' : ''}</div>
      <div class="site-badges" style="margin:8px 0">${tagHtml}</div>
      <div class="site-summary">${site.programme_court ? site.programme_court.substring(0,150)+'â€¦' : ''}</div>
      <div class="site-summary" style="margin-top:4px;color:#f5a623">ðŸ’¡ ${tip}</div>
      <div class="site-footer" style="margin-top:10px">
        <span class="site-energy-cost">âš¡ ${energyStr}</span>
        <span class="badge badge-eco">Score Ã©co : ${site.eco_score || 'â€”'}/100</span>
      </div>
    </div>`;
}
