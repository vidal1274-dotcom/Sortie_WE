/* =========================================================
   BLOC 01 — CONFIGURATION POIDS
   ========================================================= */
import { haversineDistance } from './utils.js';
import { estimateTripEnergyCost } from './trip-energy-estimator.js';
import { UCHAUD_COORDS } from './config.js';

const ECO_WEIGHTS = {
  gratuit: 35,
  parking_gratuit: 8,
  sans_peage: 12,
  distance_proche: 15,   // < 30km
  retours_positifs: 10,
  budget_faible: 10,
  recharge_domicile: 5,
  pique_nique_possible: 5
};

/* =========================================================
   BLOC 02 — CALCUL SCORE ÉCONOMIQUE
   ========================================================= */
export function computeEcoScore(site, vehicleProfile) {
  let score = 0;
  const budget = (site.budget_indicatif || '').toLowerCase();
  const vigilance = (site.vigilance || '').toLowerCase();
  const notes = [];

  // Gratuité
  if (budget.includes('gratu') || budget.includes('libre') || site.gratuit) {
    score += ECO_WEIGHTS.gratuit;
    notes.push('Gratuit');
  } else if (budget.includes('faible') || budget.includes('peu') || budget.includes('< 5') || budget.includes('moins de 5')) {
    score += ECO_WEIGHTS.budget_faible;
    notes.push('Petit budget');
  }

  // Parking gratuit
  if (budget.includes('parking gratuit') || vigilance.includes('parking gratuit')) {
    score += ECO_WEIGHTS.parking_gratuit;
    notes.push('Parking gratuit');
  }

  // Sans péage
  if (vigilance.includes('sans péage') || vigilance.includes('sans peage') || site.sans_peage) {
    score += ECO_WEIGHTS.sans_peage;
    notes.push('Sans péage probable');
  }

  // Distance courte
  if (site.distance_km != null) {
    if (site.distance_km < 20) { score += ECO_WEIGHTS.distance_proche; notes.push('Très proche'); }
    else if (site.distance_km < 30) { score += Math.floor(ECO_WEIGHTS.distance_proche * 0.7); notes.push('Proche'); }
    else if (site.distance_km < 50) { score += Math.floor(ECO_WEIGHTS.distance_proche * 0.3); }
  }

  // Pique-nique / repas économique
  const allText = (site.programme_court || '') + ' ' + (site.points_forts || '');
  if (/pique.?nique|picnic|repas.?libre|panier/i.test(allText)) {
    score += ECO_WEIGHTS.pique_nique_possible;
    notes.push('Pique-nique possible');
  }

  // Retours visiteurs positifs (si disponibles)
  if (site.visitor_score && site.visitor_score >= 4) {
    score += ECO_WEIGHTS.retours_positifs;
    notes.push('Bons avis');
  }

  // Intégration coût énergie trajet
  let energyCostNote = null;
  if (vehicleProfile && site.distance_km) {
    const energy = estimateTripEnergyCost(site, site.distance_km, vehicleProfile);
    if (energy?.total_cost != null) {
      site._energy_cost = energy.total_cost;
      if (energy.total_cost < 5) { score += 10; energyCostNote = `Trajet < 5€`; }
      else if (energy.total_cost < 10) { score += 5; energyCostNote = `Trajet ~${energy.total_cost.toFixed(0)}€`; }
      else if (energy.total_cost > 25) { score -= 5; }
      if (vehicleProfile.vehicle_type === 'electric' && vehicleProfile.charge_mode === 'home' && energy.total_cost < 8) {
        score += ECO_WEIGHTS.recharge_domicile;
        energyCostNote = `⚡ Recharge domicile avantageuse`;
      }
    }
  }
  if (energyCostNote) notes.push(energyCostNote);

  return { score: Math.min(100, Math.max(0, score)), notes, badge: getEcoBadge(score) };
}

/* =========================================================
   BLOC 03 — BADGE ÉCONOMIQUE
   ========================================================= */
function getEcoBadge(score) {
  if (score >= 70) return { label: '🟢 Très économique', cls: 'badge-eco' };
  if (score >= 50) return { label: '💚 Bon plan', cls: 'badge-eco' };
  if (score >= 35) return { label: '🔵 Raisonnable', cls: 'badge-info' };
  if (score >= 20) return { label: '🟡 Budget moyen', cls: 'badge-warning' };
  return { label: '🔴 Coûteux', cls: 'badge-danger' };
}

/* =========================================================
   BLOC 04 — ENRICHISSEMENT LISTE SITES
   ========================================================= */
export function enrichSitesWithEcoScore(sites, vehicleProfile) {
  return sites.map(site => {
    const { score, notes, badge } = computeEcoScore(site, vehicleProfile);
    return { ...site, eco_score: score, eco_notes: notes, eco_badge: badge };
  });
}

/* =========================================================
   BLOC 05 — CLASSEMENT BONS PLANS
   ========================================================= */
export function getBestDeals(sites, limit = 20) {
  return [...sites]
    .filter(s => s.eco_score != null)
    .sort((a, b) => b.eco_score - a.eco_score)
    .slice(0, limit);
}

/* =========================================================
   BLOC 06 — FILTRES ÉCONOMIQUES TEXTUELS
   ========================================================= */
export function detectEconomyIntent(query) {
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return {
    wantsGratuit: /gratu|libre|gratuit/.test(q),
    wantsSansPeage: /sans.?peage|eviter.?peage|sans.?auto/.test(q),
    wantsProche: /proche|court|moins.?\d+.?km/.test(q),
    wantsBonPlan: /bon.?plan|pas.?cher|econom|budget|moins.?cher/.test(q),
    wantsElectric: /electrique|elec|kwh|recharge/.test(q),
    maxEurosMatch: q.match(/moins.?de.?(\d+).?euro/)?.[1],
    maxKmMatch: q.match(/moins.?de.?(\d+).?km/)?.[1],
    wantsBorne: /borne|charge|charging/.test(q),
    wantsSansRecharge: /sans.?recharge/.test(q)
  };
}
