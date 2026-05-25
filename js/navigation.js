/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { buildWazeLink, buildGoogleMapsLink, buildAppleMapsLink } from './utils.js';

/* =========================================================
   BLOC 02 — OUVRIR GPS
   ========================================================= */
export function openWaze(lat, lon, name) {
  const url = buildWazeLink(lat, lon, name);
  if (url) window.open(url, '_blank');
}
export function openGoogleMaps(lat, lon, name) {
  const url = buildGoogleMapsLink(lat, lon, name);
  if (url) window.open(url, '_blank');
}
export function openAppleMaps(lat, lon, name) {
  const url = buildAppleMapsLink(lat, lon, name);
  if (url) window.open(url, '_blank');
}

/* =========================================================
   BLOC 03 — NAVIGATION VERS DESTINATION
   ========================================================= */
export function navigateTo(site) {
  if (!site?.has_gps) return;
  // Détecte iOS pour Apple Maps
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) openAppleMaps(site.lat, site.lon, site.destination);
  else openGoogleMaps(site.lat, site.lon, site.destination);
}

/* =========================================================
   BLOC 04 — RECHERCHE BORNE RECHARGE
   ========================================================= */
export function searchChargingStations(lat, lon) {
  const url = `https://www.google.com/maps/search/borne+recharge+electrique/@${lat},${lon},13z`;
  window.open(url, '_blank');
}
