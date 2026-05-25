/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { loadAllPhotos, updatePhotoSyncStatus } from './photos.js';
import { getPendingQueue, enqueuePhotoSync, markQueueItemDone, markQueueItemError, getQueueStats } from './sync-queue.js';
import { uploadPhotoToNas, checkNasHealth } from './nas-api-client.js';
import { showToast } from './utils.js';
import { loadPhoto } from './photos.js';

let _syncRunning = false;

/* =========================================================
   BLOC 02 — LANCER SYNCHRONISATION
   ========================================================= */
export async function syncPendingPhotos(onProgress) {
  if (_syncRunning) return { skipped: true, reason: 'Sync déjà en cours' };
  _syncRunning = true;

  const health = await checkNasHealth();
  if (!health.ok) {
    _syncRunning = false;
    return { ok: false, reason: `NAS inaccessible : ${health.reason}` };
  }

  const queue = await getPendingQueue();
  if (queue.length === 0) { _syncRunning = false; return { ok: true, synced: 0, message: 'Rien à synchroniser' }; }

  let synced = 0, errors = 0;

  for (const item of queue) {
    if (onProgress) onProgress({ current: synced + errors + 1, total: queue.length, filename: item.filename });

    const photo = await loadPhoto(item.photo_id);
    if (!photo) { await markQueueItemError(item.id, 'Photo introuvable en IndexedDB'); errors++; continue; }

    const result = await uploadPhotoToNas(photo);
    if (result.ok) {
      await updatePhotoSyncStatus(photo.id, 'synced', result.nas_path);
      await markQueueItemDone(item.id);
      synced++;
    } else {
      await updatePhotoSyncStatus(photo.id, 'error', null, result.reason);
      await markQueueItemError(item.id, result.reason);
      errors++;
    }
  }

  _syncRunning = false;
  return { ok: true, synced, errors, total: queue.length };
}

/* =========================================================
   BLOC 03 — ENREGISTREMENT POUR SYNC FUTUR
   ========================================================= */
export async function schedulePhotoForSync(photo) {
  await enqueuePhotoSync(photo);
}

/* =========================================================
   BLOC 04 — STATUT SYNC GLOBAL
   ========================================================= */
export async function getSyncStatus() {
  const stats = await getQueueStats();
  const photos = await loadAllPhotos();
  return {
    ...stats,
    total_photos: photos.length,
    synced_photos: photos.filter(p => p.sync_status === 'synced').length
  };
}

/* =========================================================
   BLOC 05 — SYNC AUTO SUR CONNEXION
   ========================================================= */
export function setupAutoSync(getNetworkStatus) {
  window.addEventListener('online', async () => {
    const ns = getNetworkStatus ? getNetworkStatus() : 'unknown';
    if (ns === 'offline') return;
    const stats = await getQueueStats();
    if (stats.pending > 0) {
      showToast(`📶 Réseau rétabli — synchronisation de ${stats.pending} photo(s)...`, 'info');
      await syncPendingPhotos();
    }
  });
}
