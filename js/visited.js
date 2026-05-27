/* =========================================================
   BLOC 01 — SITES DÉJÀ VISITÉS
   ========================================================= */
import { lsGet, lsSet } from './storage.js';

const LS_KEY = 'visited_sites';

function _load() {
  return new Set(lsGet(LS_KEY, []));
}

function _save(set) {
  lsSet(LS_KEY, [...set]);
}

export function getVisitedIds() {
  return _load();
}

export function isVisited(siteId) {
  return _load().has(siteId);
}

export function markVisited(siteId) {
  const set = _load();
  set.add(siteId);
  _save(set);
}

export function unmarkVisited(siteId) {
  const set = _load();
  set.delete(siteId);
  _save(set);
}

export function toggleVisited(siteId) {
  const set = _load();
  if (set.has(siteId)) { set.delete(siteId); _save(set); return false; }
  set.add(siteId); _save(set); return true;
}

export function filterUnvisited(sites) {
  const visited = _load();
  return sites.filter(s => !visited.has(s.id));
}
