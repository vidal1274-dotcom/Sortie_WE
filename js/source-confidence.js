/* =========================================================
   BLOC 01 — NIVEAUX DE FIABILITÉ
   ========================================================= */
export const CONFIDENCE_LEVELS = {
  HIGH: { score: 3, label: 'Fiable', cls: 'confidence-high', icon: '🟢' },
  MEDIUM: { score: 2, label: 'À vérifier', cls: 'confidence-med', icon: '🟡' },
  LOW: { score: 1, label: 'Incertain', cls: 'confidence-low', icon: '🔴' },
  UNKNOWN: { score: 0, label: 'Source inconnue', cls: 'confidence-low', icon: '⚪' }
};

/* =========================================================
   BLOC 02 — CALCUL SCORE PAR TYPE D'INFORMATION
   ========================================================= */
export function getConfidenceForInfo(infoType, site) {
  switch(infoType) {
    case 'gps':
      if (site.gps_corrected) return CONFIDENCE_LEVELS.MEDIUM;
      if (site.has_gps) return CONFIDENCE_LEVELS.MEDIUM;
      return CONFIDENCE_LEVELS.LOW;

    case 'budget':
      if (site.budget_min != null && site.budget_max != null) return CONFIDENCE_LEVELS.MEDIUM;
      if (site.budget_indicatif) return CONFIDENCE_LEVELS.MEDIUM;
      return CONFIDENCE_LEVELS.LOW;

    case 'gratuit':
      if ((site.budget_indicatif||'').toLowerCase().includes('gratu')) return CONFIDENCE_LEVELS.MEDIUM;
      return CONFIDENCE_LEVELS.LOW;

    case 'peage':
      if ((site.vigilance||'').toLowerCase().includes('sans péage')) return CONFIDENCE_LEVELS.MEDIUM;
      return CONFIDENCE_LEVELS.LOW;

    case 'parking':
      if ((site.budget_indicatif||'').toLowerCase().includes('parking gratuit')) return CONFIDENCE_LEVELS.MEDIUM;
      return CONFIDENCE_LEVELS.LOW;

    case 'energy_cost':
      return CONFIDENCE_LEVELS.LOW;

    case 'visitor_review':
      return CONFIDENCE_LEVELS.LOW;

    case 'horaires':
      return CONFIDENCE_LEVELS.LOW;

    default:
      return CONFIDENCE_LEVELS.UNKNOWN;
  }
}

/* =========================================================
   BLOC 03 — BADGE HTML
   ========================================================= */
export function renderConfidenceBadge(level) {
  return `<span class="confidence-badge ${level.cls}">${level.icon} ${level.label}</span>`;
}

/* =========================================================
   BLOC 04 — SCORE GLOBAL SITE
   ========================================================= */
export function computeDataQualityScore(site) {
  const checks = [
    { key: 'gps', weight: 30, pass: site.has_gps },
    { key: 'budget', weight: 25, pass: !!(site.budget_indicatif || site.budget_min != null) },
    { key: 'programme', weight: 20, pass: !!site.programme_court },
    { key: 'type', weight: 15, pass: !!site.type_sortie },
    { key: 'points_forts', weight: 10, pass: !!site.points_forts }
  ];
  let score = 0;
  checks.forEach(c => { if (c.pass) score += c.weight; });
  return { score, label: score >= 80 ? 'Données complètes' : score >= 50 ? 'Données partielles' : 'Données à compléter' };
}
