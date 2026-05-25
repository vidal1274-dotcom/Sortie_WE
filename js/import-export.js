/* =========================================================
   BLOC 01 — EXPORT
   ========================================================= */
import { dbGetAll, STORES } from './storage.js';
import { showToast } from './utils.js';

export async function exportAllData() {
  const [sites, corrections, vehicle] = await Promise.all([
    dbGetAll(STORES.SITES),
    dbGetAll(STORES.GPS_CORRECTIONS),
    dbGetAll(STORES.VEHICLE)
  ]);
  const data = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    sites: sites.length,
    gps_corrections: corrections,
    vehicle_profile: vehicle[0] || null
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sorties-nimes-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Données exportées', 'success');
}

/* =========================================================
   BLOC 02 — IMPORT
   ========================================================= */
export async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.gps_corrections) {
      for (const c of data.gps_corrections) {
        await dbPut(STORES.GPS_CORRECTIONS, c);
      }
    }
    showToast(`Import réussi : ${data.gps_corrections?.length || 0} corrections GPS`, 'success');
    return true;
  } catch(e) {
    showToast('Erreur import : fichier invalide', 'error');
    return false;
  }
}
