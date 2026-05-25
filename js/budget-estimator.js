/* =========================================================
   BLOC 01 — STRUCTURE BUDGET
   ========================================================= */
import { estimateTripEnergyCost } from './trip-energy-estimator.js';
import { formatCurrency } from './utils.js';
import { renderTripEnergyCost } from './trip-energy-estimator.js';

export function buildBudget(site, distanceKm, vehicleProfile, options = {}) {
  const budget = {
    items: [],
    total_low: 0,
    total_mid: 0,
    total_high: 0,
    has_uncertain: false,
    energy: null
  };

  /* =========================================================
     BLOC 02 — COÛT ÉNERGIE TRAJET
     ========================================================= */
  if (distanceKm && vehicleProfile) {
    const energy = estimateTripEnergyCost(site, distanceKm, vehicleProfile);
    budget.energy = energy;
    if (energy?.total_cost != null) {
      const tc = energy.total_cost;
      budget.items.push({
        label: `Énergie trajet (${energy.type === 'electric' ? '⚡' : '⛽'})`,
        low: tc * 0.9, mid: tc, high: tc * 1.1,
        verified: false, source: 'Estimatif — voir prix réels'
      });
    } else {
      budget.items.push({ label: 'Énergie trajet', low: null, mid: null, high: null, verified: false, source: 'Véhicule non configuré' });
      budget.has_uncertain = true;
    }
  }

  /* =========================================================
     BLOC 03 — PÉAGE
     ========================================================= */
  const vigilance = (site.vigilance || '').toLowerCase();
  if (vigilance.includes('péage') && !vigilance.includes('sans péage')) {
    budget.items.push({ label: 'Péage', low: 3, mid: 8, high: 15, verified: false, source: 'À vérifier sur sanef.com' });
    budget.has_uncertain = true;
  } else if (vigilance.includes('sans péage')) {
    budget.items.push({ label: 'Péage', low: 0, mid: 0, high: 0, verified: true, note: 'Sans péage probable' });
  }

  /* =========================================================
     BLOC 04 — PARKING
     ========================================================= */
  const budgetText = (site.budget_indicatif || '').toLowerCase();
  if (budgetText.includes('parking gratuit') || vigilance.includes('parking gratuit')) {
    budget.items.push({ label: 'Parking', low: 0, mid: 0, high: 0, verified: false, note: 'Gratuit signalé (à confirmer)' });
  } else if (budgetText.includes('parking')) {
    budget.items.push({ label: 'Parking', low: 2, mid: 4, high: 8, verified: false, source: 'À vérifier sur place' });
    budget.has_uncertain = true;
  }

  /* =========================================================
     BLOC 05 — ENTRÉE / VISITE
     ========================================================= */
  if (budgetText.includes('gratu') || budgetText.includes('libre')) {
    budget.items.push({ label: 'Visites', low: 0, mid: 0, high: 0, verified: false, note: 'Gratuit signalé (à confirmer)' });
  } else if (site.budget_min != null) {
    budget.items.push({ label: 'Visites', low: site.budget_min, mid: (site.budget_min + (site.budget_max || site.budget_min)) / 2, high: site.budget_max || site.budget_min, verified: false, source: 'Budget indicatif Excel' });
  } else {
    budget.items.push({ label: 'Visites', low: null, mid: null, high: null, verified: false, source: 'À vérifier sur place' });
    budget.has_uncertain = true;
  }

  /* =========================================================
     BLOC 06 — REPAS
     ========================================================= */
  if (options.picnic) {
    budget.items.push({ label: 'Repas (pique-nique)', low: 5, mid: 8, high: 12, verified: false, source: 'Estimation courses' });
  } else if (options.restaurant) {
    budget.items.push({ label: 'Repas (restaurant)', low: 12, mid: 18, high: 30, verified: false, source: 'À vérifier selon restaurant' });
    budget.has_uncertain = true;
  } else {
    budget.items.push({ label: 'Repas', low: null, mid: null, high: null, verified: false, source: 'Non renseigné' });
  }

  /* =========================================================
     BLOC 07 — TOTAUX
     ========================================================= */
  budget.items.forEach(item => {
    if (item.low != null) budget.total_low += item.low;
    if (item.mid != null) budget.total_mid += item.mid;
    if (item.high != null) budget.total_high += item.high;
  });

  return budget;
}

/* =========================================================
   BLOC 08 — RENDU HTML BUDGET
   ========================================================= */
export function renderBudget(budget) {
  const rows = budget.items.map(item => {
    const low = item.low != null ? formatCurrency(item.low) : '—';
    const high = item.high != null ? formatCurrency(item.high) : '—';
    const range = (item.low != null && item.high != null && item.low !== item.high) ? `${low} – ${high}` : (item.low != null ? low : '<span class="verify-tag">à vérifier</span>');
    const note = item.note ? `<div style="font-size:11px;color:#aaa">${item.note}</div>` : '';
    const source = item.source ? `<div class="budget-verify">${item.source}</div>` : '';
    return `<div class="budget-row"><span class="budget-label">${item.label}${note}${source}</span><span class="budget-value">${range}</span></div>`;
  }).join('');

  const energyHtml = budget.energy ? renderTripEnergyCost(budget.energy) : '';
  const totalLow = budget.total_low > 0 ? formatCurrency(budget.total_low) : '—';
  const totalHigh = budget.total_high > 0 ? formatCurrency(budget.total_high) : '—';
  const totalDisplay = (budget.total_low > 0 || budget.total_high > 0)
    ? `${totalLow} – ${totalHigh}`
    : '<span class="verify-tag">à estimer</span>';

  return `
    <div class="budget-block">
      <h4>💶 Budget estimatif de la sortie</h4>
      ${energyHtml}
      ${rows}
      <div class="budget-row total">
        <span>TOTAL estimé</span>
        <span>${totalDisplay}</span>
      </div>
      ${budget.has_uncertain ? '<p class="info-disclaimer" style="margin-top:8px">⚠️ Certains postes sont à vérifier. Le total est indicatif.</p>' : ''}
    </div>`;
}
