/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { readPhotoGps, readPhotoDate, generateThumbnail, findNearestSite } from './photo-geolocation.js';
import { dbPut, dbGetAll, dbDelete, dbGet, STORES } from './storage.js';
import { generateId, showToast } from './utils.js';

/* =========================================================
   BLOC 02 — IMPORT PHOTO(S) DEPUIS INPUT FILE
   ========================================================= */
export async function importPhotos(files, sites, onProgress) {
  const imported = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(i + 1, files.length);
    try {
      const photo = await processPhotoFile(file, sites);
      await savePhotoLocally(photo); // TOUJOURS sauvegarder d'abord
      imported.push(photo);
    } catch(e) {
      console.error('[photos] erreur import', file.name, e);
      showToast(`Erreur import : ${file.name}`, 'error');
    }
  }
  return imported;
}

/* =========================================================
   BLOC 03 — TRAITEMENT D'UNE PHOTO
   ========================================================= */
async function processPhotoFile(file, sites) {
  const id = generateId('photo');
  const [gps, takenAt, thumbnail] = await Promise.all([
    readPhotoGps(file),
    readPhotoDate(file),
    generateThumbnail(file)
  ]);

  const nearestSite = gps ? findNearestSite(gps.lat, gps.lon, sites) : null;

  // Lecture fichier en ArrayBuffer pour stockage
  const buffer = await file.arrayBuffer();

  return {
    id,
    filename: file.name,
    size: file.size,
    mime_type: file.type,
    lat: gps?.lat || null,
    lon: gps?.lon || null,
    gps_source: gps?.source || null,
    site_id: nearestSite?.id || null,
    site_name: nearestSite?.destination || null,
    taken_at: takenAt,
    imported_at: new Date().toISOString(),
    thumbnail,
    data: buffer,           // données brutes — ne jamais perdre
    sync_status: 'pending', // pending | synced | error
    sync_error: null,
    nas_path: null
  };
}

/* =========================================================
   BLOC 04 — STOCKAGE LOCAL (TOUJOURS EN PREMIER)
   ========================================================= */
export async function savePhotoLocally(photo) {
  try {
    await dbPut(STORES.PHOTOS, photo);
    return true;
  } catch(e) {
    console.error('[photos] ERREUR CRITIQUE sauvegarde locale', e);
    showToast('Erreur sauvegarde locale — photo peut être perdue !', 'error');
    return false;
  }
}

/* =========================================================
   BLOC 05 — CHARGEMENT
   ========================================================= */
export async function loadAllPhotos() {
  return dbGetAll(STORES.PHOTOS);
}

export async function loadPhoto(id) {
  return dbGet(STORES.PHOTOS, id);
}

export async function loadPhotosBySite(siteId) {
  const all = await loadAllPhotos();
  return all.filter(p => p.site_id === siteId);
}

/* =========================================================
   BLOC 06 — SUPPRESSION
   ========================================================= */
export async function deletePhoto(id) {
  await dbDelete(STORES.PHOTOS, id);
}

/* =========================================================
   BLOC 07 — STATISTIQUES
   ========================================================= */
export async function getPhotoStats() {
  const photos = await loadAllPhotos();
  return {
    total: photos.length,
    pending: photos.filter(p => p.sync_status === 'pending').length,
    synced: photos.filter(p => p.sync_status === 'synced').length,
    error: photos.filter(p => p.sync_status === 'error').length,
    with_gps: photos.filter(p => p.lat && p.lon).length,
    total_size_mb: Math.round(photos.reduce((acc, p) => acc + (p.size || 0), 0) / 1024 / 1024 * 10) / 10
  };
}

/* =========================================================
   BLOC 08 — MISE À JOUR STATUT SYNC
   ========================================================= */
export async function updatePhotoSyncStatus(id, status, nasPath = null, error = null) {
  const photo = await loadPhoto(id);
  if (!photo) return;
  await savePhotoLocally({ ...photo, sync_status: status, nas_path: nasPath, sync_error: error });
}
