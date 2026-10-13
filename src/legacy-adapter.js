/* Bridge for the approved legacy UI's localStorage data model.
 * Import this module from the UI after its existing script has initialized.
 * IndexedDB becomes a durable mirror/outbox; localStorage remains a compatibility cache
 * until the UI has been migrated to await DB reads and writes directly.
 */
import {
  putProduct,
  recordTransaction,
  cancelTransaction,
  getAllRecords
} from './db.js';

const LEGACY_KEY = 'nongki_income_v1';
const MIGRATION_KEY = 'nongki_idb_migration_v1';
const DEVICE_KEY = 'nongki_device_id_v1';

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function parseLegacy() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
    if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.transactions)) return parsed;
  } catch {}
  return { products: [], transactions: [] };
}

function businessDate(date, time) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date || time || Date.now());
  return [parsed.getFullYear(), String(parsed.getMonth() + 1).padStart(2, '0'), String(parsed.getDate()).padStart(2, '0')].join('-');
}

/** One-time, non-destructive migration of existing browser data into IndexedDB. */
export async function migrateLegacyLocalData() {
  const legacy = parseLegacy();
  const existingTransactions = await getAllRecords('transactions');
  const existingProducts = await getAllRecords('products');
  const knownProducts = new Set(existingProducts.map(p => String(p.id)));
  const knownTransactions = new Map(existingTransactions.map(t => [String(t.legacyId || t.id), t]));

  for (const product of legacy.products) {
    if (!product?.id || !product?.name) continue;
    await putProduct({
      id: String(product.id),
      name: String(product.name),
      price: Number(product.price) || 0,
      category: String(product.category || 'Lainnya'),
      icon: String(product.icon || '🥤'),
      active: product.active !== false,
      legacyId: String(product.id)
    });
    knownProducts.add(String(product.id));
  }

  for (const old of legacy.transactions) {
    const legacyId = String(old?.id || '');
    if (!legacyId || knownTransactions.has(legacyId)) continue;
    const productId = String(old.productId || 'legacy-unknown');
    const productName = String(old.name || 'Produk lama');
    const quantity = Math.max(1, Math.floor(Number(old.qty) || 1));
    const unitPrice = Math.max(0, Number(old.unitPrice ?? old.total) || 0);
    const wasCanceled = old.status === 'cancelled' || old.status === 'canceled';
    const createdAt = old.date && old.time
      ? new Date(old.date + 'T' + old.time).toISOString()
      : new Date().toISOString();
    const transaction = {
      id: crypto.randomUUID(),
      legacyId,
      createdAt,
      businessDate: businessDate(old.date, old.time),
      userId: String(old.userId || 'legacy-import'),
      deviceId: deviceId(),
      status: wasCanceled ? 'canceled' : 'active',
      canceledAt: old.cancelledAt || null,
      canceledBy: old.cancelledBy || null,
      cancelReason: wasCanceled ? 'Transaksi batal dari data lokal lama' : null,
      items: [{
        productId,
        productName,
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice
      }],
      total: Number(old.total) >= 0 ? Number(old.total) : quantity * unitPrice
    };
    // Imported history is local-only during migration. Do not enqueue it as a new sale;
    // historical upload must be an explicit, separately reviewed backend operation.
    await putImportedTransaction(transaction);
    knownTransactions.set(legacyId, transaction);
  }

  localStorage.setItem(MIGRATION_KEY, JSON.stringify({
    completedAt: new Date().toISOString(),
    products: knownProducts.size,
    transactions: knownTransactions.size
  }));
  return { products: knownProducts.size, transactions: knownTransactions.size };
}

async function putImportedTransaction(transaction) {
  const db = await (await import('./db.js')).openNongkiDB();
  try {
    const tx = db.transaction('transactions', 'readwrite');
    const done = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Penyimpanan migrasi gagal.'));
      tx.onabort = () => reject(tx.error || new Error('Migrasi dibatalkan.'));
    });
    tx.objectStore('transactions').put(transaction);
    await done;
  } finally {
    db.close();
  }
}

/** Call after a successful legacy UI save; mirrors new records and cancellation events. */
export async function mirrorLegacySnapshot(previousSnapshot = null) {
  const current = parseLegacy();
  const previous = previousSnapshot || { products: [], transactions: [] };
  const previousTx = new Map((previous.transactions || []).map(t => [String(t.id), t]));
  const indexed = await getAllRecords('transactions');
  const indexedLegacyIds = new Set(indexed.map(t => String(t.legacyId || t.id)));

  for (const product of current.products) {
    if (!product?.id || !product?.name) continue;
    await putProduct({
      id: String(product.id), name: String(product.name),
      price: Number(product.price) || 0, category: String(product.category || 'Lainnya'),
      icon: String(product.icon || '🥤'), active: product.active !== false,
      legacyId: String(product.id)
    });
  }

  for (const old of current.transactions) {
    const id = String(old?.id || '');
    if (!id) continue;
    const before = previousTx.get(id);
    if (!before && !indexedLegacyIds.has(id)) {
      const qty = Math.max(1, Math.floor(Number(old.qty) || 1));
      const unitPrice = Math.max(0, Number(old.unitPrice ?? old.total) || 0);
      const created = await recordTransaction({
        userId: String(old.userId || 'unknown'),
        deviceId: deviceId(),
        items: [{ productId: String(old.productId || 'legacy-unknown'), productName: String(old.name || 'Produk lama'), quantity: qty, unitPrice }]
      });
      created.legacyId = id;
      created.businessDate = businessDate(old.date, old.time);
      await putImportedTransaction(created);
      indexedLegacyIds.add(id);
    } else if (before && before.status !== 'cancelled' && old.status === 'cancelled') {
      const match = indexed.find(t => String(t.legacyId || t.id) === id);
      if (match) await cancelTransaction(match.id, { userId: String(old.cancelledBy || old.userId || 'unknown'), reason: 'Pembatalan dari UI Nongki' });
    }
  }
  return current;
}

export function getLegacyDeviceId() {
  return deviceId();
}
