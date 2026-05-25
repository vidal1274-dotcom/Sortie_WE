/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { buildInsightSummary } from './external-insights.js';
import { getConfidenceForInfo, computeDataQualityScore } from './source-confidence.js';
import { haversineDistance, formatDistance } from './utils.js';
import { UCHAUD_COORDS } from './config.js';

/* =========================================================
   BLOC 02 — ENRICHISSEMENT COMPLET SITE
   ========================================================= */
export function enrichSiteInfo(site) {
  const summary = buildInsightSummary(site);
  const dataQuality = computeDataQualityScore(site);

  // Détection automatique informations clés
  const budget = (site.budget_indicatif || '').toLowerCase();
  const vigilance = (site.vigilance || '').toLowerCase();
  const prog = (site.programme_court || '');

  const enriched = {
    ...site,
    _gratuit: budget.includes('gratu') || budget.includes('libre'),
    _parking_gratuit: budget.includes('parking gratuit') || vigilance.includes('parking gratuit'),
    _sans_peage: vigilance.includes('sans péage') || vigilance.includes('sans peage'),
    _peage_probable: vigilance.includes('péage') && !vigilance.includes('sans péage'),
    _reservation: vigilance.includes('réservation'),
    _foule_possible: vigilance.includes('foule') || vigilance.includes('monde') || vigilance.includes('fréquenté'),
    _pique_nique: /pique.?nique|picnic/i.test(prog),
    _famille: /famille|enfant/i.test(site.points_forts || prog),
    _photo: /photo|panorama|vue|paysage/i.test(site.points_forts || prog),
    _summary: summary,
    _data_quality: dataQuality,
    _confidence: {
      gps: getConfidenceForInfo('gps', site),
      budget: getConfidenceForInfo('budget', site),
      peage: getConfidenceForInfo('peage', site)
    }
  };

  return enriched;
}

/* =========================================================
   BLOC 03 — INFORMATIONS "TOUT CE QU'IL Y A À FAIRE"
   ========================================================= */
export function buildWhatToDoList(site) {
  const items = [];
  if (site.programme_court) {
    items.push({ category: 'Programme', content: site.programme_court, verified: false });
  }
  if (site.points_forts) {
    items.push({ category: 'Points forts', content: site.points_forts, verified: false });
  }
  if (site.niveau_marche) {
    items.push({ category: 'Niveau de marche', content: site.niveau_marche, verified: false });
  }
  if (site.vigilance) {
    items.push({ category: 'À savoir avant', content: site.vigilance, verified: false });
  }
  return items;
}

/* =========================================================
   BLOC 04 — DURÉE DE VISITE ESTIMÉE
   ========================================================= */
export function estimateVisitDuration(site) {
  const prog = (site.programme_court || '').toLowerCase();
  if (/demi.?journée/.test(prog)) return 'Demi-journée (3-4h)';
  if (/journée|toute la/.test(prog)) return 'Journée complète (6-8h)';
  if (/2h|deux heures|2 heures/.test(prog)) return '2 heures environ';
  if (/rando/.test(prog)) return 'Randonnée (variable)';
  return 'Durée à estimer sur place';
}
