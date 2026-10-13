/* Nongki PWA outbox synchronizer.
 * Backend contract: POST JSON { eventId, eventType, entityId, payload }.
 * Server must be idempotent by eventId and return JSON { ok: true, accepted: true|false, duplicate?: true }.
 * No credentials or API keys belong in this public client module.
 */
import { getPendingOutbox, removeOutboxEvent, markOutboxAttempt } from './db.js';

let isSyncing = false;

export async function syncPendingEvents({ endpoint, fetchImpl = fetch, onStatus = () => {} } = {}) {
  if (!endpoint) throw new Error('Alamat backend belum dikonfigurasi.');
  if (!navigator.onLine) return { state: 'offline', sent: 0, pending: (await getPendingOutbox()).length };
  if (isSyncing) return { state: 'busy', sent: 0, pending: (await getPendingOutbox()).length };

  isSyncing = true;
  let sent = 0;
  try {
    const events = await getPendingOutbox();
    for (const event of events) {
      if (!navigator.onLine) break;
      onStatus({ state: 'syncing', eventId: event.id, remaining: events.length - sent });
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: event.id,
            eventType: event.eventType,
            entityId: event.entityId,
            payload: event.payload
          })
        });
        if (!response.ok) throw new Error('Server merespons HTTP ' + response.status);
        const result = await response.json();
        if (result?.ok !== true || (result.accepted !== true && result.duplicate !== true)) {
          throw new Error('Respons backend belum mengonfirmasi event tersimpan.');
        }
        await removeOutboxEvent(event.id);
        sent += 1;
      } catch (error) {
        await markOutboxAttempt(event.id, error?.message || 'Sinkronisasi gagal');
        onStatus({ state: 'error', eventId: event.id, message: error?.message || 'Sinkronisasi gagal' });
        // Preserve order and retry later. Never delete an event without server confirmation.
        break;
      }
    }
    const pending = (await getPendingOutbox()).length;
    const state = pending === 0 ? 'synced' : (navigator.onLine ? 'pending' : 'offline');
    onStatus({ state, sent, pending });
    return { state, sent, pending };
  } finally {
    isSyncing = false;
  }
}

export function installSyncTriggers(options) {
  const trigger = () => syncPendingEvents(options).catch(error => {
    options?.onStatus?.({ state: 'error', message: error?.message || 'Sinkronisasi gagal' });
  });
  window.addEventListener('online', trigger);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') trigger();
  });
  return () => window.removeEventListener('online', trigger);
}
