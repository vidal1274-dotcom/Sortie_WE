/* =========================================================
   BLOC 01 — IMPORTS
   ========================================================= */
import { dbPut, dbGetAll, dbDelete, dbGetByIndex, STORES } from './storage.js';
import { generateId } from './utils.js';

/* =========================================================
   BLOC 02 — AJOUTER À LA FILE
   ========================================================= */
export async function enqueuePhotoSync(photo) {
  const item = {
    id: generateId('sync'),
    photo_id: photo.id,
    filename: photo.filename,
    status: 'pending',    // pending | in_progress | done | error
    attempts: 0,
    max_attempts: 5,
    created_at: new Date().toISOString(),
    last_attempt_at: null,
    error: null
  };
  await dbPut(STORES.SYNC_QUEUE, item);
  return item;
}

/* =========================================================
   BLOC 03 — CHARGER FILE EN ATTENTE
   ========================================================= */
export async function getPendingQueue() {
  const all = await dbGetAll(STORES.SYNC_QUEUE);
  return all.filter(i => i.status === 'pending' || i.status === 'error' && i.attempts < i.max_attempts);
}

/* =========================================================
   BLOC 04 — MISE À JOUR STATUT
   ========================================================= */
export async function updateQueueItem(id, updates) {
  const all = await dbGetAll(STORES.SYNC_QUEUE);
  const item = all.find(i => i.id === id);
  if (!item) return;
  await dbPut(STORES.SYNC_QUEUE, { ...item, ...updates });
}

export async function markQueueItemDone(id) {
  await updateQueueItem(id, { status: 'done', last_attempt_at: new Date().toISOString() });
  await dbDelete(STORES.SYNC_QUEUE, id);
}

export async function markQueueItemError(id, error) {
  const all = await dbGetAll(STORES.SYNC_QUEUE);
  const item = all.find(i => i.id === id);
  if (!item) return;
  const attempts = (item.attempts || 0) + 1;
  await dbPut(STORES.SYNC_QUEUE, {
    ...item, status: attempts >= item.max_attempts ? 'error' : 'pending',
    attempts, error: String(error), last_attempt_at: new Date().toISOString()
  });
}

/* =========================================================
   BLOC 05 — STATISTIQUES FILE
   ========================================================= */
export async function getQueueStats() {
  const all = await dbGetAll(STORES.SYNC_QUEUE);
  return {
    total: all.length,
    pending: all.filter(i => i.status === 'pending').length,
    error: all.filter(i => i.status === 'error').length,
    in_progress: all.filter(i => i.status === 'in_progress').length
  };
}
