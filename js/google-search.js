/* =========================================================
   BLOC 01 — LIENS GOOGLE PAR THÈME
   ========================================================= */
// Ce module génère uniquement des liens Google légaux — aucun scraping.

export function buildGoogleSearchLinks(site) {
  const name = site?.destination || site?.nom || '';
  const enc = encodeURIComponent(name);
  return [
    { label: `Avis ${name}`, url: `https://www.google.com/search?q=avis+${enc}` },
    { label: `Parking gratuit ${name}`, url: `https://www.google.com/search?q=parking+gratuit+${enc}` },
    { label: `Tarif entrée ${name}`, url: `https://www.google.com/search?q=tarif+entrée+${enc}` },
    { label: `Péage trajet ${name}`, url: `https://www.google.com/search?q=péage+trajet+${enc}+Nîmes` },
    { label: `Horaires ${name}`, url: `https://www.google.com/search?q=horaires+${enc}` },
    { label: `Que faire ${name}`, url: `https://www.google.com/search?q=que+faire+${enc}` },
    { label: `Restaurant près de ${name}`, url: `https://www.google.com/search?q=restaurant+${enc}` },
    { label: `Borne recharge ${name}`, url: `https://www.google.com/maps/search/borne+de+recharge+${enc}` }
  ];
}

/* =========================================================
   BLOC 02 — RECHERCHE ÉNERGIE ET TARIFS
   ========================================================= */
export const ENERGY_SEARCH_LINKS = [
  { label: '⛽ Prix carburant France', url: 'https://www.prix-carburants.gouv.fr/', category: 'carburant' },
  { label: '⚡ Prix kWh domicile', url: 'https://www.google.com/search?q=prix+kWh+electricite+domicile+France+2024', category: 'electricite' },
  { label: '⚡ Prix recharge borne publique', url: 'https://www.chargemap.com/', category: 'electricite' },
  { label: '🛣️ Tarifs péages A9 Nîmes', url: 'https://www.sanef.com/tarifs/', category: 'peage' },
  { label: '🅿️ Parkings Nîmes gratuits', url: 'https://www.google.com/search?q=parking+gratuit+Nimes', category: 'parking' },
  { label: '📊 Comparateur trajet élec/thermique', url: 'https://www.google.com/search?q=comparateur+cout+voiture+electrique+vs+thermique', category: 'comparaison' }
];

/* =========================================================
   BLOC 03 — HISTORIQUE RECHERCHES GOOGLE
   ========================================================= */
import { lsGet, lsSet } from './storage.js';
const HISTORY_KEY = 'google_search_history';

export function addGoogleSearchToHistory(query, url) {
  const history = lsGet(HISTORY_KEY) || [];
  const entry = { query, url, at: new Date().toISOString() };
  const updated = [entry, ...history.filter(h => h.query !== query)].slice(0, 20);
  lsSet(HISTORY_KEY, updated);
}

export function getGoogleSearchHistory() {
  return lsGet(HISTORY_KEY) || [];
}

/* =========================================================
   BLOC 04 — RENDU HTML LIENS GOOGLE
   ========================================================= */
export function renderGoogleSearchLinks(links) {
  return links.map(l =>
    `<a href="${l.url}" target="_blank" rel="noopener noreferrer" class="action-link"
        onclick="window.__trackGoogleSearch('${encodeURIComponent(l.label)}','${l.url}')">
      🔍 ${l.label}
    </a>`
  ).join('');
}
