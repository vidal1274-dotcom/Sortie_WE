/* =========================================================
   BLOC 01 — ÉTAT RÉSEAU
   ========================================================= */
import { NETWORK_THRESHOLDS } from './config.js';

let _currentStatus = 'unknown';
const _listeners = [];

export function onNetworkChange(fn) { _listeners.push(fn); }
function _emit(status) { _currentStatus = status; _listeners.forEach(fn => { try { fn(status); } catch(e) {} }); }

/* =========================================================
   BLOC 02 — DÉTECTION INITIALE
   ========================================================= */
export function initNetworkManager() {
  _detectAndEmit();
  window.addEventListener('online', _detectAndEmit);
  window.addEventListener('offline', () => _emit('offline'));
  // Polling toutes les 30s pour détecter dégradation
  setInterval(_detectAndEmit, 30000);
}

async function _detectAndEmit() {
  if (!navigator.onLine) { _emit('offline'); return; }
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    const ect = conn.effectiveType; // 'slow-2g' | '2g' | '3g' | '4g'
    if (ect === 'slow-2g' || ect === '2g') { _emit('weak_2g'); return; }
    if (ect === '3g') { _emit('medium_3g'); return; }
    if (ect === '4g') {
      // Test latence pour distinguer 4G / 5G / WiFi
      const latency = await _measureLatency();
      _emit(latency < 50 ? 'wifi_5g' : 'good_4g');
      return;
    }
  }
  // Fallback : test latence
  const latency = await _measureLatency();
  if (latency === null) { _emit('offline'); return; }
  if (latency < 50) _emit('wifi_5g');
  else if (latency < 150) _emit('good_4g');
  else if (latency < 400) _emit('medium_3g');
  else _emit('weak_2g');
}

async function _measureLatency() {
  try {
    const start = Date.now();
    await fetch('https://www.google.com/favicon.ico?_=' + Date.now(), { mode: 'no-cors', cache: 'no-store' });
    return Date.now() - start;
  } catch(e) { return null; }
}

/* =========================================================
   BLOC 03 — GETTERS
   ========================================================= */
export function getNetworkStatus() { return _currentStatus; }
export function isOnline() { return _currentStatus !== 'offline'; }
export function isGoodNetwork() { return ['wifi_5g', 'good_4g'].includes(_currentStatus); }
export function isWeakNetwork() { return ['weak_2g', 'medium_3g'].includes(_currentStatus); }
