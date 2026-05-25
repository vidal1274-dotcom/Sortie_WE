/* =========================================================
   BLOC 01 — FILTRES PRINCIPAUX
   ========================================================= */
import { normalizeSearchText } from './utils.js';

const FILTER_FUNCTIONS = {
  all: () => true,
  gratuit: site => {
    const b = (site.budget_indicatif || '').toLowerCase();
    return b.includes('gratu') || b.includes('libre') || site.gratuit === true;
  },
  sans_peage: site => {
    const v = (site.vigilance || '').toLowerCase();
    return v.includes('sans péage') || v.includes('sans peage') || site.sans_peage === true;
  },
  proche: site => site.distance_km != null && site.distance_km <= 30,
  nature: site => /nature|rando|gorge|canyon|rivière|montagne|garrigue|forêt/i.test(site.type_sortie || site.secteur || ''),
  patrimoine: site => /patrimoine|château|musée|abbaye|ville|village|historique/i.test(site.type_sortie || site.secteur || ''),
  famille: site => /famille|enfant|kid/i.test(site.programme_court || site.points_forts || ''),
  balade: site => /balade|promenade|vélo|cyclisme/i.test(site.type_sortie || ''),
  marche: site => /marché|brocante|artisan/i.test(site.type_sortie || site.destination || ''),
  photo: site => /photo|panorama|paysage|beau|vue/i.test(site.points_forts || site.programme_court || ''),
  recharge: site => /recharge|électrique|borne/i.test(site.vigilance || site.programme_court || '')
};

export function applyFilter(sites, filterKey) {
  const fn = FILTER_FUNCTIONS[filterKey] || FILTER_FUNCTIONS.all;
  return sites.filter(fn);
}

/* =========================================================
   BLOC 02 — FILTRE TEXTE
   ========================================================= */
export function applyTextFilter(sites, query) {
  if (!query || query.trim().length < 2) return sites;
  const q = normalizeSearchText(query);
  return sites.filter(site => {
    const fields = [
      site.destination, site.secteur, site.type_sortie,
      site.programme_court, site.points_forts, site.vigilance,
      site.budget_indicatif, site.niveau_marche
    ].filter(Boolean).join(' ');
    return normalizeSearchText(fields).includes(q);
  });
}

/* =========================================================
   BLOC 03 — FILTRES ÉCONOMIQUES AVANCÉS
   ========================================================= */
export function applyEconomyFilters(sites, opts = {}) {
  let result = [...sites];
  if (opts.maxEuros) {
    const max = parseFloat(opts.maxEuros);
    result = result.filter(s => !s.budget_min || s.budget_min <= max);
  }
  if (opts.maxKm) {
    const max = parseFloat(opts.maxKm);
    result = result.filter(s => s.distance_km == null || s.distance_km <= max);
  }
  if (opts.onlyGratuit) {
    result = result.filter(FILTER_FUNCTIONS.gratuit);
  }
  if (opts.onlySansPeage) {
    result = result.filter(FILTER_FUNCTIONS.sans_peage);
  }
  if (opts.maxEnergyCost != null && opts.vehicleProfile) {
    // filtré par le moteur économie
  }
  return result;
}

/* =========================================================
   BLOC 04 — TRI
   ========================================================= */
export function sortSites(sites, sortBy = 'distance') {
  const copy = [...sites];
  if (sortBy === 'distance') return copy.sort((a,b) => (a.distance_km||9999) - (b.distance_km||9999));
  if (sortBy === 'eco_score') return copy.sort((a,b) => (b.eco_score||0) - (a.eco_score||0));
  if (sortBy === 'budget') return copy.sort((a,b) => (a.budget_min||999) - (b.budget_min||999));
  if (sortBy === 'priorite') return copy.sort((a,b) => (a.priorite||9) - (b.priorite||9));
  return copy;
}

/* =========================================================
   BLOC 05 — INITIALISATION DES CHIPS UI
   ========================================================= */
export function initFilterChips(onFilterChange) {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      onFilterChange(chip.dataset.filter || 'all');
    });
  });
}
